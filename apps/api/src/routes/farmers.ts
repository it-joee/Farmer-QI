import { Hono } from "hono";
import { CreateFarmerRequest, UpdateFarmerRequest, createFarmerReferenceId } from "@farmeriq/shared";
import { SKIP_AUTH } from "../config.js";
import { requireActor, type Actor } from "../lib/actor.js";
import { canRegisterFarmers, farmerScopeClause } from "../lib/access.js";
import { checkFarmerConflicts, listFarmerConflicts } from "../lib/conflicts.js";
import { recordSubmission } from "../lib/submissions.js";
import { query } from "../db.js";
import { createCropCycleHandler, listCropCyclesHandler } from "./crop-cycles.js";
import { createPlotHandler, listPlotsHandler, updatePlotHandler } from "./plots.js";

export const farmerRoutes = new Hono();

async function assertFarmerInScope(farmerId: string, actor: Actor) {
  const scope = farmerScopeClause(actor, "f", 2);
  const result = await query(
    `SELECT f.id FROM farmers f WHERE f.id = $1 AND ${scope.sql}`,
    [farmerId, ...scope.params]
  );
  return (result.rowCount ?? 0) > 0;
}

farmerRoutes.get("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const scope = farmerScopeClause(actorResult, "f", 1);
  const result = await query(
    `SELECT * FROM farmers f WHERE ${scope.sql} ORDER BY f.created_at DESC`,
    scope.params
  );

  return c.json({ farmers: result.rows });
});

