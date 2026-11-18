import { Hono } from "hono";
import {
  CreateDriverRequest,
  UpdateDriverRequest,
  createDriverReferenceId,
} from "@farmeriq/shared";
import { requireActor } from "../lib/actor.js";
import { canAccessDrivers } from "../lib/access.js";
import { query } from "../db.js";

export const driverRoutes = new Hono();

let tableReadyPromise: Promise<void> | null = null;

async function ensureDriversTable(): Promise<void> {
  if (!tableReadyPromise) {
    tableReadyPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS drivers (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          reference_id text,
          full_name text NOT NULL,
          phone text,
          license_number text,
          vehicle_type text,
          vehicle_plate text,
          assigned_location text,
          status text NOT NULL DEFAULT 'active',
          created_by uuid REFERENCES users(id),
          office_id uuid REFERENCES offices(id),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        )
      `);
    })().catch((err) => {
      tableReadyPromise = null;
      throw err;
    });
  }
  return tableReadyPromise;
}

driverRoutes.use("*", async (c, next) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  if (!canAccessDrivers(actorResult)) {
    return c.json({ error: "Forbidden: Field agents do not have access to drivers" }, 403);
  }
  await ensureDriversTable();
  await next();
});

driverRoutes.get("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  try {
    const page = parseInt(c.req.query("page") ?? "1", 10) || 1;
    const limit = parseInt(c.req.query("limit") ?? "20", 10) || 20;
    const search = c.req.query("search")?.trim() ?? "";
    const vehicleType = c.req.query("vehicle_type")?.trim() ?? "";
    const status = c.req.query("status")?.trim() ?? "";
    const offset = (page - 1) * limit;

    let filterSql = "";
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      filterSql += ` AND (
        d.full_name ILIKE $${paramIndex} OR
        d.phone ILIKE $${paramIndex} OR
        d.license_number ILIKE $${paramIndex} OR
        d.vehicle_plate ILIKE $${paramIndex} OR
        d.assigned_location ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (vehicleType && vehicleType !== "all") {
      if (vehicleType === "Not specified") {
        filterSql += ` AND (d.vehicle_type IS NULL OR TRIM(d.vehicle_type) = '')`;
      } else {
        filterSql += ` AND LOWER(TRIM(d.vehicle_type)) = LOWER($${paramIndex})`;
        params.push(vehicleType);
        paramIndex++;
      }
    }

    if (status && status !== "all") {
      filterSql += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const [countResult, summaryResult, vehicleTypesResult] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*) FROM drivers d WHERE d.deleted_at IS NULL ${filterSql}`,
        params
      ),
      query<{ total_all: number; active_count: number; inactive_count: number }>(
        `SELECT
           COUNT(*)::int AS total_all,
           COALESCE(SUM(CASE WHEN d.status = 'active' THEN 1 ELSE 0 END), 0)::int AS active_count,
           COALESCE(SUM(CASE WHEN d.status = 'inactive' THEN 1 ELSE 0 END), 0)::int AS inactive_count
         FROM drivers d
         WHERE d.deleted_at IS NULL`
      ),
      query<{ vehicle_type: string }>(
        `SELECT DISTINCT TRIM(d.vehicle_type) AS vehicle_type
         FROM drivers d
         WHERE d.deleted_at IS NULL AND d.vehicle_type IS NOT NULL AND TRIM(d.vehicle_type) != ''
         ORDER BY vehicle_type ASC`
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    const totalPages = Math.ceil(total / limit);

    const dataParams = [...params, limit, offset];
    const result = await query(
      `SELECT d.*, u.full_name AS created_by_name
       FROM drivers d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.deleted_at IS NULL ${filterSql}
       ORDER BY d.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams
    );

    const summary = summaryResult.rows[0] ?? {
      total_all: 0,
      active_count: 0,
      inactive_count: 0,
    };

    return c.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages,
      summary,
      vehicle_types: vehicleTypesResult.rows.map((r) => r.vehicle_type),
    });
  } catch (err) {
    console.error("[GET /drivers error]", err);
    return c.json(
      {
        error: err instanceof Error ? err.message : "Failed to load drivers",
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

driverRoutes.get("/:id", async (c) => {
  const driverId = c.req.param("id");
  const result = await query(
    `SELECT d.*, u.full_name AS created_by_name
     FROM drivers d
     LEFT JOIN users u ON u.id = d.created_by
     WHERE (d.id::text = $1 OR d.reference_id = $1) AND d.deleted_at IS NULL`,
    [driverId]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Driver not found" }, 404);
  }

  return c.json({ driver: result.rows[0] });
});

driverRoutes.post("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  const body = await c.req.json();
  const parsed = CreateDriverRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const referenceId = createDriverReferenceId();

  const result = await query(
    `INSERT INTO drivers (
      reference_id, full_name, phone, license_number, vehicle_type,
      vehicle_plate, assigned_location, status, created_by, office_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      referenceId,
      data.full_name.trim(),
      data.phone?.trim() || null,
      data.license_number?.trim() || null,
      data.vehicle_type?.trim() || null,
      data.vehicle_plate?.trim() || null,
      data.assigned_location?.trim() || null,
      data.status ?? "active",
      actor.id,
      actor.office_id ?? null,
    ]
  );

  const driver = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'create', 'driver', $2, $3)`,
    [actor.id, driver.id, JSON.stringify(driver)]
  );

  return c.json({ driver }, 201);
});

driverRoutes.put("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  const driverId = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateDriverRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const result = await query(
    `UPDATE drivers SET
      full_name = $1,
      phone = $2,
      license_number = $3,
      vehicle_type = $4,
      vehicle_plate = $5,
      assigned_location = $6,
      status = $7,
      updated_at = now()
    WHERE (id::text = $8 OR reference_id = $8) AND deleted_at IS NULL
    RETURNING *`,
    [
      data.full_name.trim(),
      data.phone?.trim() || null,
      data.license_number?.trim() || null,
      data.vehicle_type?.trim() || null,
      data.vehicle_plate?.trim() || null,
      data.assigned_location?.trim() || null,
      data.status ?? "active",
      driverId,
    ]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Driver not found" }, 404);
  }

  const driver = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'update', 'driver', $2, $3)`,
    [actor.id, driver.id, JSON.stringify(driver)]
  );

  return c.json({ driver });
});

driverRoutes.delete("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  const driverId = c.req.param("id");
  const existing = await query(
    `SELECT * FROM drivers WHERE (id::text = $1 OR reference_id = $1) AND deleted_at IS NULL`,
    [driverId]
  );

  if (existing.rowCount === 0) {
    return c.json({ error: "Driver not found" }, 404);
  }

  const driver = existing.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, reason)
     VALUES ($1, 'delete', 'driver', $2, $3, $4)`,
    [actor.id, driver.id, JSON.stringify(driver), "Removed by user"]
  );

  await query(`UPDATE drivers SET deleted_at = now() WHERE id = $1`, [driver.id]);

  return c.json({ ok: true });
});
