import { Hono } from "hono";
import path from "path";
import {
  CreateAggregatorRequest,
  UpdateAggregatorRequest,
  createAggregatorReferenceId,
  type AggregatorPhoto,
} from "@farmeriq/shared";
import { SKIP_AUTH } from "../config.js";
import { requireActor, type Actor } from "../lib/actor.js";
import { canRegisterAggregators, aggregatorScopeClause } from "../lib/access.js";
import { recordSubmission } from "../lib/submissions.js";
import {
  deletePhotoFile,
  photoPublicUrl,
  savePhotoFile,
} from "../lib/photo-storage.js";
import { query } from "../db.js";

export const aggregatorRoutes = new Hono();

function contentTypeForFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function isUploadFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as File).arrayBuffer === "function" &&
    (value as File).size > 0
  );
}

function normalizeUploadFiles(value: unknown): File[] {
  if (Array.isArray(value)) {
    return value.filter(isUploadFile);
  }
  return isUploadFile(value) ? [value] : [];
}

async function assertAggregatorInScope(aggregatorId: string, actor: Actor) {
  const scope = aggregatorScopeClause(actor, "a", 2);
  const result = await query(
    `SELECT a.id FROM aggregators a WHERE a.id = $1 AND ${scope.sql}`,
    [aggregatorId, ...scope.params]
  );
  return (result.rowCount ?? 0) > 0;
}

aggregatorRoutes.get("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  try {
    const page = parseInt(c.req.query("page") ?? "1", 10) || 1;
    const limit = parseInt(c.req.query("limit") ?? "20", 10) || 20;
    const search = c.req.query("search")?.trim() ?? "";
    const commodity = c.req.query("commodity")?.trim() ?? "";

    const offset = (page - 1) * limit;

    const scope = aggregatorScopeClause(actorResult, "a", 1);

    let filterSql = "";
    const params = [...scope.params];
    let paramIndex = params.length + 1;

    if (search) {
      filterSql += ` AND (
        a.full_name ILIKE $${paramIndex} OR
        a.town ILIKE $${paramIndex} OR
        a.phone ILIKE $${paramIndex} OR
        a.ghana_card ILIKE $${paramIndex} OR
        a.business_name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (commodity && commodity !== "all") {
      if (commodity === "Not specified") {
        filterSql += ` AND (a.commodities IS NULL OR array_length(a.commodities, 1) IS NULL OR a.commodities = '{}')`;
      } else {
        filterSql += ` AND $${paramIndex} = ANY(a.commodities)`;
        params.push(commodity);
        paramIndex++;
      }
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM aggregators a WHERE ${scope.sql} ${filterSql}`,
      params
    );

    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    const totalPages = Math.ceil(total / limit);

    const dataParams = [...params, limit, offset];
    const result = await query(
      `SELECT * FROM aggregators a WHERE ${scope.sql} ${filterSql} ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams
    );

    return c.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    console.error("[GET /aggregators error]", err);
    return c.json(
      {
        error: err instanceof Error ? err.message : "Failed to load aggregators",
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
      500
    );
  }
});

aggregatorRoutes.get("/all", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  try {
    const scope = aggregatorScopeClause(actorResult, "a", 1);
    const result = await query(
      `SELECT * FROM aggregators a WHERE ${scope.sql} ORDER BY a.created_at DESC`,
      scope.params
    );

    return c.json({ aggregators: result.rows });
  } catch (err) {
    console.error("[GET /aggregators/all error]", err);
    return c.json(
      {
        error: err instanceof Error ? err.message : "Failed to load aggregators",
        aggregators: [],
      },
      500
    );
  }
});

aggregatorRoutes.post("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canRegisterAggregators(actor)) {
    return c.json({ error: "Only field agents can register aggregators" }, 403);
  }

  try {
    const body = await c.req.json();
    const parsed = CreateAggregatorRequest.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const data = parsed.data;
  const { captured_at, device_id, client_local_id, ...aggregatorFields } = data;
  const createdBy = SKIP_AUTH ? actor.id : (body as { created_by?: string }).created_by;

  if (!createdBy) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const clientLocalId = client_local_id?.trim() || null;

  if (clientLocalId) {
    const existingByClientId = await query(
      `SELECT * FROM aggregators WHERE created_by = $1 AND metadata->>'client_local_id' = $2`,
      [createdBy, clientLocalId]
    );
    if (existingByClientId.rows[0]) {
      return c.json({ aggregator: existingByClientId.rows[0] }, 200);
    }
  }

  if (device_id?.trim() && captured_at) {
    const existingBySubmission = await query(
      `SELECT a.* FROM submission_records sr
       JOIN aggregators a ON a.id = sr.entity_id
       WHERE sr.entity_type = 'aggregator'
         AND sr.agent_id = $1
         AND sr.device_id = $2
         AND sr.captured_at = $3`,
      [createdBy, device_id.trim(), captured_at]
    );
    if (existingBySubmission.rows[0]) {
      return c.json({ aggregator: existingBySubmission.rows[0] }, 200);
    }
  }

  const userResult = await query<{ office_id: string | null }>(
    "SELECT office_id FROM users WHERE id = $1",
    [createdBy]
  ).catch(() => ({ rows: [] }));
  const officeId = userResult.rows[0]?.office_id ?? actor.office_id ?? null;

  const referenceId = createAggregatorReferenceId();
  const metadata = clientLocalId ? JSON.stringify({ client_local_id: clientLocalId }) : "{}";

  const result = await query(
    `INSERT INTO aggregators (
      reference_id, full_name, age, phone, town, ghana_card,
      business_name, commodities, created_by, office_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
    RETURNING *`,
    [
      referenceId,
      aggregatorFields.full_name.trim(),
      aggregatorFields.age ?? null,
      aggregatorFields.phone?.trim() || null,
      aggregatorFields.town?.trim() || null,
      aggregatorFields.ghana_card?.trim() || null,
      aggregatorFields.business_name?.trim() || null,
      aggregatorFields.commodities ?? [],
      createdBy,
      officeId,
      metadata,
    ]
  );

  const aggregator = result.rows[0];

  try {
    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'create', 'aggregator', $2, $3)`,
      [createdBy, aggregator.id, JSON.stringify(aggregator)]
    );
  } catch (err) {
    console.warn("Audit log insert failed:", err);
  }

  try {
    await recordSubmission({
      entityType: "aggregator",
      entityId: aggregator.id,
      agentId: createdBy,
      capturedAt: captured_at ?? new Date().toISOString(),
      deviceId: device_id,
    });
  } catch (err) {
    console.warn("Submission record failed:", err);
  }

  return c.json({ aggregator }, 201);
} catch (err) {
  console.error("[POST /aggregators error]", err);
  return c.json(
    { error: err instanceof Error ? err.message : "Failed to create aggregator" },
    500
  );
}
});