farmerRoutes.post("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canRegisterFarmers(actor)) {
    return c.json({ error: "Only field agents can register farmers" }, 403);
  }

  const body = await c.req.json();
  const parsed = CreateFarmerRequest.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const { captured_at, device_id, client_local_id, ...farmerFields } = data;
  const createdBy = SKIP_AUTH ? actor.id : (body as { created_by?: string }).created_by;

  if (!createdBy) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const clientLocalId = client_local_id?.trim() || null;

  if (clientLocalId) {
    const existingByClientId = await query(
      `SELECT * FROM farmers WHERE created_by = $1 AND metadata->>'client_local_id' = $2`,
      [createdBy, clientLocalId]
    );
    if (existingByClientId.rows[0]) {
      const farmer = existingByClientId.rows[0];
      const conflicts = await listFarmerConflicts(farmer.id);
      return c.json({ farmer, conflicts }, 200);
    }
  }

  if (device_id?.trim() && captured_at) {
    const existingBySubmission = await query(
      `SELECT f.* FROM submission_records sr
       JOIN farmers f ON f.id = sr.entity_id
       WHERE sr.entity_type = 'farmer'
         AND sr.agent_id = $1
         AND sr.device_id = $2
         AND sr.captured_at = $3`,
      [createdBy, device_id.trim(), captured_at]
    );
    if (existingBySubmission.rows[0]) {
      const farmer = existingBySubmission.rows[0];
      const conflicts = await listFarmerConflicts(farmer.id);
      return c.json({ farmer, conflicts }, 200);
    }
  }

  const userResult = await query<{ office_id: string | null }>(
    "SELECT office_id FROM users WHERE id = $1",
    [createdBy]
  );
  const officeId = userResult.rows[0]?.office_id ?? actor.office_id ?? null;

  const referenceId = createFarmerReferenceId();
  const metadata = clientLocalId ? JSON.stringify({ client_local_id: clientLocalId }) : "{}";

  const result = await query(
    `INSERT INTO farmers (
      reference_id, full_name, community, ghana_card, gender, date_of_birth, age, phone, email,
      region, district, digital_address, farm_address,
      household_size, farming_dependency, years_farming, primary_crops,
      bank_name, bank_branch, bank_account, created_by, office_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb)
    RETURNING *`,
    [
      referenceId,
      farmerFields.full_name,
      farmerFields.community,
      farmerFields.ghana_card ?? null,
      farmerFields.gender ?? null,
      farmerFields.date_of_birth || null,
      farmerFields.age ?? null,
      farmerFields.phone ?? null,
      farmerFields.email || null,
      farmerFields.region ?? null,
      farmerFields.district ?? null,
      farmerFields.digital_address ?? null,
      farmerFields.farm_address ?? null,
      farmerFields.household_size ?? null,
      farmerFields.farming_dependency ?? null,
      farmerFields.years_farming ?? null,
      farmerFields.primary_crops ?? [],
      farmerFields.bank_name ?? null,
      farmerFields.bank_branch ?? null,
      farmerFields.bank_account ?? null,
      createdBy,
      officeId,
      metadata,
    ]
  );

  const farmer = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'create', 'farmer', $2, $3)`,
    [createdBy, farmer.id, JSON.stringify(farmer)]
  );

  await recordSubmission({
    entityType: "farmer",
    entityId: farmer.id,
    agentId: createdBy,
    capturedAt: captured_at ?? new Date().toISOString(),
    deviceId: device_id,
  });

  const conflicts = await checkFarmerConflicts(farmer.id, {
    full_name: farmerFields.full_name,
    community: farmerFields.community,
    ghana_card: farmerFields.ghana_card,
    phone: farmerFields.phone,
  });

  return c.json({ farmer, conflicts }, 201);
});

farmerRoutes.post("/:id/plots", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  if (!(await assertFarmerInScope(c.req.param("id"), actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const createdBy = SKIP_AUTH ? actorResult.id : (body as { created_by?: string }).created_by;
  const result = await createPlotHandler(c.req.param("id"), body, createdBy);
  return c.json(result.body, result.status);
});

farmerRoutes.get("/:id/plots", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  if (!(await assertFarmerInScope(c.req.param("id"), actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const result = await listPlotsHandler(c.req.param("id"));
  return c.json(result.body, result.status);
});

farmerRoutes.put("/:id/plots/:plotId", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  if (!(await assertFarmerInScope(c.req.param("id"), actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const createdBy = SKIP_AUTH ? actorResult.id : (body as { created_by?: string }).created_by;
  const result = await updatePlotHandler(c.req.param("id"), c.req.param("plotId"), body, createdBy);
  return c.json(result.body, result.status);
});

farmerRoutes.get("/:id/crop-cycles", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  if (!(await assertFarmerInScope(c.req.param("id"), actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const result = await listCropCyclesHandler(c.req.param("id"));
  return c.json(result.body, result.status);
});

farmerRoutes.post("/:id/crop-cycles", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  if (!(await assertFarmerInScope(c.req.param("id"), actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const createdBy = SKIP_AUTH ? actorResult.id : (body as { created_by?: string }).created_by;
  const result = await createCropCycleHandler(c.req.param("id"), body, createdBy);
  return c.json(result.body, result.status);
});

farmerRoutes.get("/:id/conflicts", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const farmerId = c.req.param("id");
  if (!(await assertFarmerInScope(farmerId, actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const conflicts = await listFarmerConflicts(farmerId);
  return c.json({ conflicts });
});

farmerRoutes.put("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const farmerId = c.req.param("id");
  if (!(await assertFarmerInScope(farmerId, actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const parsed = UpdateFarmerRequest.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const actorId = SKIP_AUTH ? actorResult.id : (body as { updated_by?: string }).updated_by;

  if (!actorId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const result = await query(
    `UPDATE farmers SET
      full_name = $1,
      community = $2,
      ghana_card = $3,
      gender = $4,
      date_of_birth = $5,
      age = $6,
      phone = $7,
      email = $8,
      region = $9,
      district = $10,
      digital_address = $11,
      farm_address = $12,
      household_size = $13,
      farming_dependency = $14,
      years_farming = $15,
      primary_crops = $16,
      bank_name = $17,
      bank_branch = $18,
      bank_account = $19,
      updated_at = now()
    WHERE id = $20
    RETURNING *`,
    [
      data.full_name,
      data.community,
      data.ghana_card ?? null,
      data.gender ?? null,
      data.date_of_birth || null,
      data.age ?? null,
      data.phone ?? null,
      data.email || null,
      data.region ?? null,
      data.district ?? null,
      data.digital_address ?? null,
      data.farm_address ?? null,
      data.household_size ?? null,
      data.farming_dependency ?? null,
      data.years_farming ?? null,
      data.primary_crops ?? [],
      data.bank_name ?? null,
      data.bank_branch ?? null,
      data.bank_account ?? null,
      farmerId,
    ]
  );

  const farmer = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'update', 'farmer', $2, $3)`,
    [actorId, farmer.id, JSON.stringify(farmer)]
  );

  const conflicts = await checkFarmerConflicts(farmer.id, {
    full_name: data.full_name,
    community: data.community,
    ghana_card: data.ghana_card,
    phone: data.phone,
  });

  return c.json({ farmer, conflicts });
});

farmerRoutes.get("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const farmerId = c.req.param("id");
  const scope = farmerScopeClause(actorResult, "f", 2);
  const result = await query(`SELECT * FROM farmers f WHERE f.id = $1 AND ${scope.sql}`, [
    farmerId,
    ...scope.params,
  ]);

  if (result.rowCount === 0) {
    return c.json({ error: "Farmer not found" }, 404);
  }

  return c.json({ farmer: result.rows[0] });
});

farmerRoutes.delete("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const farmerId = c.req.param("id");
  if (!(await assertFarmerInScope(farmerId, actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const actorId = SKIP_AUTH ? actorResult.id : (body as { deleted_by?: string }).deleted_by;

  if (!actorId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const existing = await query("SELECT * FROM farmers WHERE id = $1", [farmerId]);
  if (existing.rowCount === 0) {
    return c.json({ error: "Farmer not found" }, 404);
  }

  const farmer = existing.rows[0];
  const reason = (body as { reason?: string }).reason ?? "Removed by agent";

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, reason)
     VALUES ($1, 'delete', 'farmer', $2, $3, $4)`,
    [actorId, farmerId, JSON.stringify(farmer), reason]
  );

  await query("DELETE FROM farmers WHERE id = $1", [farmerId]);

  return c.json({ ok: true });
});
