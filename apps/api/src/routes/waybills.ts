import { Hono } from "hono";
import path from "path";
import {
  CreateWaybillRequest,
  ResolveConflictRequest,
  UpdateWaybillRequest,
  createAggregatorReferenceId,
  createOfftakerReferenceId,
  createWaybillReferenceId,
  type Waybill,
  type WaybillPhoto,
  type WaybillPhotoType,
  type WaybillSummary,
} from "@farmeriq/shared";
import { requireActor, type Actor } from "../lib/actor.js";
import { hasOperationsAccess } from "../lib/access.js";
import { getConflictFlag, resolveConflictFlag } from "../lib/conflicts.js";
import {
  checkWaybillInputConflicts,
  findDuplicateWaybillNumber,
  listWaybillConflicts,
  syncWaybillConflictFlags,
} from "../lib/waybill-conflicts.js";
import { ensureWaybillsTables } from "../lib/waybills-schema.js";
import {
  deletePhotoFile,
  photoPublicUrl,
  savePhotoFile,
} from "../lib/photo-storage.js";
import { query } from "../db.js";

export const waybillRoutes = new Hono();

waybillRoutes.use("*", async (c, next) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const allowed = await hasOperationsAccess(actorResult);
  if (!allowed) {
    return c.json({ error: "Forbidden: Operations access is required" }, 403);
  }

  await ensureWaybillsTables();
  await next();
});

function contentTypeForFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".pdf") return "application/pdf";
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

/**
 * If a buyer name was typed manually without selecting an existing Offtaker,
 * reuse a case-insensitive match or create a new Offtaker record automatically.
 */
async function resolveOrCreateOfftakerId(
  actor: Actor,
  offtakerId: string | null | undefined,
  buyerName: string | null | undefined,
  dischargeLocation: string | null | undefined,
  productName: string | null | undefined
): Promise<string | null> {
  if (offtakerId) return offtakerId;

  const cleanBuyer = buyerName?.trim();
  if (!cleanBuyer) return null;

  const existing = await query<{ id: string }>(
    `SELECT id FROM offtakers
     WHERE LOWER(TRIM(company_name)) = LOWER($1) AND deleted_at IS NULL
     LIMIT 1`,
    [cleanBuyer]
  );
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const referenceId = createOfftakerReferenceId();
  const targetProducts = productName?.trim() ? [productName.trim()] : [];

  const inserted = await query<{ id: string; [key: string]: unknown }>(
    `INSERT INTO offtakers (
      reference_id, company_name, target_products, delivery_location,
      created_by, office_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
    RETURNING *`,
    [
      referenceId,
      cleanBuyer,
      targetProducts,
      dischargeLocation?.trim() || null,
      actor.id,
      actor.office_id ?? null,
    ]
  );

  const created = inserted.rows[0];
  try {
    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'create', 'offtaker', $2, $3)`,
      [actor.id, created.id, JSON.stringify(created)]
    );
  } catch (err) {
    console.warn("Audit log insert failed for auto-created offtaker:", err);
  }

  return created.id;
}

/**
 * If an aggregator name was typed manually (excluding Direct Company Sourcing),
 * reuse a case-insensitive match or create a new Aggregator record automatically.
 */
async function resolveOrCreateAggregatorId(
  actor: Actor,
  aggregatorId: string | null | undefined,
  aggregatorName: string | null | undefined,
  loadingLocation: string | null | undefined,
  productName: string | null | undefined
): Promise<string | null> {
  if (aggregatorId) return aggregatorId;

  const cleanAggregator = aggregatorName?.trim();
  if (!cleanAggregator || cleanAggregator.toLowerCase() === "direct company sourcing") {
    return null;
  }

  const existing = await query<{ id: string }>(
    `SELECT id FROM aggregators
     WHERE (LOWER(TRIM(full_name)) = LOWER($1) OR LOWER(TRIM(business_name)) = LOWER($1))
       AND deleted_at IS NULL
     LIMIT 1`,
    [cleanAggregator]
  );
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const referenceId = createAggregatorReferenceId();
  const commodities = productName?.trim() ? [productName.trim()] : [];

  const inserted = await query<{ id: string; [key: string]: unknown }>(
    `INSERT INTO aggregators (
      reference_id, full_name, town, commodities,
      created_by, office_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
    RETURNING *`,
    [
      referenceId,
      cleanAggregator,
      loadingLocation?.trim() || null,
      commodities,
      actor.id,
      actor.office_id ?? null,
    ]
  );

  const created = inserted.rows[0];
  try {
    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'create', 'aggregator', $2, $3)`,
      [actor.id, created.id, JSON.stringify(created)]
    );
  } catch (err) {
    console.warn("Audit log insert failed for auto-created aggregator:", err);
  }

  return created.id;
}

