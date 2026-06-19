import type { ConflictFlagType } from "@farmeriq/shared";
import { normalizePhone, normalizeText, phonesMatch } from "@farmeriq/shared";
import { query } from "../db.js";
interface OverlapMatch {
  plot_id: string;
  farmer_id: string;
  farmer_name: string;
}

export async function findGhanaCardDuplicates(
  ghanaCard: string,
  excludeFarmerId?: string
): Promise<{ id: string; full_name: string }[]> {
  const result = await query<{ id: string; full_name: string }>(
    `SELECT id, full_name FROM farmers
     WHERE ghana_card = $1 AND ghana_card IS NOT NULL AND ($2::uuid IS NULL OR id != $2)`,
    [ghanaCard, excludeFarmerId ?? null]
  );
  return result.rows;
}

export async function findBoundaryOverlaps(
  boundaryGeoJson: string,
  excludeFarmerId: string,
  excludePlotId?: string
): Promise<OverlapMatch[]> {
  const result = await query<OverlapMatch>(
    `SELECT fp.id AS plot_id, fp.farmer_id, f.full_name AS farmer_name
     FROM farm_plots fp
     JOIN farmers f ON f.id = fp.farmer_id
     WHERE fp.boundary IS NOT NULL
       AND fp.farmer_id != $1
       AND ($2::uuid IS NULL OR fp.id != $2)
       AND ST_Area(
         ST_Intersection(
           fp.boundary,
           ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)
         )::geography
       ) > 25`,
    [excludeFarmerId, excludePlotId ?? null, boundaryGeoJson]
  );
  return result.rows;
}

