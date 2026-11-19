import type {
  Waybill,
  WaybillConflictCheckResponse,
  WaybillConflictWarning,
} from "@farmeriq/shared";
import { query } from "../db.js";
import { createConflictFlag } from "./conflicts.js";
import { runAiWaybillCheck } from "./ai-data-check.js";

export function normalizeWaybillKey(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

interface WaybillMatchRow {
  id: string;
  waybill_number: string;
  issued_date: string;
  buyer_name: string | null;
  loading_location: string | null;
  product_name: string | null;
  truck_number: string | null;
  weight_kg: number | null;
}

export async function findDuplicateWaybillNumber(
  waybillNumber: string,
  excludeWaybillId?: string
): Promise<WaybillMatchRow | null> {
  const trimmed = waybillNumber.trim();
  if (!trimmed) return null;

  const normKey = normalizeWaybillKey(trimmed);

  const result = await query<WaybillMatchRow>(
    `SELECT
       id,
       waybill_number,
       TO_CHAR(issued_date, 'YYYY-MM-DD') AS issued_date,
       buyer_name,
       loading_location,
       product_name,
       truck_number,
       weight_kg::float8 AS weight_kg
     FROM waybills
     WHERE deleted_at IS NULL
       AND ($1::uuid IS NULL OR id != $1)
       AND (
         LOWER(TRIM(waybill_number)) = LOWER($2)
         OR ($3 != '' AND LENGTH($3) >= 2 AND REGEXP_REPLACE(LOWER(TRIM(waybill_number)), '[^a-z0-9]', '', 'g') = $3)
       )
     LIMIT 1`,
    [excludeWaybillId ?? null, trimmed, normKey]
  );

  return result.rows[0] ?? null;
}

export interface WaybillConflictInput {
  waybill_number?: string | null;
  issued_date?: string | null;
  buyer_name?: string | null;
  loading_location?: string | null;
  product_name?: string | null;
  weight_kg?: number | null;
  received_weight_kg?: number | null;
  truck_number?: string | null;
}

export async function checkWaybillInputConflicts(
  input: WaybillConflictInput,
  excludeWaybillId?: string
): Promise<WaybillConflictCheckResponse> {
  let duplicate_number: WaybillConflictWarning | null = null;
  const warnings: WaybillConflictWarning[] = [];

  if (input.waybill_number?.trim()) {
    const dup = await findDuplicateWaybillNumber(input.waybill_number, excludeWaybillId);
    if (dup) {
      duplicate_number = {
        type: "duplicate_waybill_number",
        message: `Waybill #${dup.waybill_number} already exists (issued ${dup.issued_date}${dup.buyer_name ? `, Buyer: ${dup.buyer_name}` : ""}).`,
        matching_waybill_id: dup.id,
        matching_waybill_number: dup.waybill_number,
        matching_date: dup.issued_date,
        matching_buyer: dup.buyer_name,
        matching_truck: dup.truck_number,
        matching_weight_kg: dup.weight_kg,
      };
    }
  }

  const issuedDate = input.issued_date?.trim().slice(0, 10) || "";
  const truckKey = normalizeWaybillKey(input.truck_number);

  // Check same truck + same date (possible duplicate dispatch)
  if (issuedDate && truckKey.length >= 3) {
    const truckMatches = await query<WaybillMatchRow>(
      `SELECT
         id,
         waybill_number,
         TO_CHAR(issued_date, 'YYYY-MM-DD') AS issued_date,
         buyer_name,
         loading_location,
         product_name,
         truck_number,
         weight_kg::float8 AS weight_kg
       FROM waybills
       WHERE deleted_at IS NULL
         AND status != 'cancelled'
         AND ($1::uuid IS NULL OR id != $1)
         AND issued_date = $2::date
         AND REGEXP_REPLACE(LOWER(TRIM(COALESCE(truck_number, ''))), '[^a-z0-9]', '', 'g') = $3
       ORDER BY created_at DESC
       LIMIT 3`,
      [excludeWaybillId ?? null, issuedDate, truckKey]
    );

    for (const match of truckMatches.rows) {
      const sameProduct =
        !input.product_name ||
        !match.product_name ||
        normalizeLabel(input.product_name) === normalizeLabel(match.product_name);
      const sameWeight =
        input.weight_kg == null ||
        match.weight_kg == null ||
        Math.abs(Number(input.weight_kg) - Number(match.weight_kg)) <=
          Math.max(10, Number(match.weight_kg) * 0.02);

      if (sameProduct || sameWeight) {
        warnings.push({
          type: "duplicate_waybill_dispatch",
          message: `Truck ${match.truck_number || input.truck_number} already has Waybill #${match.waybill_number} on ${match.issued_date}${match.weight_kg != null ? ` (${Number(match.weight_kg).toLocaleString("en-US")} kg)` : ""}.`,
          matching_waybill_id: match.id,
          matching_waybill_number: match.waybill_number,
          matching_date: match.issued_date,
          matching_buyer: match.buyer_name,
          matching_truck: match.truck_number,
          matching_weight_kg: match.weight_kg,
        });
        break;
      }
    }
  }

  // Check same date + buyer + loading location + weight (possible duplicate load under different truck/waybill)
  const buyerNorm = normalizeLabel(input.buyer_name);
  const loadingNorm = normalizeLabel(input.loading_location);
  if (
    issuedDate &&
    buyerNorm &&
    loadingNorm &&
    input.weight_kg != null &&
    Number(input.weight_kg) > 0
  ) {
    const loadMatches = await query<WaybillMatchRow>(
      `SELECT
         id,
         waybill_number,
         TO_CHAR(issued_date, 'YYYY-MM-DD') AS issued_date,
         buyer_name,
         loading_location,
         product_name,
         truck_number,
         weight_kg::float8 AS weight_kg
       FROM waybills
       WHERE deleted_at IS NULL
         AND status != 'cancelled'
         AND ($1::uuid IS NULL OR id != $1)
         AND issued_date = $2::date
         AND LOWER(REGEXP_REPLACE(TRIM(COALESCE(buyer_name, '')), '\\s+', ' ', 'g')) = $3
         AND LOWER(REGEXP_REPLACE(TRIM(COALESCE(loading_location, '')), '\\s+', ' ', 'g')) = $4
         AND weight_kg IS NOT NULL
         AND ABS(weight_kg - $5) <= 1
       ORDER BY created_at DESC
       LIMIT 3`,
      [excludeWaybillId ?? null, issuedDate, buyerNorm, loadingNorm, Number(input.weight_kg)]
    );

    for (const match of loadMatches.rows) {
      const alreadyFlagged = warnings.some((w) => w.matching_waybill_id === match.id);
      if (!alreadyFlagged) {
        warnings.push({
          type: "duplicate_waybill_load",
          message: `Same date, buyer (${match.buyer_name}), loading location (${match.loading_location}), and weight (${Number(match.weight_kg).toLocaleString("en-US")} kg) match Waybill #${match.waybill_number}.`,
          matching_waybill_id: match.id,
          matching_waybill_number: match.waybill_number,
          matching_date: match.issued_date,
          matching_buyer: match.buyer_name,
          matching_truck: match.truck_number,
          matching_weight_kg: match.weight_kg,
        });
        break;
      }
    }
  }

  // Check loading vs received weighbridge discrepancy > 5%
  if (
    input.weight_kg != null &&
    input.received_weight_kg != null &&
    Number(input.weight_kg) > 0 &&
    Number(input.received_weight_kg) >= 0
  ) {
    const loaded = Number(input.weight_kg);
    const received = Number(input.received_weight_kg);
    const diffPct = Math.abs(received - loaded) / loaded;
    if (diffPct > 0.05) {
      const diffKg = received - loaded;
      const sign = diffKg > 0 ? "+" : "";
      warnings.push({
        type: "waybill_weight_discrepancy",
        message: `Received weighbridge weight (${received.toLocaleString("en-US")} kg) differs from loading weight (${loaded.toLocaleString("en-US")} kg) by ${sign}${diffKg.toLocaleString("en-US", { maximumFractionDigits: 2 })} kg (${(diffPct * 100).toFixed(1)}%).`,
      });
    }
  }

  const aiIssues = await runAiWaybillCheck({ ...input, id: excludeWaybillId }, false);
  for (const issue of aiIssues) {
    warnings.push({
      type: "ai_data_check",
      message: issue.message,
      matching_waybill_id: issue.matching_id ?? undefined,
    });
  }

  return { duplicate_number, warnings };
}

export async function syncWaybillConflictFlags(waybill: Waybill) {
  const { warnings } = await checkWaybillInputConflicts(
    {
      waybill_number: waybill.waybill_number,
      issued_date: waybill.issued_date,
      buyer_name: waybill.buyer_name,
      loading_location: waybill.loading_location,
      product_name: waybill.product_name,
      weight_kg: waybill.weight_kg,
      received_weight_kg: waybill.received_weight_kg,
      truck_number: waybill.truck_number,
    },
    waybill.id
  );

  const activeTypes = new Set<string>(warnings.map((w) => w.type));

  // Auto-resolve any stale open flags on this waybill that no longer apply
  const managedTypes = [
    "duplicate_waybill_dispatch",
    "duplicate_waybill_load",
    "waybill_weight_discrepancy",
    "ai_data_check",
  ];
  for (const flagType of managedTypes) {
    if (!activeTypes.has(flagType)) {
      await query(
        `UPDATE conflict_flags
         SET status = 'resolved', resolved_at = now(), reason = 'Cleared automatically after update'
         WHERE entity_type = 'waybill' AND entity_id = $1 AND flag_type = $2 AND status = 'open'`,
        [waybill.id, flagType]
      );
    }
  }

  for (const w of warnings) {
    await createConflictFlag({
      entityType: "waybill",
      entityId: waybill.id,
      flagType: w.type,
      details: {
        message: w.message,
        matching_waybill_id: w.matching_waybill_id ?? null,
        matching_waybill_number: w.matching_waybill_number ?? null,
        matching_date: w.matching_date ?? null,
        matching_buyer: w.matching_buyer ?? null,
        matching_truck: w.matching_truck ?? null,
        matching_weight_kg: w.matching_weight_kg ?? null,
      },
    });
  }

  return listWaybillConflicts(waybill.id);
}

export async function listWaybillConflicts(waybillId: string) {
  const result = await query(
    `SELECT *
     FROM conflict_flags
     WHERE entity_type = 'waybill' AND entity_id = $1 AND status = 'open'
     ORDER BY created_at DESC`,
    [waybillId]
  );
  return result.rows;
}