function buildFilterSql(c: { req: { query: (key: string) => string | undefined } }) {
  const search = c.req.query("search")?.trim() ?? "";
  const product = c.req.query("product")?.trim() ?? "";
  const status = c.req.query("status")?.trim() ?? "";
  const buyer = c.req.query("buyer")?.trim() ?? "";
  const dateFrom = c.req.query("date_from")?.trim() ?? "";
  const dateTo = c.req.query("date_to")?.trim() ?? "";

  let filterSql = "";
  const params: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    filterSql += ` AND (
      w.waybill_number ILIKE $${paramIndex} OR
      w.reference_id ILIKE $${paramIndex} OR
      w.buyer_name ILIKE $${paramIndex} OR
      w.aggregator_name ILIKE $${paramIndex} OR
      w.loading_location ILIKE $${paramIndex} OR
      w.discharge_location ILIKE $${paramIndex} OR
      w.product_name ILIKE $${paramIndex} OR
      w.driver_name ILIKE $${paramIndex} OR
      w.truck_number ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (product && product !== "all") {
    if (product === "Not specified") {
      filterSql += ` AND (w.product_name IS NULL OR TRIM(w.product_name) = '')`;
    } else {
      filterSql += ` AND LOWER(TRIM(w.product_name)) = LOWER($${paramIndex})`;
      params.push(product);
      paramIndex++;
    }
  }

  if (status && status !== "all") {
    filterSql += ` AND w.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (buyer && buyer !== "all") {
    if (buyer === "Not specified") {
      filterSql += ` AND (w.buyer_name IS NULL OR TRIM(w.buyer_name) = '')`;
    } else {
      filterSql += ` AND LOWER(TRIM(w.buyer_name)) = LOWER($${paramIndex})`;
      params.push(buyer);
      paramIndex++;
    }
  }

  if (dateFrom) {
    filterSql += ` AND w.issued_date >= $${paramIndex}::date`;
    params.push(dateFrom);
    paramIndex++;
  }

  if (dateTo) {
    filterSql += ` AND w.issued_date <= $${paramIndex}::date`;
    params.push(dateTo);
    paramIndex++;
  }

  return { filterSql, params, paramIndex };
}

const WAYBILL_SELECT_COLUMNS = `
  w.id,
  w.reference_id,
  w.waybill_number,
  TO_CHAR(w.issued_date, 'YYYY-MM-DD') AS issued_date,
  w.status,
  w.offtaker_id,
  w.buyer_name,
  w.aggregator_id,
  w.aggregator_name,
  w.loading_location,
  w.loading_region,
  w.discharge_location,
  w.product_name,
  w.product_description,
  w.bag_count,
  w.bag_unit,
  w.weight_kg::float8 AS weight_kg,
  w.received_weight_kg::float8 AS received_weight_kg,
  w.driver_id,
  w.driver_name,
  w.driver_phone,
  w.truck_number,
  w.notes,
  w.created_by,
  u.full_name AS created_by_name,
  w.office_id,
  w.created_at,
  w.updated_at,
  COALESCE((SELECT COUNT(*) FROM waybill_photos wp WHERE wp.waybill_id = w.id AND wp.photo_type = 'truck'), 0)::int AS truck_photo_count,
  COALESCE((SELECT COUNT(*) FROM waybill_photos wp WHERE wp.waybill_id = w.id AND wp.photo_type = 'waybill_doc'), 0)::int AS doc_photo_count,
  COALESCE((SELECT COUNT(*) FROM conflict_flags cf WHERE cf.entity_type = 'waybill' AND cf.entity_id = w.id AND cf.status = 'open'), 0)::int AS open_conflict_count
`;

