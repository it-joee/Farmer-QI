import type { Waybill } from "@farmeriq/shared";
import type { WaybillConflictInput } from "./waybill-conflicts.js";
import { query } from "../db.js";
import { createConflictFlag } from "./conflicts.js";

export type AiCheckEntityType = "waybill" | "farmer" | "aggregator";

export interface AiDataIssue {
  severity: "warning" | "error";
  title: string;
  message: string;
  matching_id?: string | null;
  field?: string | null;
}

export interface AiDataCheckConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
}

export interface AiDataCheckResult {
  enabled: boolean;
  issues: AiDataIssue[];
}

const GEMINI_TIMEOUT_MS = 6000;

export function getAiDataCheckConfig(): AiDataCheckConfig {
  const flag = (process.env.AI_DATA_CHECK_ENABLED ?? "").trim().toLowerCase();
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  const model = (process.env.GEMINI_MODEL ?? "").trim();

  return {
    enabled: flag === "true" && apiKey.length > 0 && model.length > 0,
    apiKey,
    model,
  };
}

function buildPrompt(
  entityType: AiCheckEntityType,
  record: Record<string, unknown>,
  candidates: Record<string, unknown>[]
): string {
  const waybillRules =
    entityType === "waybill"
      ? [
          `Domain rules for commodity waybills:`,
          `- NORMAL (do NOT flag): Multiple trucks on the same day sharing the same aggregator/supplier, buyer, loading/discharge location, product, bag count, and weight (e.g., 3+ trucks of 50,000 kg from one supplier in a day is standard).`,
          `- NORMAL (do NOT flag): The same truck_number appearing on DIFFERENT issued_date values (trucks make repeat trips over days/weeks).`,
          `- NORMAL (do NOT flag): Different trucks on the same day having drivers with the same or similar common names (e.g. "Mohammed" vs "Mohammed Ali") when truck_number and driver_phone are different.`,
          `- FLAG: Duplicate or lookalike waybill_number across any date (e.g. O/0, I/1, formatting variants).`,
          `- FLAG: Same or lookalike truck_number on the SAME issued_date (a long-haul truck cannot make two trips on the same day).`,
          `- FLAG: Same or slightly mistyped driver_phone on the SAME issued_date across different waybills (one driver cannot drive two trucks on the same day).`,
          `- FLAG: Obvious weight discrepancies or impossible values.`,
        ]
      : [];

  return [
    `You are a data-quality and duplicate-detection auditor for an agricultural supply-chain system (FarmerIQ).`,
    `Inspect the target ${entityType} record against existing ${entityType} records in the database.`,
    `Flag ONLY high-confidence issues such as:`,
    `- Fuzzy duplicates or formatting variants (e.g., truck plate "GW-213-GH" vs "GW 213 GH" or lookalike O/0, I/1, S/5, B/8 characters)`,
    `- Swapped or slightly misspelled phone numbers, Ghana Card IDs, or waybill numbers`,
    `- Obvious data anomalies (e.g., impossible weights, mismatched units, or identical dispatch details under a slightly altered waybill number)`,
    ...waybillRules,
    `Do NOT flag normal, distinct records or minor harmless differences.`,
    `Return strict JSON with shape: { "issues": [ { "severity": "warning" | "error", "title": string, "message": string, "matching_id": string | null, "field": string | null } ] }.`,
    `If no issues are found, return { "issues": [] }.`,
    `Target ${entityType}:`,
    JSON.stringify(record),
    `Existing ${entityType} candidates:`,
    JSON.stringify(candidates),
  ].join("\n");
}

function parseIssues(rawText: string): AiDataIssue[] {
  const parsed = JSON.parse(rawText) as { issues?: unknown };
  if (!parsed || !Array.isArray(parsed.issues)) return [];

  const issues: AiDataIssue[] = [];
  for (const item of parsed.issues) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const message = typeof obj.message === "string" ? obj.message.trim() : "";
    if (!title || !message) continue;

    issues.push({
      severity: obj.severity === "error" ? "error" : "warning",
      title,
      message,
      matching_id: typeof obj.matching_id === "string" ? obj.matching_id : null,
      field: typeof obj.field === "string" ? obj.field : null,
    });
  }
  return issues;
}

