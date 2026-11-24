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
    `SELECT f.id FROM farmers f WHERE f.id = $1 AND f.deleted_at IS NULL AND ${scope.sql}`,
    [farmerId, ...scope.params]
  );
  return (result.rowCount ?? 0) > 0;
}

farmerRoutes.get("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const page = parseInt(c.req.query("page") ?? "1", 10) || 1;
  const limit = parseInt(c.req.query("limit") ?? "20", 10) || 20;
  const search = c.req.query("search")?.trim() ?? "";
  const commodity = c.req.query("commodity")?.trim() ?? "";
  const region = c.req.query("region")?.trim() ?? "";
  const district = c.req.query("district")?.trim() ?? "";
  const gender = c.req.query("gender")?.trim() ?? "";

  const offset = (page - 1) * limit;

  const scope = farmerScopeClause(actorResult, "f", 1);
  
  let filterSql = "";
  const params = [...scope.params];
  let paramIndex = params.length + 1;

  if (search) {
    filterSql += ` AND (
      f.full_name ILIKE $${paramIndex} OR
      f.community ILIKE $${paramIndex} OR
      f.district ILIKE $${paramIndex} OR
      f.phone ILIKE $${paramIndex} OR
      f.ghana_card ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (commodity && commodity !== "all") {
    if (commodity === "Not specified") {
      filterSql += ` AND (f.primary_crops IS NULL OR array_length(f.primary_crops, 1) IS NULL OR f.primary_crops = '{}')`;
    } else {
      filterSql += ` AND $${paramIndex} = ANY(f.primary_crops)`;
      params.push(commodity);
      paramIndex++;
    }
  }

  if (region && region !== "all") {
    if (region === "Not specified") {
      filterSql += ` AND (f.region IS NULL OR TRIM(f.region) = '')`;
    } else {
      filterSql += ` AND LOWER(REGEXP_REPLACE(TRIM(f.region), '\\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM($${paramIndex}), '\\s+', ' ', 'g'))`;
      params.push(region);
      paramIndex++;
    }
  }

  if (district && district !== "all") {
    if (district === "Not specified") {
      filterSql += ` AND (f.district IS NULL OR TRIM(f.district) = '')`;
    } else {
      filterSql += ` AND LOWER(REGEXP_REPLACE(TRIM(f.district), '\\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM($${paramIndex}), '\\s+', ' ', 'g'))`;
      params.push(district);
      paramIndex++;
    }
  }

  if (gender && gender !== "all") {
    if (gender === "male") {
      filterSql += ` AND LOWER(TRIM(f.gender)) IN ('male', 'm')`;
    } else if (gender === "female") {
      filterSql += ` AND LOWER(TRIM(f.gender)) IN ('female', 'f')`;
    }
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM farmers f WHERE f.deleted_at IS NULL AND ${scope.sql} ${filterSql}`,
    params
  );
  
  const total = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  const dataParams = [...params, limit, offset];
  const result = await query(
    `SELECT f.*, u.full_name AS created_by_name
     FROM farmers f
     LEFT JOIN users u ON u.id = f.created_by
     WHERE f.deleted_at IS NULL AND ${scope.sql} ${filterSql}
     ORDER BY f.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    dataParams
  );

  return c.json({
    data: result.rows,
    total,
    page,
    limit,
    totalPages
  });
});

farmerRoutes.get("/all", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const scope = farmerScopeClause(actorResult, "f", 1);
  const result = await query(
    `SELECT f.*, u.full_name AS created_by_name
     FROM farmers f
     LEFT JOIN users u ON u.id = f.created_by
     WHERE f.deleted_at IS NULL AND ${scope.sql}
     ORDER BY f.created_at DESC`,
    scope.params
  );

  return c.json({ farmers: result.rows });
});

function toPct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

interface StatsRow {
  gender: string | null;
  region: string | null;
  district: string | null;
  primary_crops: string[] | null;
}

const statsCache = new Map<string, { expiresAt: number; payload: unknown }>();
const STATS_CACHE_TTL_MS = 30_000;

