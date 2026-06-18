import { Hono } from "hono";
import { ReportFiltersSchema } from "@farmeriq/shared";
import type { Actor } from "../lib/actor.js";
import { requireActor } from "../lib/actor.js";
import { farmerScopeClause } from "../lib/access.js";
import { query } from "../db.js";

export const reportRoutes = new Hono();

type ResolvedFilters = {
  region?: string;
  district?: string;
  commodity?: string;
  date_from?: string;
  date_to?: string;
  created_by?: string;
};

function parseFilters(c: { req: { query: (key: string) => string | undefined } }) {
  const raw = {
    region: c.req.query("region") || undefined,
    district: c.req.query("district") || undefined,
    commodity: c.req.query("commodity") || undefined,
    date_from: c.req.query("date_from") || undefined,
    date_to: c.req.query("date_to") || undefined,
    created_by: c.req.query("created_by") || undefined,
  };

  const parsed = ReportFiltersSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  return { filters: parsed.data as ResolvedFilters };
}

function buildWhereClause(filters: ResolvedFilters, actor: Actor) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const scope = farmerScopeClause(actor, "f", paramIndex);
  if (scope.sql !== "1=1") {
    conditions.push(scope.sql);
    params.push(...scope.params);
    paramIndex = scope.nextIndex;
  }

  if (filters.created_by && actor.role !== "agent") {
    conditions.push(`f.created_by = $${paramIndex++}`);
    params.push(filters.created_by);
  }

  if (filters.region) {
    conditions.push(`f.region = $${paramIndex++}`);
    params.push(filters.region);
  }

  if (filters.district) {
    conditions.push(`f.district ILIKE $${paramIndex++}`);
    params.push(`%${filters.district}%`);
  }

  if (filters.commodity === "Not specified") {
    conditions.push(`COALESCE(array_length(f.primary_crops, 1), 0) = 0`);
  } else if (filters.commodity) {
    conditions.push(`$${paramIndex++} = ANY(f.primary_crops)`);
    params.push(filters.commodity);
  }

  if (filters.date_from) {
    conditions.push(`f.created_at >= $${paramIndex++}`);
    params.push(`${filters.date_from}T00:00:00.000Z`);
  }

  if (filters.date_to) {
    conditions.push(`f.created_at <= $${paramIndex++}`);
    params.push(`${filters.date_to}T23:59:59.999Z`);
  }

  if (conditions.length === 0) {
    conditions.push("1=1");
  }

  return { where: conditions.join(" AND "), params };
}