export async function runAiDataCheck(
  entityType: AiCheckEntityType,
  record: Record<string, unknown>,
  candidates: Record<string, unknown>[]
): Promise<AiDataCheckResult> {
  const config = getAiDataCheckConfig();
  if (!config.enabled) {
    return { enabled: false, issues: [] };
  }

  if (candidates.length === 0) {
    return { enabled: true, issues: [] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      config.model
    )}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(entityType, record, candidates) }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      console.warn(`AI data check failed (${response.status} ${response.statusText})`);
      return { enabled: true, issues: [] };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { enabled: true, issues: [] };

    return { enabled: true, issues: parseIssues(text) };
  } catch (err) {
    console.warn("AI data check error:", err);
    return { enabled: true, issues: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function persistAiFlags(
  entityType: AiCheckEntityType,
  entityId: string,
  issues: AiDataIssue[]
) {
  await query(
    `UPDATE conflict_flags
     SET status = 'resolved', resolved_at = now(), reason = 'Superseded by latest AI check'
     WHERE entity_type = $1 AND entity_id = $2 AND flag_type = 'ai_data_check' AND status = 'open'`,
    [entityType, entityId]
  );

  for (const issue of issues) {
    await createConflictFlag({
      entityType,
      entityId,
      flagType: "ai_data_check",
      details: {
        severity: issue.severity,
        title: issue.title,
        message: issue.message,
        field: issue.field ?? null,
        matching_id: issue.matching_id ?? null,
        ...(entityType === "farmer" && issue.matching_id
          ? { matching_farmer_id: issue.matching_id }
          : {}),
        ...(entityType === "waybill" && issue.matching_id
          ? { matching_waybill_id: issue.matching_id }
          : {}),
      },
    });
  }
}

export async function runAiWaybillCheck(
  waybill: (WaybillConflictInput & { id?: string }) | Waybill,
  persistFlags = true
): Promise<AiDataIssue[]> {
  if (!getAiDataCheckConfig().enabled) return [];

  const excludeId = "id" in waybill ? waybill.id : undefined;
  const params: unknown[] = [waybill.issued_date, waybill.buyer_name ?? null, waybill.truck_number ?? null];
  let excludeClause = "";
  if (excludeId) {
    params.push(excludeId);
    excludeClause = `AND id <> $${params.length}`;
  }

  const { rows: candidates } = await query<Record<string, unknown>>(
    `SELECT id, waybill_number, issued_date, buyer_name, aggregator_name,
            loading_location, discharge_location, product_name,
            weight_kg, received_weight_kg, bag_count, truck_number, driver_name, driver_phone
     FROM waybills
     WHERE deleted_at IS NULL
       ${excludeClause}
       AND (
         issued_date BETWEEN ($1::date - INTERVAL '7 days') AND ($1::date + INTERVAL '7 days')
         OR ($2::text IS NOT NULL AND LOWER(buyer_name) = LOWER($2))
         OR ($3::text IS NOT NULL AND LOWER(truck_number) = LOWER($3))
       )
     ORDER BY issued_date DESC
     LIMIT 15`,
    params
  );

  const { issues } = await runAiDataCheck(
    "waybill",
    {
      waybill_number: waybill.waybill_number,
      issued_date: waybill.issued_date,
      buyer_name: waybill.buyer_name,
      aggregator_name: waybill.aggregator_name,
      loading_location: waybill.loading_location,
      discharge_location: waybill.discharge_location,
      product_name: waybill.product_name,
      bag_count: waybill.bag_count,
      weight_kg: waybill.weight_kg,
      received_weight_kg: waybill.received_weight_kg,
      truck_number: waybill.truck_number,
      driver_name: waybill.driver_name,
      driver_phone: waybill.driver_phone,
    },
    candidates
  );

  if (persistFlags && excludeId) {
    await persistAiFlags("waybill", excludeId, issues);
  }

  return issues;
}

export async function runAiFarmerCheck(
  farmerId: string,
  profile: {
    full_name: string;
    community: string;
    ghana_card?: string | null;
    phone?: string | null;
  }
): Promise<AiDataIssue[]> {
  if (!getAiDataCheckConfig().enabled) return [];

  const firstToken = profile.full_name.trim().split(/\s+/)[0] ?? "";
  const { rows: candidates } = await query<Record<string, unknown>>(
    `SELECT id, full_name, community, ghana_card, phone, gender
     FROM farmers
     WHERE deleted_at IS NULL
       AND id <> $1
       AND (
         LOWER(community) = LOWER($2)
         OR ($3::text <> '' AND full_name ILIKE $3)
       )
     ORDER BY created_at DESC
     LIMIT 15`,
    [farmerId, profile.community, firstToken ? `%${firstToken}%` : ""]
  );

  const { issues } = await runAiDataCheck(
    "farmer",
    { id: farmerId, ...profile },
    candidates
  );

  await persistAiFlags("farmer", farmerId, issues);
  return issues;
}

export async function runAiAggregatorCheck(
  aggregator: Record<string, unknown>
): Promise<AiDataIssue[]> {
  if (!getAiDataCheckConfig().enabled) return [];

  const aggregatorId = typeof aggregator.id === "string" ? aggregator.id : "";
  const name = typeof aggregator.name === "string" ? aggregator.name : "";
  if (!aggregatorId || !name) return [];

  const firstToken = name.trim().split(/\s+/)[0] ?? "";
  const { rows: candidates } = await query<Record<string, unknown>>(
    `SELECT id, name, phone, ghana_card, community, district, region, business_name
     FROM aggregators
     WHERE deleted_at IS NULL
       AND id <> $1
       AND (
         ($2::text IS NOT NULL AND LOWER(community) = LOWER($2))
         OR ($3::text <> '' AND name ILIKE $3)
         OR ($4::text IS NOT NULL AND phone = $4)
       )
     ORDER BY created_at DESC
     LIMIT 15`,
    [
      aggregatorId,
      typeof aggregator.community === "string" ? aggregator.community : null,
      firstToken ? `%${firstToken}%` : "",
      typeof aggregator.phone === "string" ? aggregator.phone : null,
    ]
  );

  const { issues } = await runAiDataCheck("aggregator", aggregator, candidates);
  await persistAiFlags("aggregator", aggregatorId, issues);
  return issues;
}
