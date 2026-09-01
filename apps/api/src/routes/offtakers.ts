import { Hono } from "hono";
import path from "path";
import {
  CreateOfftakerRequest,
  UpdateOfftakerRequest,
  createOfftakerReferenceId,
  type OfftakerPhoto,
} from "@farmeriq/shared";
import { SKIP_AUTH } from "../config.js";
import { requireActor, type Actor } from "../lib/actor.js";
import { canRegisterOfftakers, offtakerScopeClause } from "../lib/access.js";
import { recordSubmission } from "../lib/submissions.js";
import {
  deletePhotoFile,
  photoPublicUrl,
  savePhotoFile,
} from "../lib/photo-storage.js";
import { query } from "../db.js";

export const offtakerRoutes = new Hono();

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

async function assertOfftakerInScope(offtakerId: string, actor: Actor) {
  const scope = offtakerScopeClause(actor, "a", 2);
  const result = await query(
    `SELECT a.id FROM offtakers a WHERE a.id = $1 AND a.deleted_at IS NULL AND ${scope.sql}`,
    [offtakerId, ...scope.params]
  );
  return (result.rowCount ?? 0) > 0;
}

offtakerRoutes.get("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  try {
    const page = parseInt(c.req.query("page") ?? "1", 10) || 1;
    const limit = parseInt(c.req.query("limit") ?? "20", 10) || 20;
    const search = c.req.query("search")?.trim() ?? "";
    const commodity = c.req.query("commodity")?.trim() ?? "";

    const offset = (page - 1) * limit;

    const scope = offtakerScopeClause(actorResult, "a", 1);

    let filterSql = "";
    const params = [...scope.params];
    let paramIndex = params.length + 1;

    if (search) {
      filterSql += ` AND (
        a.company_name ILIKE $${paramIndex} OR
        a.delivery_location ILIKE $${paramIndex} OR
        a.contact ILIKE $${paramIndex} OR
        a.official_email ILIKE $${paramIndex} OR
        a.contact_person ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (commodity && commodity !== "all") {
      if (commodity === "Not specified") {
        filterSql += ` AND (a.target_products IS NULL OR array_length(a.target_products, 1) IS NULL OR a.target_products = '{}')`;
      } else {
        filterSql += ` AND $${paramIndex} = ANY(a.target_products)`;
        params.push(commodity);
        paramIndex++;
      }
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM offtakers a WHERE a.deleted_at IS NULL AND ${scope.sql} ${filterSql}`,
      params
    );

    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    const totalPages = Math.ceil(total / limit);

    const dataParams = [...params, limit, offset];
    const result = await query(
      `SELECT * FROM offtakers a WHERE a.deleted_at IS NULL AND ${scope.sql} ${filterSql} ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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
    console.error("[GET /offtakers error]", err);
    return c.json(
      {
        error: err instanceof Error ? err.message : "Failed to load offtakers",
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

offtakerRoutes.get("/all", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  try {
    const scope = offtakerScopeClause(actorResult, "a", 1);
    const result = await query(
      `SELECT * FROM offtakers a WHERE a.deleted_at IS NULL AND ${scope.sql} ORDER BY a.created_at DESC`,
      scope.params
    );

    return c.json({ offtakers: result.rows });
  } catch (err) {
    console.error("[GET /offtakers/all error]", err);
    return c.json(
      {
        error: err instanceof Error ? err.message : "Failed to load offtakers",
        offtakers: [],
      },
      500
    );
  }
});

offtakerRoutes.post("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canRegisterOfftakers(actor)) {
    return c.json({ error: "Only field agents can register offtakers" }, 403);
  }

  try {
    const body = await c.req.json();
    const parsed = CreateOfftakerRequest.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const data = parsed.data;
  const { captured_at, device_id, client_local_id, ...offtakerFields } = data;
  const createdBy = SKIP_AUTH ? actor.id : (body as { created_by?: string }).created_by;

  if (!createdBy) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const clientLocalId = client_local_id?.trim() || null;

  if (clientLocalId) {
    const existingByClientId = await query(
      `SELECT * FROM offtakers WHERE created_by = $1 AND deleted_at IS NULL AND metadata->>'client_local_id' = $2`,
      [createdBy, clientLocalId]
    );
    if (existingByClientId.rows[0]) {
      return c.json({ offtaker: existingByClientId.rows[0] }, 200);
    }
  }

  if (device_id?.trim() && captured_at) {
    const existingBySubmission = await query(
      `SELECT a.* FROM submission_records sr
       JOIN offtakers a ON a.id = sr.entity_id
       WHERE sr.entity_type = 'offtaker'
         AND a.deleted_at IS NULL
         AND sr.agent_id = $1
         AND sr.device_id = $2
         AND sr.captured_at = $3`,
      [createdBy, device_id.trim(), captured_at]
    );
    if (existingBySubmission.rows[0]) {
      return c.json({ offtaker: existingBySubmission.rows[0] }, 200);
    }
  }

  const userResult = await query<{ office_id: string | null }>(
    "SELECT office_id FROM users WHERE id = $1",
    [createdBy]
  ).catch(() => ({ rows: [] }));
  const officeId = userResult.rows[0]?.office_id ?? actor.office_id ?? null;

  const referenceId = createOfftakerReferenceId();
  const metadata = clientLocalId ? JSON.stringify({ client_local_id: clientLocalId }) : "{}";

  const result = await query(
    `INSERT INTO offtakers (
      reference_id, company_name, contact_person, contact, designation, official_email,
      target_products, payment_terms, delivery_location, created_by, office_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
    RETURNING *`,
    [
      referenceId,
      offtakerFields.company_name.trim(),
      offtakerFields.contact_person?.trim() || null,
      offtakerFields.contact?.trim() || null,
      offtakerFields.designation?.trim() || null,
      offtakerFields.official_email?.trim() || null,
      offtakerFields.target_products ?? [],
      offtakerFields.payment_terms?.trim() || null,
      offtakerFields.delivery_location?.trim() || null,
      createdBy,
      officeId,
      metadata,
    ]
  );

  const offtaker = result.rows[0];

  try {
    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'create', 'offtaker', $2, $3)`,
      [createdBy, offtaker.id, JSON.stringify(offtaker)]
    );
  } catch (err) {
    console.warn("Audit log insert failed:", err);
  }

  try {
    await recordSubmission({
      entityType: "offtaker",
      entityId: offtaker.id,
      agentId: createdBy,
      capturedAt: captured_at ?? new Date().toISOString(),
      deviceId: device_id,
    });
  } catch (err) {
    console.warn("Submission record failed:", err);
  }

  return c.json({ offtaker }, 201);
} catch (err) {
  console.error("[POST /offtakers error]", err);
  return c.json(
    { error: err instanceof Error ? err.message : "Failed to create offtaker" },
    500
  );
}
});