aggregatorRoutes.get("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const aggregatorId = c.req.param("id");
  const scope = aggregatorScopeClause(actorResult, "a", 2);
  const result = await query(
    `SELECT * FROM aggregators a WHERE a.id = $1 AND ${scope.sql}`,
    [aggregatorId, ...scope.params]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Aggregator not found" }, 404);
  }

  return c.json({ aggregator: result.rows[0] });
});

aggregatorRoutes.put("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const aggregatorId = c.req.param("id");
  if (!(await assertAggregatorInScope(aggregatorId, actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const parsed = UpdateAggregatorRequest.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const actorId = SKIP_AUTH ? actorResult.id : (body as { updated_by?: string }).updated_by;

  if (!actorId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const result = await query(
    `UPDATE aggregators SET
      full_name = $1,
      age = $2,
      phone = $3,
      town = $4,
      ghana_card = $5,
      business_name = $6,
      commodities = $7,
      updated_at = now()
    WHERE id = $8
    RETURNING *`,
    [
      data.full_name.trim(),
      data.age ?? null,
      data.phone?.trim() || null,
      data.town?.trim() || null,
      data.ghana_card?.trim() || null,
      data.business_name?.trim() || null,
      data.commodities ?? [],
      aggregatorId,
    ]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Aggregator not found" }, 404);
  }

  const aggregator = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'update', 'aggregator', $2, $3)`,
    [actorId, aggregator.id, JSON.stringify(aggregator)]
  );

  return c.json({ aggregator });
});

aggregatorRoutes.delete("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const aggregatorId = c.req.param("id");
  if (!(await assertAggregatorInScope(aggregatorId, actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const actorId = SKIP_AUTH ? actorResult.id : (body as { deleted_by?: string }).deleted_by;

  if (!actorId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const existing = await query("SELECT * FROM aggregators WHERE id = $1", [aggregatorId]);
  if (existing.rowCount === 0) {
    return c.json({ error: "Aggregator not found" }, 404);
  }

  const aggregator = existing.rows[0];
  const reason = (body as { reason?: string }).reason ?? "Removed by agent";

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, reason)
     VALUES ($1, 'delete', 'aggregator', $2, $3, $4)`,
    [actorId, aggregatorId, JSON.stringify(aggregator), reason]
  );

  await query("DELETE FROM aggregators WHERE id = $1", [aggregatorId]);

  return c.json({ ok: true });
});

aggregatorRoutes.get("/:id/photos", async (c) => {
  const aggregatorId = c.req.param("id");
  const result = await query<{
    id: string;
    aggregator_id: string;
    photo_type: string;
    file_name: string;
    created_at: string;
  }>("SELECT * FROM aggregator_photos WHERE aggregator_id = $1 ORDER BY created_at ASC", [aggregatorId]);

  const photos: AggregatorPhoto[] = result.rows.map((row) => ({
    id: row.id,
    aggregator_id: row.aggregator_id,
    photo_type: row.photo_type as AggregatorPhoto["photo_type"],
    file_name: row.file_name,
    url: photoPublicUrl(row.aggregator_id, row.file_name),
    created_at: row.created_at,
  }));

  return c.json({ photos });
});

aggregatorRoutes.post("/:id/photos", async (c) => {
  const aggregatorId = c.req.param("id");

  const aggregator = await query("SELECT id FROM aggregators WHERE id = $1", [aggregatorId]);
  if (aggregator.rowCount === 0) {
    return c.json({ error: "Aggregator not found" }, 404);
  }

  const body = await c.req.parseBody({ all: true });
  const ghanaList = normalizeUploadFiles(body.ghana_card);
  const portraitFiles = normalizeUploadFiles(body.portrait);
  const portraitFile = portraitFiles[0] ?? null;
  const expectedUploads = ghanaList.length + (portraitFile ? 1 : 0);

  if (expectedUploads === 0) {
    return c.json({ error: "No photo files received" }, 400);
  }

  const saved: AggregatorPhoto[] = [];

  async function saveUploadedFile(
    file: File,
    photoType: AggregatorPhoto["photo_type"]
  ): Promise<AggregatorPhoto> {
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `${photoType}-${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || contentTypeForFileName(fileName);

    await savePhotoFile(aggregatorId, fileName, buffer, contentType);

    const result = await query<{
      id: string;
      aggregator_id: string;
      photo_type: string;
      file_name: string;
      created_at: string;
    }>(
      `INSERT INTO aggregator_photos (aggregator_id, photo_type, file_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [aggregatorId, photoType, fileName]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      aggregator_id: row.aggregator_id,
      photo_type: row.photo_type as AggregatorPhoto["photo_type"],
      file_name: row.file_name,
      url: photoPublicUrl(row.aggregator_id, row.file_name),
      created_at: row.created_at,
    };
  }

  for (const file of ghanaList) {
    saved.push(await saveUploadedFile(file, "ghana_card"));
  }

  if (portraitFile) {
    const existingPortrait = await query(
      "SELECT id, file_name FROM aggregator_photos WHERE aggregator_id = $1 AND photo_type = 'portrait'",
      [aggregatorId]
    );
    for (const row of existingPortrait.rows) {
      await deletePhotoFile(aggregatorId, row.file_name as string);
      await query("DELETE FROM aggregator_photos WHERE id = $1", [row.id]);
    }

    saved.push(await saveUploadedFile(portraitFile, "portrait"));
  }

  return c.json({ photos: saved }, 201);
});

aggregatorRoutes.delete("/photos/:photoId", async (c) => {
  const photoId = c.req.param("photoId");
  const result = await query<{ id: string; aggregator_id: string; file_name: string }>(
    "SELECT id, aggregator_id, file_name FROM aggregator_photos WHERE id = $1",
    [photoId]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Photo not found" }, 404);
  }

  const row = result.rows[0];
  await deletePhotoFile(row.aggregator_id, row.file_name);
  await query("DELETE FROM aggregator_photos WHERE id = $1", [photoId]);

  return c.json({ ok: true });
});
