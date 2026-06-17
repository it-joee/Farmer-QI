import { CreatePlotRequest } from "@farmeriq/shared";
import { DEV_USER_ID, SKIP_AUTH } from "../config.js";
import { checkBoundaryConflicts } from "../lib/conflicts.js";
import { query } from "../db.js";

type PlotRow = {
  id: string;
  farmer_id: string;
  boundary: { type: "Polygon"; coordinates: number[][][] } | null;
  area_acres: string | number | null;
  area_hectares: string | number | null;
  gps_accuracy_notes: unknown;
  created_at: string;
};

function mapPlotRow(row: PlotRow) {
  return {
    id: row.id,
    farmer_id: row.farmer_id,
    boundary: row.boundary,
    area_acres: row.area_acres != null ? Number(row.area_acres) : null,
    area_hectares: row.area_hectares != null ? Number(row.area_hectares) : null,
    gps_accuracy_notes: row.gps_accuracy_notes,
    created_at: row.created_at,
  };
}

export async function listPlotsHandler(farmerId: string) {
  const farmer = await query("SELECT id FROM farmers WHERE id = $1", [farmerId]);
  if (farmer.rowCount === 0) {
    return { status: 404 as const, body: { error: "Farmer not found" } };
  }

  const result = await query<PlotRow>(
    `SELECT id, farmer_id,
      ST_AsGeoJSON(boundary)::json AS boundary,
      area_acres, area_hectares, gps_accuracy_notes, created_at
     FROM farm_plots
     WHERE farmer_id = $1
     ORDER BY created_at DESC`,
    [farmerId]
  );

  return { status: 200 as const, body: { plots: result.rows.map(mapPlotRow) } };
}

export async function createPlotHandler(
  farmerId: string,
  body: unknown,
  createdByFromBody?: string
) {
  const parsed = CreatePlotRequest.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { error: parsed.error.flatten() } };
  }

  const farmer = await query("SELECT id FROM farmers WHERE id = $1", [farmerId]);
  if (farmer.rowCount === 0) {
    return { status: 404 as const, body: { error: "Farmer not found" } };
  }

  const createdBy = SKIP_AUTH ? DEV_USER_ID : createdByFromBody;
  if (!createdBy) {
    return { status: 401 as const, body: { error: "Authentication required" } };
  }

  const data = parsed.data;
  const boundaryJson = JSON.stringify(data.boundary);

  const result = await query<PlotRow>(
    `INSERT INTO farm_plots (
      farmer_id, boundary, area_acres, area_hectares, gps_accuracy_notes, created_by
    ) VALUES (
      $1,
      ST_SetSRID(ST_GeomFromGeoJSON($2), 4326),
      $3,
      $4,
      $5,
      $6
    )
    RETURNING id, farmer_id,
      ST_AsGeoJSON(boundary)::json AS boundary,
      area_acres, area_hectares, gps_accuracy_notes, created_at`,
    [
      farmerId,
      boundaryJson,
      data.area_acres,
      data.area_hectares,
      JSON.stringify(data.gps_accuracy_notes),
      createdBy,
    ]
  );

  const plot = mapPlotRow(result.rows[0]);

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'create', 'farm_plot', $2, $3)`,
    [createdBy, plot.id, JSON.stringify(plot)]
  );

  const conflicts = await checkBoundaryConflicts(farmerId, plot.id, boundaryJson);

  return { status: 201 as const, body: { plot, conflicts } };
}

export async function updatePlotHandler(
  farmerId: string,
  plotId: string,
  body: unknown,
  createdByFromBody?: string
) {
  const parsed = CreatePlotRequest.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { error: parsed.error.flatten() } };
  }

  const createdBy = SKIP_AUTH ? DEV_USER_ID : createdByFromBody;
  if (!createdBy) {
    return { status: 401 as const, body: { error: "Authentication required" } };
  }

  const data = parsed.data;
  const boundaryJson = JSON.stringify(data.boundary);

  const result = await query<PlotRow>(
    `UPDATE farm_plots
     SET boundary = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
         area_acres = $2,
         area_hectares = $3,
         gps_accuracy_notes = $4,
         updated_at = now()
     WHERE id = $5 AND farmer_id = $6
     RETURNING id, farmer_id,
       ST_AsGeoJSON(boundary)::json AS boundary,
       area_acres, area_hectares, gps_accuracy_notes, created_at`,
    [
      boundaryJson,
      data.area_acres,
      data.area_hectares,
      JSON.stringify(data.gps_accuracy_notes),
      plotId,
      farmerId,
    ]
  );

  if (result.rowCount === 0) {
    return { status: 404 as const, body: { error: "Plot not found" } };
  }

  const plot = mapPlotRow(result.rows[0]);

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'update', 'farm_plot', $2, $3)`,
    [createdBy, plot.id, JSON.stringify(plot)]
  );

  const conflicts = await checkBoundaryConflicts(farmerId, plot.id, boundaryJson);

  return { status: 200 as const, body: { plot, conflicts } };
}