offtakerRoutes.get("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const offtakerId = c.req.param("id");
  const scope = offtakerScopeClause(actorResult, "a", 2);
  const result = await query(
    `SELECT * FROM offtakers a WHERE a.id = $1 AND a.deleted_at IS NULL AND ${scope.sql}`,
    [offtakerId, ...scope.params]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Offtaker not found" }, 404);
  }

  return c.json({ offtaker: result.rows[0] });
});

offtakerRoutes.put("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const offtakerId = c.req.param("id");
  if (!(await assertOfftakerInScope(offtakerId, actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const parsed = UpdateOfftakerRequest.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const actorId = SKIP_AUTH ? actorResult.id : (body as { updated_by?: string }).updated_by;

  if (!actorId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const result = await query(
    `UPDATE offtakers SET
      company_name = $1,
      contact_person = $2,
      contact = $3,
      designation = $4,
      official_email = $5,
      target_products = $6,
      payment_terms = $7,
      delivery_location = $8,
      updated_at = now()
    WHERE id = $9
    RETURNING *`,
    [
      data.company_name.trim(),
      data.contact_person?.trim() || null,
      data.contact?.trim() || null,
      data.designation?.trim() || null,
      data.official_email?.trim() || null,
      data.target_products ?? [],
      data.payment_terms?.trim() || null,
      data.delivery_location?.trim() || null,
      offtakerId,
    ]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Offtaker not found" }, 404);
  }

  const offtaker = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'update', 'offtaker', $2, $3)`,
    [actorId, offtaker.id, JSON.stringify(offtaker)]
  );

  return c.json({ offtaker });
});

offtakerRoutes.delete("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const offtakerId = c.req.param("id");
  if (!(await assertOfftakerInScope(offtakerId, actorResult))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const actorId = SKIP_AUTH ? actorResult.id : (body as { deleted_by?: string }).deleted_by;

  if (!actorId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const existing = await query("SELECT * FROM offtakers WHERE id = $1 AND deleted_at IS NULL", [offtakerId]);
  if (existing.rowCount === 0) {
    return c.json({ error: "Offtaker not found" }, 404);
  }

  const offtaker = existing.rows[0];
  const reason = (body as { reason?: string }).reason ?? "Removed by agent";

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, reason)
     VALUES ($1, 'delete', 'offtaker', $2, $3, $4)`,
    [actorId, offtakerId, JSON.stringify(offtaker), reason]
  );

  await query("UPDATE offtakers SET deleted_at = now() WHERE id = $1", [offtakerId]);

  return c.json({ ok: true });
});

offtakerRoutes.get("/:id/photos", async (c) => {
  const offtakerId = c.req.param("id");
  const result = await query<{
    id: string;
    offtaker_id: string;
    photo_type: string;
    file_name: string;
    created_at: string;
  }>("SELECT * FROM offtaker_photos WHERE offtaker_id = $1 ORDER BY created_at ASC", [offtakerId]);

  const photos: OfftakerPhoto[] = result.rows.map((row) => ({
    id: row.id,
    offtaker_id: row.offtaker_id,
    photo_type: row.photo_type as OfftakerPhoto["photo_type"],
    file_name: row.file_name,
    url: photoPublicUrl(row.offtaker_id, row.file_name),
    created_at: row.created_at,
  }));

  return c.json({ photos });
});

offtakerRoutes.post("/:id/photos", async (c) => {
  const offtakerId = c.req.param("id");

  const offtaker = await query("SELECT id FROM offtakers WHERE id = $1", [offtakerId]);
  if (offtaker.rowCount === 0) {
    return c.json({ error: "Offtaker not found" }, 404);
  }

  const body = await c.req.parseBody({ all: true });
  const ghanaList = normalizeUploadFiles(body.ghana_card);
  const portraitFiles = normalizeUploadFiles(body.portrait);
  const portraitFile = portraitFiles[0] ?? null;
  const expectedUploads = ghanaList.length + (portraitFile ? 1 : 0);

  if (expectedUploads === 0) {
    return c.json({ error: "No photo files received" }, 400);
  }

  const saved: OfftakerPhoto[] = [];

  async function saveUploadedFile(
    file: File,
    photoType: OfftakerPhoto["photo_type"]
  ): Promise<OfftakerPhoto> {
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `${photoType}-${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || contentTypeForFileName(fileName);

    await savePhotoFile(offtakerId, fileName, buffer, contentType);

    const result = await query<{
      id: string;
      offtaker_id: string;
      photo_type: string;
      file_name: string;
      created_at: string;
    }>(
      `INSERT INTO offtaker_photos (offtaker_id, photo_type, file_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [offtakerId, photoType, fileName]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      offtaker_id: row.offtaker_id,
      photo_type: row.photo_type as OfftakerPhoto["photo_type"],
      file_name: row.file_name,
      url: photoPublicUrl(row.offtaker_id, row.file_name),
      created_at: row.created_at,
    };
  }

  for (const file of ghanaList) {
    saved.push(await saveUploadedFile(file, "ghana_card"));
  }

  if (portraitFile) {
    const existingPortrait = await query(
      "SELECT id, file_name FROM offtaker_photos WHERE offtaker_id = $1 AND photo_type = 'portrait'",
      [offtakerId]
    );
    for (const row of existingPortrait.rows) {
      await deletePhotoFile(offtakerId, row.file_name as string);
      await query("DELETE FROM offtaker_photos WHERE id = $1", [row.id]);
    }

    saved.push(await saveUploadedFile(portraitFile, "portrait"));
  }

  return c.json({ photos: saved }, 201);
});

offtakerRoutes.delete("/photos/:photoId", async (c) => {
  const photoId = c.req.param("photoId");
  const result = await query<{ id: string; offtaker_id: string; file_name: string }>(
    "SELECT id, offtaker_id, file_name FROM offtaker_photos WHERE id = $1",
    [photoId]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Photo not found" }, 404);
  }

  const row = result.rows[0];
  await deletePhotoFile(row.offtaker_id, row.file_name);
  await query("DELETE FROM offtaker_photos WHERE id = $1", [photoId]);

  return c.json({ ok: true });
});