function toSummary(row: {
  total_waybills?: number;
  in_transit_count?: number;
  delivered_count?: number;
  cancelled_count?: number;
  total_bags?: number;
  total_weight_kg?: number;
  total_received_weight_kg?: number;
} | undefined): WaybillSummary {
  const totalWeightKg = Number(row?.total_weight_kg ?? 0);
  return {
    total_waybills: Number(row?.total_waybills ?? 0),
    in_transit_count: Number(row?.in_transit_count ?? 0),
    delivered_count: Number(row?.delivered_count ?? 0),
    cancelled_count: Number(row?.cancelled_count ?? 0),
    total_bags: Number(row?.total_bags ?? 0),
    total_weight_kg: totalWeightKg,
    total_weight_tons: Number((totalWeightKg / 1000).toFixed(3)),
    total_received_weight_kg: Number(row?.total_received_weight_kg ?? 0),
  };
}

const SUMMARY_AGG_SQL = `
  COUNT(*)::int AS total_waybills,
  COALESCE(SUM(CASE WHEN w.status = 'in_transit' THEN 1 ELSE 0 END), 0)::int AS in_transit_count,
  COALESCE(SUM(CASE WHEN w.status = 'delivered' THEN 1 ELSE 0 END), 0)::int AS delivered_count,
  COALESCE(SUM(CASE WHEN w.status = 'cancelled' THEN 1 ELSE 0 END), 0)::int AS cancelled_count,
  COALESCE(SUM(COALESCE(w.bag_count, 0)), 0)::int AS total_bags,
  COALESCE(SUM(COALESCE(w.weight_kg, 0)), 0)::float8 AS total_weight_kg,
  COALESCE(SUM(COALESCE(w.received_weight_kg, 0)), 0)::float8 AS total_received_weight_kg
`;

waybillRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") ?? "1", 10) || 1;
    const limit = parseInt(c.req.query("limit") ?? "20", 10) || 20;
    const offset = (page - 1) * limit;

    const { filterSql, params, paramIndex } = buildFilterSql(c);

    const [countResult, summaryResult, productsResult, buyersResult, loadingLocsResult] =
      await Promise.all([
        query<{ count: string }>(
          `SELECT COUNT(*) FROM waybills w WHERE w.deleted_at IS NULL ${filterSql}`,
          params
        ),
        query(
          `SELECT ${SUMMARY_AGG_SQL} FROM waybills w WHERE w.deleted_at IS NULL ${filterSql}`,
          params
        ),
        query<{ value: string }>(
          `SELECT DISTINCT TRIM(w.product_name) AS value
           FROM waybills w
           WHERE w.deleted_at IS NULL AND w.product_name IS NOT NULL AND TRIM(w.product_name) != ''
           ORDER BY value ASC`
        ),
        query<{ value: string }>(
          `SELECT DISTINCT TRIM(w.buyer_name) AS value
           FROM waybills w
           WHERE w.deleted_at IS NULL AND w.buyer_name IS NOT NULL AND TRIM(w.buyer_name) != ''
           ORDER BY value ASC`
        ),
        query<{ value: string }>(
          `SELECT DISTINCT TRIM(w.loading_location) AS value
           FROM waybills w
           WHERE w.deleted_at IS NULL AND w.loading_location IS NOT NULL AND TRIM(w.loading_location) != ''
           ORDER BY value ASC`
        ),
      ]);

    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    const totalPages = Math.ceil(total / limit);

    const dataParams = [...params, limit, offset];
    const result = await query<Waybill>(
      `SELECT ${WAYBILL_SELECT_COLUMNS}
       FROM waybills w
       LEFT JOIN users u ON u.id = w.created_by
       WHERE w.deleted_at IS NULL ${filterSql}
       ORDER BY w.issued_date DESC, w.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams
    );

    return c.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages,
      summary: toSummary(summaryResult.rows[0]),
      filter_options: {
        products: productsResult.rows.map((r) => r.value),
        buyers: buyersResult.rows.map((r) => r.value),
        loading_locations: loadingLocsResult.rows.map((r) => r.value),
      },
    });
  } catch (err) {
    console.error("[GET /waybills error]", err);
    return c.json(
      {
        error: err instanceof Error ? err.message : "Failed to load waybills",
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

waybillRoutes.get("/export", async (c) => {
  try {
    const { filterSql, params } = buildFilterSql(c);
    const [result, summaryResult] = await Promise.all([
      query<Waybill>(
        `SELECT ${WAYBILL_SELECT_COLUMNS}
         FROM waybills w
         LEFT JOIN users u ON u.id = w.created_by
         WHERE w.deleted_at IS NULL ${filterSql}
         ORDER BY w.issued_date DESC, w.created_at DESC
         LIMIT 5000`,
        params
      ),
      query(
        `SELECT ${SUMMARY_AGG_SQL} FROM waybills w WHERE w.deleted_at IS NULL ${filterSql}`,
        params
      ),
    ]);

    return c.json({
      data: result.rows,
      summary: toSummary(summaryResult.rows[0]),
    });
  } catch (err) {
    console.error("[GET /waybills/export error]", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to export waybills" },
      500
    );
  }
});

waybillRoutes.get("/:id", async (c) => {
  const waybillId = c.req.param("id");
  const result = await query<Waybill>(
    `SELECT ${WAYBILL_SELECT_COLUMNS}
     FROM waybills w
     LEFT JOIN users u ON u.id = w.created_by
     WHERE (w.id::text = $1 OR w.reference_id = $1) AND w.deleted_at IS NULL`,
    [waybillId]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Waybill not found" }, 404);
  }

  return c.json({ waybill: result.rows[0] });
});

waybillRoutes.post("/check-conflicts", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const excludeId = typeof body.exclude_id === "string" && body.exclude_id ? body.exclude_id : undefined;

  let resolvedExcludeId = excludeId;
  if (excludeId) {
    const existing = await query<{ id: string }>(
      `SELECT id FROM waybills WHERE (id::text = $1 OR reference_id = $1) AND deleted_at IS NULL`,
      [excludeId]
    );
    resolvedExcludeId = existing.rows[0]?.id;
  }

  const result = await checkWaybillInputConflicts(
    {
      waybill_number: typeof body.waybill_number === "string" ? body.waybill_number : null,
      issued_date: typeof body.issued_date === "string" ? body.issued_date : null,
      buyer_name: typeof body.buyer_name === "string" ? body.buyer_name : null,
      loading_location: typeof body.loading_location === "string" ? body.loading_location : null,
      product_name: typeof body.product_name === "string" ? body.product_name : null,
      weight_kg: typeof body.weight_kg === "number" ? body.weight_kg : null,
      received_weight_kg: typeof body.received_weight_kg === "number" ? body.received_weight_kg : null,
      truck_number: typeof body.truck_number === "string" ? body.truck_number : null,
    },
    resolvedExcludeId
  );

  return c.json(result);
});

waybillRoutes.post("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  const body = await c.req.json();
  const parsed = CreateWaybillRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const cleanNumber = data.waybill_number.trim();

  const dup = await findDuplicateWaybillNumber(cleanNumber);
  if (dup) {
    return c.json(
      {
        error: `Waybill #${dup.waybill_number} already exists (issued ${dup.issued_date}${dup.buyer_name ? `, Buyer: ${dup.buyer_name}` : ""}).`,
        matching_waybill_id: dup.id,
      },
      409
    );
  }

  const referenceId = createWaybillReferenceId();
  const resolvedOfftakerId = await resolveOrCreateOfftakerId(
    actor,
    data.offtaker_id,
    data.buyer_name,
    data.discharge_location,
    data.product_name
  );
  const resolvedAggregatorId = await resolveOrCreateAggregatorId(
    actor,
    data.aggregator_id,
    data.aggregator_name,
    data.loading_location,
    data.product_name
  );

  const insertResult = await query<{ id: string }>(
    `INSERT INTO waybills (
      reference_id, waybill_number, issued_date, status,
      offtaker_id, buyer_name, aggregator_id, aggregator_name,
      loading_location, loading_region, discharge_location,
      product_name, product_description, bag_count, bag_unit,
      weight_kg, received_weight_kg,
      driver_id, driver_name, driver_phone, truck_number,
      notes, created_by, office_id
    ) VALUES (
      $1, $2, $3::date, $4,
      $5, $6, $7, $8,
      $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17,
      $18, $19, $20, $21,
      $22, $23, $24
    )
    RETURNING id`,
    [
      referenceId,
      cleanNumber,
      data.issued_date.trim(),
      data.status ?? "in_transit",
      resolvedOfftakerId,
      data.buyer_name?.trim() || null,
      resolvedAggregatorId,
      data.aggregator_name?.trim() || null,
      data.loading_location?.trim() || null,
      data.loading_region?.trim() || null,
      data.discharge_location?.trim() || null,
      data.product_name?.trim() || null,
      data.product_description?.trim() || null,
      data.bag_count ?? null,
      data.bag_unit?.trim() || "Bags",
      data.weight_kg ?? null,
      data.received_weight_kg ?? null,
      data.driver_id || null,
      data.driver_name?.trim() || null,
      data.driver_phone?.trim() || null,
      data.truck_number?.trim() || null,
      data.notes?.trim() || null,
      actor.id,
      actor.office_id ?? null,
    ]
  );

  const waybillRes = await query<Waybill>(
    `SELECT ${WAYBILL_SELECT_COLUMNS}
     FROM waybills w
     LEFT JOIN users u ON u.id = w.created_by
     WHERE w.id = $1`,
    [insertResult.rows[0].id]
  );
  const waybill = waybillRes.rows[0];

  try {
    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'create', 'waybill', $2, $3)`,
      [actor.id, waybill.id, JSON.stringify(waybill)]
    );
  } catch (err) {
    console.warn("Audit log insert failed:", err);
  }

  let conflicts: unknown[] = [];
  try {
    conflicts = await syncWaybillConflictFlags(waybill);
  } catch (err) {
    console.warn("Waybill conflict check failed:", err);
  }

  return c.json({ waybill, conflicts }, 201);
});

waybillRoutes.put("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  const waybillId = c.req.param("id");
  const existing = await query<{ id: string }>(
    `SELECT id FROM waybills WHERE (id::text = $1 OR reference_id = $1) AND deleted_at IS NULL`,
    [waybillId]
  );

  if (existing.rowCount === 0) {
    return c.json({ error: "Waybill not found" }, 404);
  }

  const realId = existing.rows[0].id;
  const body = await c.req.json();
  const parsed = UpdateWaybillRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const cleanNumber = data.waybill_number.trim();

  const dup = await findDuplicateWaybillNumber(cleanNumber, realId);
  if (dup) {
    return c.json(
      {
        error: `Waybill #${dup.waybill_number} already exists (issued ${dup.issued_date}${dup.buyer_name ? `, Buyer: ${dup.buyer_name}` : ""}).`,
        matching_waybill_id: dup.id,
      },
      409
    );
  }

  const resolvedOfftakerId = await resolveOrCreateOfftakerId(
    actor,
    data.offtaker_id,
    data.buyer_name,
    data.discharge_location,
    data.product_name
  );
  const resolvedAggregatorId = await resolveOrCreateAggregatorId(
    actor,
    data.aggregator_id,
    data.aggregator_name,
    data.loading_location,
    data.product_name
  );

  await query(
    `UPDATE waybills SET
      waybill_number = $1,
      issued_date = $2::date,
      status = $3,
      offtaker_id = $4,
      buyer_name = $5,
      aggregator_id = $6,
      aggregator_name = $7,
      loading_location = $8,
      loading_region = $9,
      discharge_location = $10,
      product_name = $11,
      product_description = $12,
      bag_count = $13,
      bag_unit = $14,
      weight_kg = $15,
      received_weight_kg = $16,
      driver_id = $17,
      driver_name = $18,
      driver_phone = $19,
      truck_number = $20,
      notes = $21,
      updated_at = now()
    WHERE id = $22`,
    [
      cleanNumber,
      data.issued_date.trim(),
      data.status ?? "in_transit",
      resolvedOfftakerId,
      data.buyer_name?.trim() || null,
      resolvedAggregatorId,
      data.aggregator_name?.trim() || null,
      data.loading_location?.trim() || null,
      data.loading_region?.trim() || null,
      data.discharge_location?.trim() || null,
      data.product_name?.trim() || null,
      data.product_description?.trim() || null,
      data.bag_count ?? null,
      data.bag_unit?.trim() || "Bags",
      data.weight_kg ?? null,
      data.received_weight_kg ?? null,
      data.driver_id || null,
      data.driver_name?.trim() || null,
      data.driver_phone?.trim() || null,
      data.truck_number?.trim() || null,
      data.notes?.trim() || null,
      realId,
    ]
  );

  const updatedRes = await query<Waybill>(
    `SELECT ${WAYBILL_SELECT_COLUMNS}
     FROM waybills w
     LEFT JOIN users u ON u.id = w.created_by
     WHERE w.id = $1`,
    [realId]
  );
  const waybill = updatedRes.rows[0];

  try {
    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'update', 'waybill', $2, $3)`,
      [actor.id, waybill.id, JSON.stringify(waybill)]
    );
  } catch (err) {
    console.warn("Audit log insert failed:", err);
  }

  let conflicts: unknown[] = [];
  try {
    conflicts = await syncWaybillConflictFlags(waybill);
  } catch (err) {
    console.warn("Waybill conflict check failed:", err);
  }

  return c.json({ waybill, conflicts });
});

waybillRoutes.get("/:id/conflicts", async (c) => {
  const waybillId = c.req.param("id");
  const existing = await query<{ id: string }>(
    `SELECT id FROM waybills WHERE (id::text = $1 OR reference_id = $1) AND deleted_at IS NULL`,
    [waybillId]
  );
  if (existing.rowCount === 0) {
    return c.json({ conflicts: [] });
  }
  const conflicts = await listWaybillConflicts(existing.rows[0].id);
  return c.json({ conflicts });
});

waybillRoutes.post("/:id/conflicts/:conflictId/resolve", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  const waybillId = c.req.param("id");
  const conflictId = c.req.param("conflictId");

  const existing = await query<{ id: string }>(
    `SELECT id FROM waybills WHERE (id::text = $1 OR reference_id = $1) AND deleted_at IS NULL`,
    [waybillId]
  );
  if (existing.rowCount === 0) {
    return c.json({ error: "Waybill not found" }, 404);
  }
  const realId = existing.rows[0].id;

  const body = await c.req.json();
  const parsed = ResolveConflictRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const flag = await getConflictFlag(conflictId);
  if (!flag || flag.entity_type !== "waybill" || flag.entity_id !== realId) {
    return c.json({ error: "Conflict not found" }, 404);
  }
  if (flag.status !== "open") {
    return c.json({ error: "Conflict is already closed" }, 409);
  }

  const updated = await resolveConflictFlag({
    conflictId,
    status: parsed.data.status,
    resolvedBy: actor.id,
    reason: parsed.data.reason ?? null,
  });

  if (!updated) {
    return c.json({ error: "Could not resolve conflict" }, 409);
  }

  try {
    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, reason)
       VALUES ($1, 'resolve_conflict', 'conflict_flag', $2, $3, $4)`,
      [
        actor.id,
        conflictId,
        JSON.stringify({ status: parsed.data.status, waybill_id: realId }),
        parsed.data.reason ?? null,
      ]
    );
  } catch (err) {
    console.warn("Audit log insert failed:", err);
  }

  return c.json({ conflict: updated });
});