export async function createConflictFlag(input: {
  entityType: string;
  entityId: string;
  flagType: ConflictFlagType;
  details: Record<string, unknown>;
}) {
  const existing = await query(
    `SELECT id FROM conflict_flags
     WHERE entity_type = $1 AND entity_id = $2 AND flag_type = $3 AND status = 'open'`,
    [input.entityType, input.entityId, input.flagType]
  );

  if (existing.rowCount && existing.rowCount > 0) {
    return existing.rows[0];
  }

  const result = await query(
    `INSERT INTO conflict_flags (entity_type, entity_id, flag_type, details)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.entityType, input.entityId, input.flagType, JSON.stringify(input.details)]
  );

  return result.rows[0];
}

export async function checkGhanaCardConflicts(farmerId: string, ghanaCard: string | null | undefined) {
  if (!ghanaCard?.trim()) return [];

  const matches = await findGhanaCardDuplicates(ghanaCard.trim(), farmerId);
  const flags = [];

  for (const match of matches) {
    const flag = await createConflictFlag({
      entityType: "farmer",
      entityId: farmerId,
      flagType: "duplicate_ghana_card",
      details: {
        ghana_card: ghanaCard.trim(),
        matching_farmer_id: match.id,
        matching_farmer_name: match.full_name,
      },
    });
    flags.push(flag);
  }

  return flags;
}

export async function findProfileDuplicates(
  fullName: string,
  community: string,
  phone: string | null | undefined,
  excludeFarmerId?: string
): Promise<{ id: string; full_name: string }[]> {
  const phoneValue = phone?.trim();
  if (!phoneValue || normalizePhone(phoneValue).length < 9) {
    return [];
  }

  const normalizedName = normalizeText(fullName);
  const normalizedCommunity = normalizeText(community);
  if (!normalizedName || !normalizedCommunity) {
    return [];
  }

  const result = await query<{ id: string; full_name: string; phone: string }>(
    `SELECT id, full_name, phone FROM farmers
     WHERE lower(trim(regexp_replace(full_name, '\\s+', ' ', 'g'))) = $1
       AND lower(trim(regexp_replace(community, '\\s+', ' ', 'g'))) = $2
       AND phone IS NOT NULL AND trim(phone) != ''
       AND ($3::uuid IS NULL OR id != $3)`,
    [normalizedName, normalizedCommunity, excludeFarmerId ?? null]
  );

  return result.rows
    .filter((row) => phonesMatch(row.phone, phoneValue))
    .map(({ id, full_name }) => ({ id, full_name }));
}

export async function checkProfileConflicts(
  farmerId: string,
  profile: {
    full_name: string;
    community: string;
    phone?: string | null;
  }
) {
  const matches = await findProfileDuplicates(
    profile.full_name,
    profile.community,
    profile.phone,
    farmerId
  );
  const flags = [];

  for (const match of matches) {
    const flag = await createConflictFlag({
      entityType: "farmer",
      entityId: farmerId,
      flagType: "duplicate_profile",
      details: {
        full_name: profile.full_name.trim(),
        community: profile.community.trim(),
        phone: profile.phone?.trim() ?? null,
        matching_farmer_id: match.id,
        matching_farmer_name: match.full_name,
      },
    });
    flags.push(flag);
  }

  return flags;
}

export async function checkFarmerConflicts(
  farmerId: string,
  profile: {
    full_name: string;
    community: string;
    ghana_card?: string | null;
    phone?: string | null;
  }
) {
  const [ghanaCardFlags, profileFlags] = await Promise.all([
    checkGhanaCardConflicts(farmerId, profile.ghana_card),
    checkProfileConflicts(farmerId, profile),
  ]);

  return [...ghanaCardFlags, ...profileFlags];
}

export async function checkBoundaryConflicts(
  farmerId: string,
  plotId: string,
  boundaryGeoJson: string
) {
  const overlaps = await findBoundaryOverlaps(boundaryGeoJson, farmerId, plotId);
  const flags = [];

  for (const overlap of overlaps) {
    const flag = await createConflictFlag({
      entityType: "farm_plot",
      entityId: plotId,
      flagType: "boundary_overlap",
      details: {
        overlapping_plot_id: overlap.plot_id,
        overlapping_farmer_id: overlap.farmer_id,
        overlapping_farmer_name: overlap.farmer_name,
      },
    });
    flags.push(flag);
  }

  return flags;
}

export async function listFarmerConflicts(farmerId: string) {
  const result = await query(
    `SELECT cf.*
     FROM conflict_flags cf
     WHERE cf.status = 'open'
       AND (
         (cf.entity_type = 'farmer' AND cf.entity_id = $1)
         OR (
           cf.entity_type = 'farm_plot'
           AND cf.entity_id IN (SELECT id FROM farm_plots WHERE farmer_id = $1)
         )
       )
     ORDER BY cf.created_at DESC`,
    [farmerId]
  );

  return result.rows;
}

export async function getConflictFlag(conflictId: string) {
  const result = await query(`SELECT * FROM conflict_flags WHERE id = $1`, [conflictId]);
  return result.rows[0] ?? null;
}

export async function farmerIdForConflict(flag: {
  entity_type: string;
  entity_id: string;
}): Promise<string | null> {
  if (flag.entity_type === "farmer") {
    return flag.entity_id;
  }

  if (flag.entity_type === "farm_plot") {
    const result = await query<{ farmer_id: string }>(
      `SELECT farmer_id FROM farm_plots WHERE id = $1`,
      [flag.entity_id]
    );
    return result.rows[0]?.farmer_id ?? null;
  }

  return null;
}

export async function resolveConflictFlag(input: {
  conflictId: string;
  status: "resolved" | "dismissed";
  resolvedBy: string;
  reason?: string | null;
}) {
  const result = await query(
    `UPDATE conflict_flags
     SET status = $2,
         resolved_by = $3,
         resolved_at = now(),
         reason = $4
     WHERE id = $1 AND status = 'open'
     RETURNING *`,
    [input.conflictId, input.status, input.resolvedBy, input.reason ?? null]
  );

  return result.rows[0] ?? null;
}