farmerRoutes.get("/stats", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const commodity = c.req.query("commodity")?.trim() ?? "";
  const cacheKey = `${actorResult.id}:${actorResult.role}:${commodity.toLowerCase()}`;
  const cached = statsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return c.json(cached.payload);
  }

  const scope = farmerScopeClause(actorResult, "f", 1);
  const result = await query<StatsRow>(
    `SELECT f.gender, f.region, f.district, f.primary_crops
     FROM farmers f
     WHERE f.deleted_at IS NULL AND ${scope.sql}`,
    scope.params
  );

  const rows = result.rows;
  const total = rows.length;
  let male = 0;
  let female = 0;
  let withCommodities = 0;

  const districtKeys = new Set<string>();
  const regionKeys = new Set<string>();
  const commodityMap = new Map<string, { label: string; count: number }>();
  const regionMap = new Map<string, { label: string; count: number }>();
  const districtMap = new Map<string, { label: string; count: number }>();

  const filterCommodity = commodity && commodity !== "all" ? commodity.toLowerCase() : null;
  let districtTotal = 0;

  for (const row of rows) {
    const g = row.gender?.trim().toLowerCase();
    if (g === "male" || g === "m") male++;
    else if (g === "female" || g === "f") female++;

    const rawRegion = row.region ? normalizeWhitespace(row.region) : "";
    const regionKey = rawRegion ? rawRegion.toLowerCase() : "not specified";
    if (rawRegion) regionKeys.add(regionKey);
    const existingRegion = regionMap.get(regionKey);
    if (existingRegion) {
      existingRegion.count++;
    } else {
      regionMap.set(regionKey, { label: rawRegion || "Not specified", count: 1 });
    }

    const rawDistrict = row.district ? normalizeWhitespace(row.district) : "";
    const districtKey = rawDistrict ? rawDistrict.toLowerCase() : "not specified";
    if (rawDistrict) districtKeys.add(districtKey);

    const crops = (row.primary_crops ?? []).map((crop) => crop.trim()).filter(Boolean);
    if (crops.length > 0) {
      withCommodities++;
      for (const crop of crops) {
        const cropKey = crop.toLowerCase();
        const existing = commodityMap.get(cropKey);
        if (existing) {
          existing.count++;
        } else {
          commodityMap.set(cropKey, { label: crop, count: 1 });
        }
      }
    } else {
      const existing = commodityMap.get("not specified");
      if (existing) {
        existing.count++;
      } else {
        commodityMap.set("not specified", { label: "Not specified", count: 1 });
      }
    }

    const matchesCommodity =
      !filterCommodity ||
      (filterCommodity === "not specified"
        ? crops.length === 0
        : crops.some((crop) => crop.toLowerCase() === filterCommodity));

    if (matchesCommodity) {
      districtTotal++;
      const existingDistrict = districtMap.get(districtKey);
      if (existingDistrict) {
        existingDistrict.count++;
      } else {
        districtMap.set(districtKey, { label: rawDistrict || "Not specified", count: 1 });
      }
    }
  }

  const commodityEntries = [...commodityMap.values()];
  const commodityDenom = commodityEntries.reduce((sum, item) => sum + item.count, 0);
  const sortDesc = <T extends { count: number }>(list: T[]) => list.sort((a, b) => b.count - a.count);

  const payload = {
    totalRegistered: total,
    districts: districtKeys.size,
    regions: regionKeys.size,
    male,
    female,
    by_commodity: sortDesc(commodityEntries).map((r) => ({
      label: r.label,
      count: r.count,
      percentage: toPct(r.count, commodityDenom),
    })),
    by_region: sortDesc([...regionMap.values()]).map((r) => ({
      label: r.label,
      count: r.count,
      percentage: toPct(r.count, total),
    })),
    by_district: sortDesc([...districtMap.values()]).map((r) => ({
      label: r.label,
      count: r.count,
      percentage: toPct(r.count, districtTotal),
    })),
  };

  statsCache.set(cacheKey, { expiresAt: Date.now() + STATS_CACHE_TTL_MS, payload });
  return c.json(payload);
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
      `SELECT * FROM farmers WHERE created_by = $1 AND deleted_at IS NULL AND metadata->>'client_local_id' = $2`,
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
         AND f.deleted_at IS NULL
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
      reference_id, full_name, community, ghana_card, gender, age, phone, email,
      region, district, digital_address, farm_address,
      household_size, farming_dependency, years_farming, primary_crops,
      bank_name, bank_branch, bank_account, created_by, office_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::jsonb)
    RETURNING *`,
    [
      referenceId,
      farmerFields.full_name,
      farmerFields.community,
      farmerFields.ghana_card ?? null,
      farmerFields.gender ?? null,
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

farmerRoutes.post("/bulk", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canRegisterFarmers(actor) && actor.role !== "team_lead" && actor.role !== "admin") {
    return c.json({ error: "Not authorized to import farmers" }, 403);
  }

  const body = (await c.req.json().catch(() => null)) as {
    farmers?: unknown[];
    created_by?: string;
    device_id?: string;
    captured_at?: string;
  } | null;

  if (!body || !Array.isArray(body.farmers) || body.farmers.length === 0) {
    return c.json({ error: "Provide a non-empty farmers array" }, 400);
  }

  if (body.farmers.length > 500) {
    return c.json({ error: "Cannot import more than 500 farmers in a single batch" }, 400);
  }

  const createdBy = SKIP_AUTH ? actor.id : (body.created_by || actor.id);
  if (!createdBy) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const userResult = await query<{ office_id: string | null }>(
    "SELECT office_id FROM users WHERE id = $1",
    [createdBy]
  );
  const officeId = userResult.rows[0]?.office_id ?? actor.office_id ?? null;

  const usedRefIds = new Set<string>();
  const createdFarmers: unknown[] = [];
  let conflictsCount = 0;

  for (let i = 0; i < body.farmers.length; i++) {
    const parsed = CreateFarmerRequest.safeParse(body.farmers[i]);
    if (!parsed.success) {
      return c.json(
        { error: `Invalid farmer data at row ${i + 1}`, details: parsed.error.flatten() },
        400
      );
    }

    const data = parsed.data;
    const { captured_at, device_id, client_local_id, ...farmerFields } = data;
    const clientLocalId = client_local_id?.trim() || null;

    if (clientLocalId) {
      const existingByClientId = await query(
        `SELECT * FROM farmers WHERE created_by = $1 AND deleted_at IS NULL AND metadata->>'client_local_id' = $2`,
        [createdBy, clientLocalId]
      );
      if (existingByClientId.rows[0]) {
        createdFarmers.push(existingByClientId.rows[0]);
        continue;
      }
    }

    let referenceId = createFarmerReferenceId();
    while (usedRefIds.has(referenceId)) {
      referenceId = `jni-fm-${ `${Date.now()}${Math.floor(Math.random() * 10000)}`.slice(-10) }`;
    }
    usedRefIds.add(referenceId);

    const metadata = JSON.stringify({
      ...(clientLocalId ? { client_local_id: clientLocalId } : {}),
      imported_from_sheet: true,
    });

    const result = await query(
      `INSERT INTO farmers (
        reference_id, full_name, community, ghana_card, gender, age, phone, email,
        region, district, digital_address, farm_address,
        household_size, farming_dependency, years_farming, primary_crops,
        bank_name, bank_branch, bank_account, created_by, office_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::jsonb)
      RETURNING *`,
      [
        referenceId,
        farmerFields.full_name ?? "",
        farmerFields.community ?? "",
        farmerFields.ghana_card ?? null,
        farmerFields.gender ?? null,
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
    createdFarmers.push(farmer);

    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'create', 'farmer', $2, $3)`,
      [createdBy, farmer.id, JSON.stringify(farmer)]
    );

    await recordSubmission({
      entityType: "farmer",
      entityId: farmer.id,
      agentId: createdBy,
      capturedAt: captured_at ?? body.captured_at ?? new Date().toISOString(),
      deviceId: device_id ?? body.device_id,
    });

    const conflicts = await checkFarmerConflicts(farmer.id, {
      full_name: farmerFields.full_name ?? "",
      community: farmerFields.community ?? "",
      ghana_card: farmerFields.ghana_card,
      phone: farmerFields.phone,
    });
    conflictsCount += conflicts.length;
  }

  return c.json(
    {
      farmers: createdFarmers,
      count: createdFarmers.length,
      conflictsCount,
    },
    201
  );
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
      age = $5,
      phone = $6,
      email = $7,
      region = $8,
      district = $9,
      digital_address = $10,
      farm_address = $11,
      household_size = $12,
      farming_dependency = $13,
      years_farming = $14,
      primary_crops = $15,
      bank_name = $16,
      bank_branch = $17,
      bank_account = $18,
      updated_at = now()
    WHERE id = $19
    RETURNING *`,
    [
      data.full_name,
      data.community,
      data.ghana_card ?? null,
      data.gender ?? null,
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
  const result = await query(
    `SELECT f.*, u.full_name AS created_by_name
     FROM farmers f
     LEFT JOIN users u ON u.id = f.created_by
     WHERE f.id = $1 AND f.deleted_at IS NULL AND ${scope.sql}`,
    [
      farmerId,
      ...scope.params,
    ]
  );

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

  const existing = await query("SELECT * FROM farmers WHERE id = $1 AND deleted_at IS NULL", [farmerId]);
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

  await query("UPDATE farmers SET deleted_at = now() WHERE id = $1", [farmerId]);

  return c.json({ ok: true });
});