reportRoutes.get("/farmers", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const parsed = parseFilters(c);
  if ("error" in parsed) {
    return c.json({ error: parsed.error }, 400);
  }

  const { where, params } = buildWhereClause(parsed.filters!, actorResult);

  const result = await query(
    `SELECT
      f.id,
      f.reference_id,
      f.full_name,
      f.ghana_card,
      f.phone,
      f.gender,
      f.community,
      f.district,
      f.region,
      f.primary_crops,
      f.household_size,
      f.years_farming,
      f.farming_dependency,
      f.created_at,
      EXISTS (SELECT 1 FROM farm_plots fp WHERE fp.farmer_id = f.id AND fp.boundary IS NOT NULL) AS has_boundary
    FROM farmers f
    WHERE ${where}
    ORDER BY f.created_at DESC`,
    params
  );

  const farmers = result.rows.map((row) => ({
    id: row.id as string,
    reference_id: row.reference_id as string,
    full_name: row.full_name as string,
    ghana_card: row.ghana_card as string | null,
    phone: row.phone as string | null,
    gender: row.gender as string | null,
    community: row.community as string,
    district: row.district as string | null,
    region: row.region as string | null,
    primary_crops: (row.primary_crops as string[]) ?? [],
    household_size: row.household_size as number | null,
    years_farming: row.years_farming as number | null,
    farming_dependency: row.farming_dependency as string | null,
    created_at: row.created_at as string,
    has_boundary: Boolean(row.has_boundary),
  }));

  const regions = new Set(farmers.map((f) => f.region).filter(Boolean)).size;
  const districts = new Set(farmers.map((f) => f.district).filter(Boolean)).size;

  let openConflicts = 0;
  if (farmers.length > 0) {
    const farmerIds = farmers.map((f) => f.id);
    const conflictResult = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT cf.id)::text AS count
       FROM conflict_flags cf
       WHERE cf.status = 'open'
         AND (
           (cf.entity_type = 'farmer' AND cf.entity_id = ANY($1::uuid[]))
           OR (
             cf.entity_type = 'farm_plot'
             AND cf.entity_id IN (SELECT id FROM farm_plots WHERE farmer_id = ANY($1::uuid[]))
           )
         )`,
      [farmerIds]
    );
    openConflicts = Number(conflictResult.rows[0]?.count ?? 0);
  }

  const summary = {
    total_farmers: farmers.length,
    with_ghana_card: farmers.filter((f) => f.ghana_card?.trim()).length,
    with_phone: farmers.filter((f) => f.phone?.trim()).length,
    with_boundary: farmers.filter((f) => f.has_boundary).length,
    open_conflicts: openConflicts,
    regions,
    districts,
  };

  return c.json({ farmers, summary });
});

reportRoutes.get("/conflicts", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const parsed = parseFilters(c);
  if ("error" in parsed) {
    return c.json({ error: parsed.error }, 400);
  }

  const status = c.req.query("status") || "open";
  const { where, params } = buildWhereClause(parsed.filters!, actorResult);

  const farmerIdsResult = await query<{ id: string }>(
    `SELECT f.id FROM farmers f WHERE ${where}`,
    params
  );
  const farmerIds = farmerIdsResult.rows.map((row) => row.id);

  if (farmerIds.length === 0) {
    return c.json({ conflicts: [] });
  }

  const result = await query(
    `SELECT cf.*,
       COALESCE(fe.full_name, pf.full_name) AS farmer_name,
       COALESCE(fe.id, pf.id) AS farmer_id
     FROM conflict_flags cf
     LEFT JOIN farmers fe ON fe.id = cf.entity_id AND cf.entity_type = 'farmer'
     LEFT JOIN farm_plots fp ON fp.id = cf.entity_id AND cf.entity_type = 'farm_plot'
     LEFT JOIN farmers pf ON pf.id = fp.farmer_id
     WHERE cf.status = $2
       AND (
         (cf.entity_type = 'farmer' AND cf.entity_id = ANY($1::uuid[]))
         OR (cf.entity_type = 'farm_plot' AND fp.farmer_id = ANY($1::uuid[]))
       )
     ORDER BY cf.created_at DESC`,
    [farmerIds, status]
  );

  return c.json({ conflicts: result.rows });
});

reportRoutes.get("/filter-options", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const scope = farmerScopeClause(actorResult, "f", 1);
  const where = scope.sql === "1=1" ? "1=1" : scope.sql;
  const params = scope.params;

  const [regions, districts, commodities] = await Promise.all([
    query<{ region: string }>(
      `SELECT DISTINCT region FROM farmers f WHERE ${where} AND region IS NOT NULL ORDER BY region`,
      params
    ),
    query<{ district: string }>(
      `SELECT DISTINCT district FROM farmers f WHERE ${where} AND district IS NOT NULL ORDER BY district`,
      params
    ),
    query<{ commodity: string }>(
      `SELECT DISTINCT unnest(primary_crops) AS commodity FROM farmers f WHERE ${where} ORDER BY commodity`,
      params
    ),
  ]);

  return c.json({
    regions: regions.rows.map((r) => r.region),
    districts: districts.rows.map((d) => d.district),
    commodities: commodities.rows.map((row) => row.commodity),
  });
});
