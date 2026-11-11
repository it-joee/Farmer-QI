/**
 * One-time backfill: load the consolidated JNI AGRI farmer workbook into `farmers`.
 *
 * Dry run (default, writes nothing, produces reports):
 *   npx tsx scripts/import-farmers-sheet.ts --user-email you@example.com
 *
 * Apply:
 *   npx tsx scripts/import-farmers-sheet.ts --user-email you@example.com --apply
 *
 * Options:
 *   --file <path>        default ../web/public/sheet/JNI_AGRI_Consolidated_Farmer_Database.xlsx
 *   --sheet <name>       default "Unique Farmer Roster"
 *   --user-email <email> REQUIRED. Existing user recorded as creator (created_by) and source of office_id.
 *   --assume-blank-id-is-ghana-card
 *                        Treat 10-digit ID numbers with no ID Type (Cohort 5) as Ghana Cards.
 *   --apply              Actually insert. Without it nothing is written.
 *
 * Safe to re-run: every row gets a stable client_local_id ("sheet:jni-agri:<No.>"), and rows that
 * already exist (same id, same Ghana Card, or same name + phone) are skipped.
 */
import "../src/load-env.js";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { normalizePhone } from "@farmeriq/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
const flag = (name: string) => argv.includes(`--${name}`);

const FILE = path.resolve(
  arg("file") ?? path.join(__dirname, "../../web/public/sheet/JNI_AGRI_Consolidated_Farmer_Database.xlsx")
);
const SHEET = arg("sheet") ?? "Unique Farmer Roster";
const USER_EMAIL = arg("user-email");
const APPLY = flag("apply");
const ASSUME_BLANK_ID_IS_CARD = flag("assume-blank-id-is-ghana-card");
const BATCH_SIZE = 500;
const SOURCE_KEY = "jni-agri";

// ---------------------------------------------------------------- minimal xlsx reader (no deps)
function readZipEntries(buf: Buffer): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid .xlsx (zip directory not found)");
  const total = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOff = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
    ptr += 46 + nameLen + extraLen + commentLen;
    const dataStart = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
    const raw = buf.subarray(dataStart, dataStart + compSize);
    out.set(name, method === 0 ? raw : zlib.inflateRawSync(raw));
  }
  return out;
}

function xmlDecode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

function textOf(xml: string): string {
  const parts: string[] = [];
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) parts.push(m[1]);
  return xmlDecode(parts.join(""));
}

function colIndex(ref: string): number {
  const letters = ref.replace(/[^A-Za-z]/g, "").toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function readSheetRows(file: string, sheetName: string): string[][] {
  const entries = readZipEntries(fs.readFileSync(file));
  const get = (n: string) => entries.get(n)?.toString("utf8");

  const shared: string[] = [];
  const ss = get("xl/sharedStrings.xml");
  if (ss) for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));

  const rels = new Map<string, string>();
  for (const m of (get("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/\bId="([^"]*)"/)?.[1];
    const target = m[0].match(/\bTarget="([^"]*)"/)?.[1];
    if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
  }

  let sheetPath: string | undefined;
  const names: string[] = [];
  for (const m of (get("xl/workbook.xml") ?? "").matchAll(/<sheet\b[^>]*>/g)) {
    const name = xmlDecode(m[0].match(/\bname="([^"]*)"/)?.[1] ?? "");
    const rid = m[0].match(/\br:id="([^"]*)"/)?.[1] ?? "";
    names.push(name);
    if (name === sheetName) sheetPath = rels.get(rid);
  }
  if (!sheetPath) throw new Error(`Sheet "${sheetName}" not found. Available: ${names.join(", ")}`);
  const xml = get(sheetPath);
  if (!xml) throw new Error(`Worksheet XML missing: ${sheetPath}`);

  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const c of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const inner = c[2] ?? "";
      const idx = colIndex(attrs.match(/\br="([^"]*)"/)?.[1] ?? "");
      const type = attrs.match(/\bt="([^"]*)"/)?.[1] ?? "";
      let value = "";
      if (type === "inlineStr") value = textOf(inner);
      else {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
        value = type === "s" ? (shared[Number(v)] ?? "") : xmlDecode(v);
      }
      while (cells.length < idx) cells.push("");
      cells[idx] = value.trim();
    }
    rows.push(cells);
  }
  return rows;
}