waybillRoutes.delete("/photos/:photoId", async (c) => {
  const photoId = c.req.param("photoId");
  const result = await query<{ id: string; waybill_id: string; file_name: string }>(
    `SELECT id, waybill_id, file_name FROM waybill_photos WHERE id = $1`,
    [photoId]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Photo not found" }, 404);
  }

  const row = result.rows[0];
  await deletePhotoFile(row.waybill_id, row.file_name);
  await query(`DELETE FROM waybill_photos WHERE id = $1`, [photoId]);

  return c.json({ ok: true });
});

waybillRoutes.delete("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  const waybillId = c.req.param("id");
  const existing = await query(
    `SELECT * FROM waybills WHERE (id::text = $1 OR reference_id = $1) AND deleted_at IS NULL`,
    [waybillId]
  );

  if (existing.rowCount === 0) {
    return c.json({ error: "Waybill not found" }, 404);
  }

  const waybill = existing.rows[0];

  try {
    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, reason)
       VALUES ($1, 'delete', 'waybill', $2, $3, $4)`,
      [actor.id, waybill.id, JSON.stringify(waybill), "Removed by user"]
    );
  } catch (err) {
    console.warn("Audit log insert failed:", err);
  }

  await query(`UPDATE waybills SET deleted_at = now() WHERE id = $1`, [waybill.id]);

  return c.json({ ok: true });
});

waybillRoutes.get("/:id/photos", async (c) => {
  const waybillId = c.req.param("id");
  const waybill = await query<{ id: string }>(
    `SELECT id FROM waybills WHERE (id::text = $1 OR reference_id = $1) AND deleted_at IS NULL`,
    [waybillId]
  );

  if (waybill.rowCount === 0) {
    return c.json({ photos: [] });
  }

  const realId = waybill.rows[0].id;
  const result = await query<{
    id: string;
    waybill_id: string;
    photo_type: string;
    file_name: string;
    created_at: string;
  }>(`SELECT * FROM waybill_photos WHERE waybill_id = $1 ORDER BY created_at ASC`, [realId]);

  const photos: WaybillPhoto[] = result.rows.map((row) => ({
    id: row.id,
    waybill_id: row.waybill_id,
    photo_type: row.photo_type as WaybillPhotoType,
    file_name: row.file_name,
    url: photoPublicUrl(row.waybill_id, row.file_name),
    created_at: row.created_at,
  }));

  return c.json({ photos });
});

waybillRoutes.post("/:id/photos", async (c) => {
  const waybillId = c.req.param("id");
  const waybill = await query<{ id: string }>(
    `SELECT id FROM waybills WHERE (id::text = $1 OR reference_id = $1) AND deleted_at IS NULL`,
    [waybillId]
  );

  if (waybill.rowCount === 0) {
    return c.json({ error: "Waybill not found" }, 404);
  }

  const realId = waybill.rows[0].id;
  const body = await c.req.parseBody({ all: true });
  const truckFiles = normalizeUploadFiles(body.truck);
  const docFiles = normalizeUploadFiles(body.waybill_doc);
  const expectedUploads = truckFiles.length + docFiles.length;

  if (expectedUploads === 0) {
    return c.json({ error: "No photo files received" }, 400);
  }

  const saved: WaybillPhoto[] = [];

  async function saveUploadedFile(file: File, photoType: WaybillPhotoType): Promise<WaybillPhoto> {
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `${photoType}-${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || contentTypeForFileName(fileName);

    await savePhotoFile(realId, fileName, buffer, contentType);

    const result = await query<{
      id: string;
      waybill_id: string;
      photo_type: string;
      file_name: string;
      created_at: string;
    }>(
      `INSERT INTO waybill_photos (waybill_id, photo_type, file_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [realId, photoType, fileName]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      waybill_id: row.waybill_id,
      photo_type: row.photo_type as WaybillPhotoType,
      file_name: row.file_name,
      url: photoPublicUrl(row.waybill_id, row.file_name),
      created_at: row.created_at,
    };
  }

  for (const file of truckFiles) {
    saved.push(await saveUploadedFile(file, "truck"));
  }

  for (const file of docFiles) {
    saved.push(await saveUploadedFile(file, "waybill_doc"));
  }

  return c.json({ photos: saved }, 201);
});
