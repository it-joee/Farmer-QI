import { CreateCropCycleRequest } from "@farmeriq/shared";
import { DEV_USER_ID, SKIP_AUTH } from "../config.js";
import { query } from "../db.js";

export async function listCropCyclesHandler(farmerId: string) {
  const farmer = await query("SELECT id FROM farmers WHERE id = $1", [farmerId]);
  if (farmer.rowCount === 0) {
    return { status: 404 as const, body: { error: "Farmer not found" } };
  }

  const result = await query(
    `SELECT * FROM crop_cycles WHERE farmer_id = $1 ORDER BY created_at DESC`,
    [farmerId]
  );

  return { status: 200 as const, body: { crop_cycles: result.rows } };
}

export async function createCropCycleHandler(
  farmerId: string,
  body: unknown,
  createdByFromBody?: string
) {
  const parsed = CreateCropCycleRequest.safeParse(body);
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

  if (data.plot_id) {
    const plot = await query("SELECT id FROM farm_plots WHERE id = $1 AND farmer_id = $2", [
      data.plot_id,
      farmerId,
    ]);
    if (plot.rowCount === 0) {
      return { status: 400 as const, body: { error: "Plot not found for this farmer" } };
    }
  }

  const result = await query(
    `INSERT INTO crop_cycles (
      farmer_id, plot_id, crop_type, variety, season,
      planting_date, expected_harvest, actual_harvest, yield_outcome, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      farmerId,
      data.plot_id ?? null,
      data.crop_type,
      data.variety ?? null,
      data.season,
      data.planting_date || null,
      data.expected_harvest || null,
      data.actual_harvest || null,
      data.yield_outcome ?? null,
      createdBy,
    ]
  );

  const cropCycle = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'create', 'crop_cycle', $2, $3)`,
    [createdBy, cropCycle.id, JSON.stringify(cropCycle)]
  );

  return { status: 201 as const, body: { crop_cycle: cropCycle } };
}