// ---------------------------------------------------------------- cleaning rules
const COMMODITY_SYNONYMS: Record<string, string> = {
  shea: "Shea", "shea nut": "Shea", "shea nuts": "Shea", sheanut: "Shea",
  cashew: "Cashew", "cashew nut": "Cashew", "cashew nuts": "Cashew",
  sorghum: "Sorghum", "guinea corn": "Sorghum",
  soya: "Soya", soy: "Soya", soybean: "Soya", soybeans: "Soya", soyabean: "Soya", soyabeans: "Soya",
  "soya bean": "Soya", "soya beans": "Soya", "soy bean": "Soya", "soy beans": "Soya",
  sesame: "Sesame", coffee: "Coffee", cocoa: "Cocoa", cacao: "Cocoa", maize: "Maize", corn: "Maize",
};
const CHAIN_TO_CROP: Record<string, string> = {
  "soya beans": "Soya", sesame: "Sesame", shea: "Shea", cashew: "Cashew",
};

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

function parseCrops(recorded: string, chain: string): string[] {
  const out: string[] = [];
  const add = (c: string) => {
    if (c && !out.includes(c)) out.push(c);
  };
  for (const part of recorded.split(/[,;/|&]+|\band\b/i).map((p) => p.trim()).filter(Boolean)) {
    const lower = part.toLowerCase().replace(/\s+/g, " ");
    add(COMMODITY_SYNONYMS[lower] ?? titleCase(part));
  }
  if (out.length === 0) {
    const fromChain = CHAIN_TO_CROP[chain.trim().toLowerCase()];
    if (fromChain) add(fromChain);
  }
  return out;
}

function normalizeGender(v: string): string {
  const l = v.trim().toLowerCase();
  if (l.startsWith("f")) return "female";
  if (l.startsWith("m")) return "male";
  return "";
}

function normalizePhoneValue(raw: string): string {
  const first = raw.split(/[/,;]/)[0]?.trim() ?? "";
  const digits = first.replace(/\D/g, "");
  if (digits.length >= 9 && digits.length <= 13) return normalizePhone(first);
  return "";
}

/** GHA-7287561343, GHA7287561343, 7287561343 -> GHA-728756134-3. Returns "" if not card-shaped. */
function formatGhanaCard(raw: string): string {
  const compact = raw.toUpperCase().replace(/[\s-]/g, "");
  const m = compact.match(/^(?:GHA)?(\d{10})$/);
  return m ? `GHA-${m[1].slice(0, 9)}-${m[1].slice(9)}` : "";
}

function parseNotes(notes: string): { officer?: string; registered?: string } {
  const officer = notes.match(/Officer:\s*([^;]+)/i)?.[1]?.trim();
  const reg = notes.match(/Reg:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  return { officer, registered: reg };
}

// ---------------------------------------------------------------- build candidate rows
interface Candidate {
  sourceNo: string;
  cohort: string;
  full_name: string;
  community: string;
  region: string | null;
  district: string | null;
  gender: string | null;
  age: number | null;
  phone: string | null;
  ghana_card: string | null;
  primary_crops: string[];
  created_at: string | null;
  clientLocalId: string;
  metadata: Record<string, unknown>;
}
interface Skipped {
  sourceNo: string;
  cohort: string;
  name: string;
  phone: string;
  community: string;
  reason: string;
}

function headerKey(h: string): string {
  return h.replace(/\s+/g, " ").trim().toLowerCase();
}

function buildCandidates(rows: string[][]) {
  const headerIdx = rows.findIndex((r) => r.some((c) => headerKey(c) === "full name"));
  if (headerIdx < 0) throw new Error('Could not find a header row containing "Full Name"');
  const col = new Map<string, number>();
  rows[headerIdx].forEach((h, i) => col.set(headerKey(h), i));
  const g = (r: string[], name: string) => (r[col.get(name) ?? -1] ?? "").trim();

  const candidates: Candidate[] = [];
  const skipped: Skipped[] = [];
  const notes = { cardAssumed: 0, cardMovedToMetadata: 0, cardDuplicateInFile: 0, ageOutOfRange: 0 };
  const seenCards = new Set<string>();

  for (const r of rows.slice(headerIdx + 1)) {
    if (!r.some(Boolean)) continue;
    const sourceNo = g(r, "no.");
    const cohort = g(r, "source batch");
    const name = g(r, "full name").replace(/\s+/g, " ");
    const community = g(r, "community");
    const phone = normalizePhoneValue(g(r, "phone"));

    if (!sourceNo || /^total/i.test(sourceNo)) continue;
    if (!name) {
      skipped.push({ sourceNo, cohort, name, phone, community, reason: "Missing full name" });
      continue;
    }

    // ID: only a real Ghana Card goes into ghana_card; everything else is preserved in metadata.
    const idType = g(r, "id type");
    const idRaw = g(r, "id number");
    let card = "";
    if (idRaw) {
      const typeIsCard = /ghana\s*card/i.test(idType);
      const looksCard = /^GHA/i.test(idRaw);
      const blankTypeAssumed = !idType && ASSUME_BLANK_ID_IS_CARD;
      if (typeIsCard || looksCard || blankTypeAssumed) {
        card = formatGhanaCard(idRaw);
        if (card && blankTypeAssumed && !typeIsCard && !looksCard) notes.cardAssumed++;
      }
      if (!card) notes.cardMovedToMetadata++;
    }
    let cardDuplicate = false;
    if (card) {
      if (seenCards.has(card)) {
        cardDuplicate = true;
        notes.cardDuplicateInFile++;
        card = "";
      } else seenCards.add(card);
    }

    let age: number | null = null;
    const ageNum = parseInt(g(r, "age"), 10);
    if (Number.isFinite(ageNum)) {
      if (ageNum >= 1 && ageNum <= 120) age = ageNum;
      else notes.ageOutOfRange++;
    }

    const noteText = g(r, "notes");
    const { officer, registered } = parseNotes(noteText);
    const acres = parseFloat(g(r, "acres"));

    const metadata: Record<string, unknown> = {
      imported_from_sheet: true,
      import_source: SOURCE_KEY,
      source_sheet: SHEET,
      source_no: sourceNo,
      source_batch: cohort || undefined,
      acres: Number.isFinite(acres) ? acres : undefined,
      group_vsla: g(r, "group / vsla") || undefined,
      id_type: idType || undefined,
      id_number_raw: idRaw || undefined,
      id_number_duplicate_in_file: cardDuplicate || undefined,
      value_chain: g(r, "jni agri value chain") || undefined,
      recorded_crop: g(r, "recorded crop") || undefined,
      enumerator: officer,
      registered_on: registered,
      source_notes: noteText || undefined,
      possible_duplicate: g(r, "possible duplicate") || undefined,
    };
    for (const k of Object.keys(metadata)) if (metadata[k] === undefined) delete metadata[k];

    const clientLocalId = `sheet:${SOURCE_KEY}:${sourceNo}`;
    metadata.client_local_id = clientLocalId;

    candidates.push({
      sourceNo,
      cohort,
      full_name: name,
      community,
      region: g(r, "region") || null,
      district: g(r, "district") || null,
      gender: normalizeGender(g(r, "gender")) || null,
      age,
      phone: phone || null,
      ghana_card: card || null,
      primary_crops: parseCrops(g(r, "recorded crop"), g(r, "jni agri value chain")),
      created_at: registered ? `${registered}T12:00:00Z` : null,
      clientLocalId,
      metadata,
    });
  }
  return { candidates, skipped, notes };
}

// ---------------------------------------------------------------- reports
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeCsv(file: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  fs.writeFileSync(file, [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n"));
}

function pct(n: number, total: number) {
  return total ? `${((n / total) * 100).toFixed(1)}%` : "0%";
}

// ---------------------------------------------------------------- main
async function main() {
  if (!USER_EMAIL) {
    console.error("Missing --user-email <email> (existing user to record as creator).");
    process.exit(1);
  }
  console.log(`Mode:   ${APPLY ? "APPLY (will write to the database)" : "DRY RUN (no writes)"}`);
  console.log(`File:   ${FILE}`);
  console.log(`Sheet:  ${SHEET}\n`);

  const rows = readSheetRows(FILE, SHEET);
  const { candidates, skipped, notes } = buildCandidates(rows);
  console.log(`Read ${rows.length} rows -> ${candidates.length} valid farmers, ${skipped.length} skipped (no name).`);

  const { query, pool } = await import("../src/db.js");

  const userRes = await query<{ id: string; office_id: string | null; role: string; full_name: string }>(
    "SELECT id, office_id, role, full_name FROM users WHERE lower(email) = lower($1)",
    [USER_EMAIL]
  );
  const found = userRes.rows[0];
  if (!found) {
    if (APPLY) {
      console.error(`No user found with email ${USER_EMAIL}.`);
      process.exit(1);
    }
    console.warn(`WARNING: no user found with email ${USER_EMAIL} (fine for a dry run, required for --apply).`);
  }
  const user = found ?? { id: "", office_id: null, role: "?", full_name: "(none)" };
  console.log(`Creator: ${user.full_name} (${user.role}), office_id=${user.office_id ?? "none"}`);

  // Existing farmers, for idempotency + duplicate protection.
  const existing = await query<{ ghana_card: string | null; full_name: string; phone: string | null; client_local_id: string | null; reference_id: string }>(
    `SELECT ghana_card, full_name, phone, reference_id, metadata->>'client_local_id' AS client_local_id
     FROM farmers WHERE deleted_at IS NULL`
  );
  const existingIds = new Set(existing.rows.map((r) => r.client_local_id).filter(Boolean) as string[]);
  const existingCards = new Set(existing.rows.map((r) => r.ghana_card).filter(Boolean) as string[]);
  const nameKey = (n: string, p: string | null) => `${n.trim().toLowerCase().replace(/\s+/g, " ")}|${p ?? ""}`;
  const existingNamePhone = new Set(
    existing.rows.filter((r) => r.phone).map((r) => nameKey(r.full_name, normalizePhone(r.phone!)))
  );
  const usedRefs = new Set(existing.rows.map((r) => r.reference_id));
  console.log(`Existing farmers in database: ${existing.rowCount}`);

  const toInsert: Candidate[] = [];
  const duplicates: Record<string, unknown>[] = [];
  for (const c of candidates) {
    let reason = "";
    if (existingIds.has(c.clientLocalId)) reason = "Already imported (same source row)";
    else if (c.ghana_card && existingCards.has(c.ghana_card)) reason = "Ghana Card already in system";
    else if (c.phone && existingNamePhone.has(nameKey(c.full_name, c.phone))) reason = "Same name + phone already in system";
    if (reason) duplicates.push({ source_no: c.sourceNo, cohort: c.cohort, name: c.full_name, phone: c.phone, reason });
    else toInsert.push(c);
  }

  // ---- summary
  const n = toInsert.length;
  const count = (f: (c: Candidate) => boolean) => toInsert.filter(f).length;
  const cropCounts = new Map<string, number>();
  for (const c of toInsert) for (const crop of c.primary_crops) cropCounts.set(crop, (cropCounts.get(crop) ?? 0) + 1);

  console.log("\n================ IMPORT PLAN ================");
  console.log(`To insert:               ${n}`);
  console.log(`Skipped - no name:       ${skipped.length}`);
  console.log(`Skipped - already there: ${duplicates.length}`);
  console.log("\nField coverage among rows to insert:");
  for (const [label, f] of [
    ["phone", (c: Candidate) => !!c.phone],
    ["ghana_card", (c: Candidate) => !!c.ghana_card],
    ["gender", (c: Candidate) => !!c.gender],
    ["age", (c: Candidate) => c.age != null],
    ["commodities", (c: Candidate) => c.primary_crops.length > 0],
    ["community", (c: Candidate) => !!c.community],
  ] as [string, (c: Candidate) => boolean][]) {
    const k = count(f);
    console.log(`  ${label.padEnd(12)} ${String(k).padStart(5)}  (${pct(k, n)})`);
  }
  console.log("\nCommodities:", [...cropCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(", "));
  console.log("\nID handling:");
  console.log(`  non-Ghana-Card IDs kept in metadata only: ${notes.cardMovedToMetadata}`);
  console.log(`  blank-type IDs assumed Ghana Card:        ${notes.cardAssumed}${ASSUME_BLANK_ID_IS_CARD ? "" : "  (off; pass --assume-blank-id-is-ghana-card to enable)"}`);
  console.log(`  Ghana Card repeated within the file:      ${notes.cardDuplicateInFile} (card kept on first row only)`);

  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
  writeCsv(path.join(outDir, "skipped-no-name.csv"), skipped as unknown as Record<string, unknown>[]);
  writeCsv(path.join(outDir, "skipped-already-in-system.csv"), duplicates);
  writeCsv(
    path.join(outDir, "preview-first-50.csv"),
    toInsert.slice(0, 50).map((c) => ({
      source_no: c.sourceNo, cohort: c.cohort, full_name: c.full_name, gender: c.gender, age: c.age, phone: c.phone,
      ghana_card: c.ghana_card, region: c.region, district: c.district, community: c.community,
      primary_crops: c.primary_crops.join("; "), acres: c.metadata.acres, enumerator: c.metadata.enumerator,
    }))
  );
  console.log(`\nReports written to ${outDir}`);

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to insert.");
    await pool.end();
    return;
  }

  // ---- apply
  const batchId = crypto.randomUUID();
  const newRef = () => {
    for (;;) {
      const ref = `jni-fm-${crypto.randomInt(1_000_000_000, 10_000_000_000)}`;
      if (!usedRefs.has(ref)) {
        usedRefs.add(ref);
        return ref;
      }
    }
  };

  let inserted = 0;
  const client = await pool.connect();
  try {
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      await client.query("BEGIN");
      try {
        const values: string[] = [];
        const params: unknown[] = [];
        for (const c of batch) {
          const p = params.length;
          params.push(
            newRef(), c.full_name, c.community, c.ghana_card, c.gender, c.age, c.phone, c.region, c.district,
            c.primary_crops, user.id, user.office_id,
            JSON.stringify({ ...c.metadata, import_batch_id: batchId }),
            c.created_at
          );
          values.push(
            `($${p + 1},$${p + 2},$${p + 3},$${p + 4},$${p + 5},$${p + 6},$${p + 7},$${p + 8},$${p + 9},$${p + 10},$${p + 11},$${p + 12},$${p + 13}::jsonb,COALESCE($${p + 14}::timestamptz, now()))`
          );
        }
        const res = await client.query<{ id: string; created_at: string }>(
          `INSERT INTO farmers (reference_id, full_name, community, ghana_card, gender, age, phone, region, district,
             primary_crops, created_by, office_id, metadata, created_at)
           VALUES ${values.join(",")} RETURNING id, created_at`,
          params
        );
        const ids = res.rows.map((r) => r.id);
        const capturedAt = res.rows.map((r) => r.created_at);
        await client.query(
          `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
           SELECT $1, 'create', 'farmer', id, $3::jsonb FROM unnest($2::uuid[]) AS id`,
          [user.id, ids, JSON.stringify({ source: "sheet-import", batch_id: batchId, sheet: SHEET })]
        );
        await client.query(
          `INSERT INTO submission_records (entity_type, entity_id, agent_id, device_id, captured_at)
           SELECT 'farmer', t.id, $1, 'sheet-import', t.ts FROM unnest($2::uuid[], $3::timestamptz[]) AS t(id, ts)`,
          [user.id, ids, capturedAt]
        );
        await client.query("COMMIT");
        inserted += batch.length;
        console.log(`  inserted ${inserted} / ${toInsert.length}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
  }

  console.log(`\nDone. Inserted ${inserted} farmers. import_batch_id = ${batchId}`);
  console.log(`To undo this batch: DELETE FROM farmers WHERE metadata->>'import_batch_id' = '${batchId}';`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
