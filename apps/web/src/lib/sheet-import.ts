import {
  COMMODITIES,
  FARMING_DEPENDENCY_OPTIONS,
  GHANA_REGIONS,
  normalizePhone,
} from "@farmeriq/shared";
import { EMPTY_FORM, type FarmerFormData } from "../pages/farmer-form/types";

export type SheetTargetField =
  | "ignore"
  | "full_name"
  | "first_name"
  | "last_name"
  | "gender"
  | "age"
  | "household_size"
  | "farming_dependency"
  | "years_farming"
  | "primary_crops"
  | "region"
  | "district"
  | "community"
  | "digital_address"
  | "farm_address"
  | "ghana_card"
  | "phone"
  | "bank_name"
  | "bank_branch"
  | "bank_account";

export interface SheetFieldOption {
  value: SheetTargetField;
  label: string;
}

export const SHEET_FIELD_OPTIONS: SheetFieldOption[] = [
  { value: "ignore", label: "— Ignore column —" },
  { value: "full_name", label: "Full name" },
  { value: "first_name", label: "First / Given name (combines into Full name)" },
  { value: "last_name", label: "Surname / Last name (combines into Full name)" },
  { value: "gender", label: "Gender" },
  { value: "age", label: "Age (or Birth Year / DOB)" },
  { value: "community", label: "Community / Village" },
  { value: "district", label: "District" },
  { value: "region", label: "Region" },
  { value: "phone", label: "Mobile / Phone" },
  { value: "ghana_card", label: "Ghana Card Number" },
  { value: "primary_crops", label: "Commodities / Crops grown" },
  { value: "household_size", label: "Household size" },
  { value: "years_farming", label: "Years farming" },
  { value: "farming_dependency", label: "Farming dependency" },
  { value: "digital_address", label: "Ghana Post GPS / Digital address" },
  { value: "farm_address", label: "Farm address" },
  { value: "bank_name", label: "Bank name" },
  { value: "bank_branch", label: "Bank branch" },
  { value: "bank_account", label: "Bank account" },
];

export interface ParsedSheetTab {
  name: string;
  rows: string[][];
}

export interface SheetBatchDefaults {
  community: string;
  district: string;
  region: string;
  commodity: string;
}

export interface ExtractedFarmerRow {
  id: string;
  sourceRowNumber: number;
  selected: boolean;
  form: FarmerFormData;
  extractedCount: number;
  missingOptionalLabels: string[];
}

const IGNORE_HEADER_PATTERNS = [
  /^s\s*[/.-]?\s*n$/i,
  /^sr\.?\s*no\.?$/i,
  /^no\.?$/i,
  /^#$/,
  /^index$/i,
  /^row(\s*no)?$/i,
  /^serial(\s*number|\s*no)?$/i,
  /^sign(ature)?$/i,
  /^thumb\s*print$/i,
  /^remark(s)?$/i,
  /^comment(s)?$/i,
  /^note(s)?$/i,
  /^date\s*(registered|captured)?$/i,
  /^timestamp$/i,
];

const HEADER_ALIASES: { field: SheetTargetField; patterns: RegExp[] }[] = [
  {
    field: "full_name",
    patterns: [
      /^full\s*name(s)?$/i,
      /^farmer('?s)?\s*name(s)?$/i,
      /^name\s*of\s*farmer(s)?$/i,
      /^beneficiary(\s*name)?$/i,
      /^participant(\s*name)?$/i,
      /^member(\s*name)?$/i,
      /^producer(\s*name)?$/i,
      /^name(s)?$/i,
    ],
  },
  {
    field: "first_name",
    patterns: [
      /^first\s*name(s)?$/i,
      /^given\s*name(s)?$/i,
      /^other\s*name(s)?$/i,
      /^forename(s)?$/i,
    ],
  },
  {
    field: "last_name",
    patterns: [/^last\s*name(s)?$/i, /^surname(s)?$/i, /^family\s*name(s)?$/i],
  },
  {
    field: "gender",
    patterns: [/^gender$/i, /^sex$/i, /^m\s*\/\s*f$/i, /^male\s*\/\s*female$/i],
  },
  {
    field: "age",
    patterns: [
      /^age(\s*\(.*\))?$/i,
      /^farmer('?s)?\s*age$/i,
      /^yob$/i,
      /^year\s*of\s*birth$/i,
      /^dob$/i,
      /^date\s*of\s*birth$/i,
      /^birth\s*(date|year)$/i,
    ],
  },
  {
    field: "household_size",
    patterns: [
      /^household\s*size$/i,
      /^hh\s*size$/i,
      /^house\s*hold(\s*size|\s*members)?$/i,
      /^family\s*size$/i,
      /^no\.?\s*of\s*dependents$/i,
      /^dependents$/i,
      /^household\s*members$/i,
      /^hh\s*members$/i,
    ],
  },
  {
    field: "years_farming",
    patterns: [
      /^years?\s*(in\s*|of\s*)?farming$/i,
      /^yrs?\s*(in\s*|of\s*)?farming$/i,
      /^farming\s*experience(\s*\(.*\))?$/i,
      /^years?\s*of\s*experience$/i,
      /^experience(\s*in\s*years|\s*\(yrs\))?$/i,
    ],
  },
  {
    field: "farming_dependency",
    patterns: [
      /^farming\s*dependency$/i,
      /^dependency$/i,
      /^farming\s*status$/i,
      /^farmer\s*type$/i,
      /^type\s*of\s*farmer$/i,
      /^engagement(\s*level)?$/i,
      /^full\s*time\s*\/\s*part\s*time$/i,
    ],
  },
  {
    field: "primary_crops",
    patterns: [
      /^commodit(y|ies)(\s*grown|\s*cultivated)?$/i,
      /^primary\s*crops?$/i,
      /^crops?(\s*grown|\s*cultivated|\s*type)?$/i,
      /^main\s*crops?$/i,
      /^major\s*crops?$/i,
      /^produce$/i,
      /^value\s*chain$/i,
    ],
  },
  {
    field: "community",
    patterns: [
      /^community(\s*\/\s*village|\s*name)?$/i,
      /^village(\s*name)?$/i,
      /^town(\s*\/\s*village)?$/i,
      /^locality$/i,
      /^settlement$/i,
      /^society(\s*name)?$/i,
      /^operational\s*area$/i,
    ],
  },
  {
    field: "district",
    patterns: [
      /^district(\s*\/\s*municipal(ity)?)?$/i,
      /^municipal(ity)?$/i,
      /^mmda$/i,
      /^metro(\s*\/\s*municipal)?$/i,
    ],
  },
  {
    field: "region",
    patterns: [/^region(\s*name)?$/i, /^admin(istrative)?\s*region$/i, /^province$/i],
  },
  {
    field: "digital_address",
    patterns: [
      /^digital\s*address$/i,
      /^ghana\s*post(\s*gps)?$/i,
      /^gps\s*address$/i,
      /^post\s*gps$/i,
      /^ghanapost$/i,
    ],
  },
  {
    field: "farm_address",
    patterns: [
      /^farm\s*(address|location)$/i,
      /^physical\s*address$/i,
      /^residential\s*address$/i,
      /^address$/i,
      /^location\s*of\s*farm$/i,
    ],
  },
  {
    field: "ghana_card",
    patterns: [
      /^ghana\s*card(\s*no\.?|\s*number|\s*id)?$/i,
      /^national\s*id(\s*no\.?|\s*number)?$/i,
      /^ecowas\s*card(\s*no\.?)?$/i,
      /^nia(\s*no\.?|\s*number|\s*card)?$/i,
      /^id\s*(card\s*)?(no\.?|number)$/i,
      /^card\s*(no\.?|number)$/i,
    ],
  },
  {
    field: "phone",
    patterns: [
      /^phone(\s*no\.?|\s*number)?$/i,
      /^mobile(\s*no\.?|\s*number)?$/i,
      /^tel(ephone)?(\s*no\.?|\s*number)?$/i,
      /^contact(\s*no\.?|\s*number)?$/i,
      /^cell(\s*phone|\s*no\.?)?$/i,
      /^momo(\s*no\.?|\s*number)?$/i,
      /^whatsapp(\s*no\.?)?$/i,
    ],
  },
  {
    field: "bank_name",
    patterns: [/^bank(\s*name)?$/i, /^name\s*of\s*bank$/i, /^financial\s*institution$/i],
  },
  {
    field: "bank_branch",
    patterns: [/^bank\s*branch$/i, /^branch(\s*name)?$/i],
  },
  {
    field: "bank_account",
    patterns: [
      /^bank\s*account(\s*no\.?|\s*number)?$/i,
      /^account(\s*no\.?|\s*number)$/i,
      /^acct(\s*no\.?|\s*number)?$/i,
    ],
  },
];

function cleanHeader(raw: string): string {
  return raw
    .replace(/[\r\n]+/g, " ")
    .replace(/[*_#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchHeaderToField(headerText: string, sampleValues: string[] = []): SheetTargetField {
  const cleaned = cleanHeader(headerText);
  if (!cleaned) return "ignore";

  for (const rx of IGNORE_HEADER_PATTERNS) {
    if (rx.test(cleaned)) return "ignore";
  }

  for (const entry of HEADER_ALIASES) {
    for (const rx of entry.patterns) {
      if (rx.test(cleaned)) {
        return entry.field;
      }
    }
  }

  // Substring fallback for longer descriptive headers (e.g. "1. Name of Farmer (Full)")
  const lower = cleaned.toLowerCase();
  if (lower.includes("ghana card") || lower.includes("national id") || lower.includes("nia")) {
    return "ghana_card";
  }
  if (
    lower.includes("farmer name") ||
    lower.includes("name of farmer") ||
    lower.includes("full name") ||
    lower.includes("beneficiary name")
  ) {
    return "full_name";
  }
  if (lower.includes("first name") || lower.includes("given name") || lower.includes("other name")) {
    return "first_name";
  }
  if (lower.includes("surname") || lower.includes("last name")) {
    return "last_name";
  }
  if (
    lower.includes("phone") ||
    lower.includes("mobile") ||
    lower.includes("contact") ||
    lower.includes("telephone") ||
    lower.includes("momo")
  ) {
    return "phone";
  }
  if (lower.includes("community") || lower.includes("village") || lower.includes("locality")) {
    return "community";
  }
  if (lower.includes("district") || lower.includes("municipal")) {
    return "district";
  }
  if (lower.includes("region")) {
    return "region";
  }
  if (lower.includes("gender") || lower.includes("sex")) {
    return "gender";
  }
  if (lower.includes("household") || lower.includes("hh size") || lower.includes("family size")) {
    return "household_size";
  }
  if (lower.includes("years farming") || lower.includes("farming experience") || lower.includes("yrs farming")) {
    return "years_farming";
  }
  if (lower.includes("dependency") || lower.includes("full-time") || lower.includes("part-time")) {
    return "farming_dependency";
  }
  if (lower.includes("commodit") || lower.includes("crop")) {
    return "primary_crops";
  }
  if (lower.includes("digital address") || lower.includes("post gps") || lower.includes("gps address")) {
    return "digital_address";
  }
  if (lower.includes("farm address") || lower.includes("farm location")) {
    return "farm_address";
  }
  if (lower.includes("bank account") || lower.includes("account no") || lower.includes("account number")) {
    return "bank_account";
  }
  if (lower.includes("bank branch")) {
    return "bank_branch";
  }
  if (lower.includes("bank name") || lower === "bank") {
    return "bank_name";
  }
  if (/\bage\b/.test(lower) || lower.includes("birth")) {
    return "age";
  }

  // Value-based heuristic for ambiguous headers like "ID"
  const nonEmptySamples = sampleValues.map((s) => s.trim()).filter(Boolean).slice(0, 8);
  if (nonEmptySamples.length > 0) {
    if (nonEmptySamples.some((v) => /^GHA-?\d{7,10}/i.test(v))) {
      return "ghana_card";
    }
  }

  return "ignore";
}

export function detectHeaderRowIndex(rows: string[][]): number {
  const maxScan = Math.min(rows.length, 25);
  let bestRow = 0;
  let bestScore = -1;

  for (let r = 0; r < maxScan; r++) {
    const row = rows[r] ?? [];
    const nonEmpty = row.map((c) => c.trim()).filter(Boolean);
    if (nonEmpty.length < 2) continue;

    let matchedFields = 0;
    let ignoreHeaderMatches = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c] ?? "";
      const cleaned = cleanHeader(cell);
      if (!cleaned) continue;
      if (IGNORE_HEADER_PATTERNS.some((rx) => rx.test(cleaned))) {
        ignoreHeaderMatches++;
        continue;
      }
      const field = matchHeaderToField(cell);
      if (field !== "ignore") {
        matchedFields++;
      }
    }

    const score = matchedFields * 10 + ignoreHeaderMatches * 4 + Math.min(nonEmpty.length, 10);
    if (matchedFields >= 1 && score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }

  return bestRow;
}

export function autoMapColumns(rows: string[][], headerRowIndex: number): SheetTargetField[] {
  const headerRow = rows[headerRowIndex] ?? [];
  const dataRows = rows.slice(headerRowIndex + 1, headerRowIndex + 15);
  const colCount = Math.max(
    headerRow.length,
    ...dataRows.map((r) => r.length),
    0
  );

  const usedSingleFields = new Set<SheetTargetField>();
  const mappings: SheetTargetField[] = [];

  for (let c = 0; c < colCount; c++) {
    const header = headerRow[c] ?? "";
    const samples = dataRows.map((r) => r[c] ?? "");
    const candidate = matchHeaderToField(header, samples);

    if (candidate !== "ignore" && usedSingleFields.has(candidate)) {
      mappings.push("ignore");
    } else {
      if (candidate !== "ignore") {
        usedSingleFields.add(candidate);
      }
      mappings.push(candidate);
    }
  }

  return mappings;
}

export function extractPreambleDefaults(
  rows: string[][],
  headerRowIndex: number
): Partial<SheetBatchDefaults> {
  const defaults: Partial<SheetBatchDefaults> = {};
  if (headerRowIndex <= 0) return defaults;

  const kvPatterns: { key: keyof SheetBatchDefaults; regex: RegExp }[] = [
    { key: "community", regex: /^(?:community|village|town|locality|society)\s*[:=-]?\s*(.*)$/i },
    { key: "district", regex: /^(?:district|municipal(?:ity)?|mmda)\s*[:=-]?\s*(.*)$/i },
    { key: "region", regex: /^(?:region)\s*[:=-]?\s*(.*)$/i },
    { key: "commodity", regex: /^(?:commodit(?:y|ies)|crop(?:s)?)\s*[:=-]?\s*(.*)$/i },
  ];

  for (let r = 0; r < headerRowIndex; r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] ?? "").trim();
      if (!cell) continue;

      for (const { key, regex } of kvPatterns) {
        if (defaults[key]) continue;
        const match = cell.match(regex);
        if (match) {
          const inlineVal = match[1]?.trim();
          const nextCellVal = (row[c + 1] ?? "").trim();
          const rawValue = inlineVal || nextCellVal;
          if (rawValue) {
            if (key === "region") {
              defaults.region = normalizeRegionValue(rawValue) || rawValue;
            } else if (key === "commodity") {
              const parsedCrops = parseCommoditiesValue(rawValue);
              defaults.commodity = parsedCrops.primary_crops[0] || "";
            } else {
              defaults[key] = rawValue;
            }
          }
        }
      }
    }
  }

  return defaults;
}

export function normalizeGenderValue(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return "";
  if (v === "m" || v === "male" || v === "man" || v === "boy" || v.startsWith("male")) {
    return "male";
  }
  if (v === "f" || v === "female" || v === "woman" || v === "girl" || v.startsWith("female")) {
    return "female";
  }
  return "";
}

export function normalizeAgeValue(raw: string): string {
  const v = raw.trim();
  if (!v) return "";

  const currentYear = new Date().getFullYear();

  // Check if it looks like a 4-digit birth year (e.g., 1965 - 2012)
  if (/^(19\d{2}|20[0-1]\d)$/.test(v)) {
    const birthYear = parseInt(v, 10);
    const computed = currentYear - birthYear;
    if (computed >= 10 && computed <= 120) {
      return String(computed);
    }
  }

  // Check if it looks like a date string (YYYY-MM-DD or DD/MM/YYYY)
  if (/[-/]/.test(v)) {
    const yearMatch = v.match(/\b(19\d{2}|20[0-1]\d)\b/);
    if (yearMatch) {
      const birthYear = parseInt(yearMatch[1], 10);
      const computed = currentYear - birthYear;
      if (computed >= 10 && computed <= 120) {
        return String(computed);
      }
    }
  }

  // Extract number (e.g. "45 yrs" -> 45)
  const numMatch = v.match(/\d+/);
  if (!numMatch) return "";
  const age = parseInt(numMatch[0], 10);
  if (!Number.isNaN(age) && age >= 1 && age <= 120) {
    return String(age);
  }
  return "";
}

export function normalizePositiveIntValue(raw: string, allowZero = false): string {
  const v = raw.trim();
  if (!v) return "";
  const match = v.match(/\d+/);
  if (!match) return "";
  const num = parseInt(match[0], 10);
  if (Number.isNaN(num)) return "";
  if (allowZero ? num >= 0 : num >= 1) {
    return String(num);
  }
  return "";
}

export function normalizeRegionValue(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/\bregion\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!cleaned) return "";

  for (const region of GHANA_REGIONS) {
    if (region.toLowerCase() === cleaned) {
      return region;
    }
  }

  // Common abbreviations / variations in Ghana field sheets
  if (cleaned === "u/w" || cleaned === "uw" || cleaned.includes("upper west")) return "Upper West";
  if (cleaned === "u/e" || cleaned === "ue" || cleaned.includes("upper east")) return "Upper East";
  if (cleaned === "n/r" || cleaned === "nr" || cleaned === "north") return "Northern";
  if (cleaned === "n/e" || cleaned === "ne" || cleaned.includes("north east")) return "North East";
  if (cleaned === "b/a" || cleaned === "brong ahafo") return "Bono";
  if (cleaned.includes("bono east")) return "Bono East";
  if (cleaned.includes("western north")) return "Western North";
  if (cleaned.includes("greater accra") || cleaned === "accra" || cleaned === "gar") {
    return "Greater Accra";
  }

  for (const region of GHANA_REGIONS) {
    if (cleaned.includes(region.toLowerCase())) {
      return region;
    }
  }

  return "";
}

export function normalizeFarmingDependencyValue(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (!lower) return "";

  for (const option of FARMING_DEPENDENCY_OPTIONS) {
    if (option.toLowerCase() === lower) return option;
  }

  if (lower.includes("full") || lower.includes("main") || lower.includes("primary")) {
    return "Full-time farmer";
  }
  if (lower.includes("part") || lower.includes("secondary")) {
    return "Part-time farmer";
  }
  if (lower.includes("supplement") || lower.includes("side") || lower.includes("additional")) {
    return "Supplemental income";
  }
  return "";
}

const COMMODITY_SYNONYMS: Record<string, string> = {
  shea: "Shea",
  "shea nut": "Shea",
  "shea nuts": "Shea",
  sheanut: "Shea",
  sheanuts: "Shea",
  "shea butter": "Shea",
  cashew: "Cashew",
  "cashew nut": "Cashew",
  "cashew nuts": "Cashew",
  sorghum: "Sorghum",
  "guinea corn": "Sorghum",
  soya: "Soya",
  soy: "Soya",
  soybean: "Soya",
  soybeans: "Soya",
  "soya bean": "Soya",
  "soya beans": "Soya",
  sesame: "Sesame",
  coffee: "Coffee",
  cocoa: "Cocoa",
  cacao: "Cocoa",
  maize: "Maize",
  corn: "Maize",
};

export function parseCommoditiesValue(raw: string): {
  primary_crops: string[];
  other_commodity_enabled: boolean;
  other_commodity: string;
} {
  const parts = raw
    .split(/[,;/|&\n]+|\band\b/i)
    .map((p) => p.trim())
    .filter(Boolean);

  const primarySet = new Set<string>();
  const otherList: string[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase().replace(/\s+/g, " ");
    const mapped =
      COMMODITY_SYNONYMS[lower] ??
      COMMODITIES.find((c) => c.toLowerCase() === lower);
    if (mapped) {
      primarySet.add(mapped);
    } else {
      otherList.push(part);
    }
  }

  return {
    primary_crops: [...primarySet],
    other_commodity_enabled: otherList.length > 0,
    other_commodity: otherList.join(", "),
  };
}

export function normalizePhoneCellValue(raw: string): string {
  let v = raw.trim();
  if (!v) return "";

  // Fix numeric floats from Excel like "244123456.0" or scientific notation
  if (/^\d+\.0+$/.test(v)) {
    v = v.replace(/\.0+$/, "");
  } else if (/^\d+\.\d+e\+\d+$/i.test(v)) {
    const num = Number(v);
    if (Number.isFinite(num)) {
      v = Math.round(num).toString();
    }
  }

  // If multiple phone numbers are separated by "/" or ",", take the first valid one
  const firstPart = v.split(/[/,;]/)[0]?.trim() || v;
  const digits = firstPart.replace(/\D/g, "");
  if (digits.length >= 9 && digits.length <= 13) {
    return normalizePhone(firstPart);
  }
  return firstPart;
}

export function normalizeGhanaCardValue(raw: string): string {
  const v = raw.trim().toUpperCase();
  if (!v) return "";
  const compact = v.replace(/[\s-]/g, "");
  const match = compact.match(/^GHA(\d{9})(\d)$/);
  if (match) {
    return `GHA-${match[1]}-${match[2]}`;
  }
  return v;
}

function isIgnorableTableRow(row: string[], headerRow: string[]): boolean {
  const nonEmpty = row.map((c) => c.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return true;

  // Skip if it repeats the header row (e.g. multi-page table exports)
  let sameAsHeader = 0;
  for (let i = 0; i < Math.min(row.length, headerRow.length); i++) {
    const a = cleanHeader(row[i] ?? "").toLowerCase();
    const b = cleanHeader(headerRow[i] ?? "").toLowerCase();
    if (a && a === b) sameAsHeader++;
  }
  if (sameAsHeader >= 2 && sameAsHeader >= nonEmpty.length * 0.6) {
    return true;
  }

  // Skip summary/footer rows like "Total", "Grand Total", "Prepared by:"
  const firstText = nonEmpty[0]?.toLowerCase() ?? "";
  if (
    /^(grand\s*total|sub\s*total|total|prepared\s*by|verified\s*by|approved\s*by|signature)\b/i.test(
      firstText
    ) &&
    nonEmpty.length <= 3
  ) {
    return true;
  }

  return false;
}

export function summarizeFarmerCompleteness(form: FarmerFormData): {
  extractedCount: number;
  missingOptionalLabels: string[];
} {
  let extractedCount = 0;
  const missing: string[] = [];

  if (form.full_name.trim()) extractedCount++;
  else missing.push("Full name");

  if (form.community.trim()) extractedCount++;
  else missing.push("Community");

  if (form.phone.trim()) extractedCount++;
  else missing.push("Mobile");

  if (form.ghana_card.trim()) extractedCount++;
  else missing.push("Ghana Card");

  if (form.gender.trim()) extractedCount++;
  else missing.push("Gender");

  if (form.age.trim()) extractedCount++;
  else missing.push("Age");

  if (form.region.trim()) extractedCount++;
  else missing.push("Region");

  if (form.district.trim()) extractedCount++;
  else missing.push("District");

  if (form.primary_crops.length > 0 || (form.other_commodity_enabled && form.other_commodity.trim())) {
    extractedCount++;
  } else {
    missing.push("Commodities");
  }

  if (form.household_size.trim()) extractedCount++;
  if (form.years_farming.trim()) extractedCount++;
  if (form.farming_dependency.trim()) extractedCount++;
  if (form.digital_address.trim()) extractedCount++;
  if (form.farm_address.trim()) extractedCount++;
  if (form.bank_name.trim() || form.bank_account.trim()) extractedCount++;

  return {
    extractedCount,
    missingOptionalLabels: missing,
  };
}

export function extractFarmersFromSheet(
  rows: string[][],
  headerRowIndex: number,
  columnMappings: SheetTargetField[],
  defaults: SheetBatchDefaults
): ExtractedFarmerRow[] {
  const headerRow = rows[headerRowIndex] ?? [];
  const extracted: ExtractedFarmerRow[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    if (isIgnorableTableRow(row, headerRow)) continue;

    const form: FarmerFormData = {
      ...EMPTY_FORM,
      primary_crops: [],
    };

    let firstName = "";
    let lastName = "";

    for (let c = 0; c < columnMappings.length; c++) {
      const target = columnMappings[c];
      if (!target || target === "ignore") continue;

      const rawCell = (row[c] ?? "").trim();
      if (!rawCell) continue;

      switch (target) {
        case "full_name":
          form.full_name = rawCell.replace(/\s+/g, " ").trim();
          break;
        case "first_name":
          firstName = rawCell.replace(/\s+/g, " ").trim();
          break;
        case "last_name":
          lastName = rawCell.replace(/\s+/g, " ").trim();
          break;
        case "gender":
          form.gender = normalizeGenderValue(rawCell);
          break;
        case "age":
          form.age = normalizeAgeValue(rawCell);
          break;
        case "household_size":
          form.household_size = normalizePositiveIntValue(rawCell, false);
          break;
        case "years_farming":
          form.years_farming = normalizePositiveIntValue(rawCell, true);
          break;
        case "farming_dependency":
          form.farming_dependency = normalizeFarmingDependencyValue(rawCell);
          break;
        case "primary_crops": {
          const parsedCrops = parseCommoditiesValue(rawCell);
          form.primary_crops = parsedCrops.primary_crops;
          form.other_commodity_enabled = parsedCrops.other_commodity_enabled;
          form.other_commodity = parsedCrops.other_commodity;
          break;
        }
        case "region":
          form.region = normalizeRegionValue(rawCell);
          break;
        case "district":
          form.district = rawCell;
          break;
        case "community":
          form.community = rawCell;
          break;
        case "digital_address":
          form.digital_address = rawCell;
          break;
        case "farm_address":
          form.farm_address = rawCell;
          break;
        case "ghana_card":
          form.ghana_card = normalizeGhanaCardValue(rawCell);
          break;
        case "phone":
          form.phone = normalizePhoneCellValue(rawCell);
          break;
        case "bank_name":
          form.bank_name = rawCell;
          break;
        case "bank_branch":
          form.bank_branch = rawCell;
          break;
        case "bank_account":
          form.bank_account = rawCell;
          form.bank_account_confirm = rawCell;
          break;
      }
    }

    if (!form.full_name && (firstName || lastName)) {
      form.full_name = [firstName, lastName].filter(Boolean).join(" ").trim();
    }

    // Apply batch defaults for missing fields
    if (!form.community && defaults.community.trim()) {
      form.community = defaults.community.trim();
    }
    if (!form.district && defaults.district.trim()) {
      form.district = defaults.district.trim();
    }
    if (!form.region && defaults.region.trim()) {
      form.region = defaults.region.trim();
    }
    if (
      form.primary_crops.length === 0 &&
      !form.other_commodity_enabled &&
      defaults.commodity.trim()
    ) {
      form.primary_crops = [defaults.commodity.trim()];
    }

    const { extractedCount, missingOptionalLabels } = summarizeFarmerCompleteness(form);

    // Skip rows that produced zero mapped fields (e.g., stray row with only a serial number)
    const hasMappedData =
      form.full_name.trim() !== "" ||
      form.phone.trim() !== "" ||
      form.ghana_card.trim() !== "" ||
      (form.community.trim() !== "" && form.community.trim() !== defaults.community.trim());

    if (!hasMappedData) continue;

    extracted.push({
      id: `row-${r + 1}`,
      sourceRowNumber: r + 1,
      selected: Boolean(form.full_name.trim()),
      form,
      extractedCount,
      missingOptionalLabels,
    });
  }

  return extracted;
}

// ---------------------------------------------------------------------------
// CSV / TSV / Delimited Text Parser
// ---------------------------------------------------------------------------

function detectDelimiter(text: string): string {
  const sampleLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 10);

  const candidates = ["\t", ",", ";", "|"];
  let best = ",";
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = sampleLines.map((line) => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (!inQuotes && ch === delim) count++;
      }
      return count;
    });

    const nonZero = counts.filter((c) => c > 0);
    if (nonZero.length === 0) continue;

    const avg = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
    const consistent = nonZero.every((c) => c === nonZero[0]) ? 1.5 : 1;
    const score = avg * consistent * nonZero.length;
    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }

  return best;
}

export function parseDelimitedText(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, ""); // Strip UTF-8 BOM
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (ch === "\r" && next === "\n") {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

// ---------------------------------------------------------------------------
// HTML / XML (.xls) Table Parser
// ---------------------------------------------------------------------------

function parseHtmlOrXmlSpreadsheet(text: string): ParsedSheetTab[] {
  const parser = new DOMParser();

  // Check if it is SpreadsheetML 2003 XML (<Workbook><Worksheet><Table><Row><Cell>)
  if (text.includes("<Worksheet") || text.includes("< Row") || text.includes("<Row")) {
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const worksheets = Array.from(xmlDoc.getElementsByTagName("Worksheet"));
    if (worksheets.length > 0) {
      return worksheets.map((ws, idx) => {
        const name =
          ws.getAttribute("ss:Name") ||
          ws.getAttribute("Name") ||
          `Sheet ${idx + 1}`;
        const rowEls = Array.from(ws.getElementsByTagName("Row"));
        const rows: string[][] = rowEls.map((rowEl) => {
          const cells: string[] = [];
          let colIndex = 0;
          for (const cellEl of Array.from(rowEl.getElementsByTagName("Cell"))) {
            const ssIndex =
              cellEl.getAttribute("ss:Index") || cellEl.getAttribute("Index");
            if (ssIndex) {
              const parsedIdx = parseInt(ssIndex, 10) - 1;
              if (!Number.isNaN(parsedIdx) && parsedIdx >= colIndex) {
                while (colIndex < parsedIdx) {
                  cells.push("");
                  colIndex++;
                }
              }
            }
            const dataEl = cellEl.getElementsByTagName("Data")[0];
            cells.push((dataEl?.textContent ?? cellEl.textContent ?? "").trim());
            colIndex++;
          }
          return cells;
        });
        return { name, rows };
      });
    }
  }

  // Otherwise parse HTML <table>
  const htmlDoc = parser.parseFromString(text, "text/html");
  const tables = Array.from(htmlDoc.querySelectorAll("table"));
  if (tables.length > 0) {
    return tables.map((table, idx) => {
      const rows: string[][] = [];
      for (const tr of Array.from(table.querySelectorAll("tr"))) {
        const cells = Array.from(tr.querySelectorAll("th, td")).map((td) =>
          (td.textContent ?? "").replace(/\s+/g, " ").trim()
        );
        if (cells.some(Boolean)) {
          rows.push(cells);
        }
      }
      return { name: `Table ${idx + 1}`, rows };
    });
  }

  return [{ name: "Sheet 1", rows: parseDelimitedText(text) }];
}

// ---------------------------------------------------------------------------
// Zero-Dependency .xlsx (Office Open XML ZIP) Parser
// ---------------------------------------------------------------------------

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  void writer.write(compressed as unknown as BufferSource);
  void writer.close();
  const response = new Response(ds.readable);
  const ab = await response.arrayBuffer();
  return new Uint8Array(ab);
}

async function unzipXlsxEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder("utf-8");

  // Locate End of Central Directory (EOCD) record (signature 0x06054b50)
  let eocdOffset = -1;
  const minEocdSearch = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minEocdSearch; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid .xlsx file (ZIP directory not found).");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const files = new Map<string, string>();
  let ptr = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) {
      break;
    }

    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fileNameLen));
    ptr += 46 + fileNameLen + extraLen + commentLen;

    if (!fileName.endsWith(".xml") && !fileName.endsWith(".rels")) {
      continue;
    }

    if (
      localHeaderOffset + 30 > bytes.length ||
      view.getUint32(localHeaderOffset, true) !== 0x04034b50
    ) {
      continue;
    }

    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawSlice = bytes.subarray(dataStart, dataStart + compressedSize);

    let uncompressed: Uint8Array;
    if (compressionMethod === 0) {
      uncompressed = rawSlice;
    } else if (compressionMethod === 8) {
      uncompressed = await inflateRawBytes(rawSlice);
    } else {
      continue;
    }

    files.set(fileName.replace(/^\/+/, ""), decoder.decode(uncompressed));
  }

  return files;
}

function columnLettersToIndex(cellRef: string): number {
  const match = cellRef.match(/^\$?([A-Za-z]+)/);
  if (!match) return -1;
  const letters = match[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col - 1;
}

function parseSharedStringsXml(xml: string | undefined): string[] {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const siList = Array.from(doc.getElementsByTagName("si"));
  return siList.map((si) => {
    // Ignore phonetic <rPh> elements if any
    const texts: string[] = [];
    const tNodes = Array.from(si.getElementsByTagName("t"));
    for (const t of tNodes) {
      if (t.parentElement?.tagName === "rPh") continue;
      texts.push(t.textContent ?? "");
    }
    return texts.join("");
  });
}

function parseWorksheetXml(xml: string, sharedStrings: string[]): string[][] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const rowNodes = Array.from(doc.getElementsByTagName("row"));
  const rows: string[][] = [];

  for (const rowNode of rowNodes) {
    const cellNodes = Array.from(rowNode.getElementsByTagName("c"));
    const rowCells: string[] = [];
    let nextCol = 0;

    for (const cell of cellNodes) {
      const ref = cell.getAttribute("r") ?? "";
      const refCol = columnLettersToIndex(ref);
      const colIdx = refCol >= 0 ? refCol : nextCol;

      while (rowCells.length < colIdx) {
        rowCells.push("");
      }

      const cellType = cell.getAttribute("t") ?? "";
      let value = "";

      if (cellType === "inlineStr") {
        const isNode = cell.getElementsByTagName("is")[0];
        const tNodes = isNode
          ? Array.from(isNode.getElementsByTagName("t"))
          : Array.from(cell.getElementsByTagName("t"));
        value = tNodes.map((n) => n.textContent ?? "").join("");
      } else {
        const vNode = cell.getElementsByTagName("v")[0];
        const rawV = vNode?.textContent ?? "";
        if (cellType === "s") {
          const idx = parseInt(rawV, 10);
          value = !Number.isNaN(idx) ? (sharedStrings[idx] ?? "") : "";
        } else if (cellType === "b") {
          value = rawV === "1" ? "Yes" : rawV === "0" ? "No" : rawV;
        } else {
          value = rawV;
        }
      }

      rowCells[colIdx] = value.trim();
      nextCol = colIdx + 1;
    }

    if (rowCells.some((c) => c !== "")) {
      rows.push(rowCells);
    }
  }

  return rows;
}

async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<ParsedSheetTab[]> {
  const entries = await unzipXlsxEntries(buffer);
  const sharedStrings = parseSharedStringsXml(entries.get("xl/sharedStrings.xml"));

  // Map relationship IDs from xl/_rels/workbook.xml.rels
  const relMap = new Map<string, string>();
  const relsXml = entries.get("xl/_rels/workbook.xml.rels");
  if (relsXml) {
    const relDoc = new DOMParser().parseFromString(relsXml, "application/xml");
    for (const rel of Array.from(relDoc.getElementsByTagName("Relationship"))) {
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) {
        const normalizedTarget = target.startsWith("/")
          ? target.replace(/^\/+/, "")
          : `xl/${target.replace(/^\.\//, "")}`;
        relMap.set(id, normalizedTarget);
      }
    }
  }

  const tabs: ParsedSheetTab[] = [];
  const workbookXml = entries.get("xl/workbook.xml");
  if (workbookXml) {
    const wbDoc = new DOMParser().parseFromString(workbookXml, "application/xml");
    const sheetEls = Array.from(wbDoc.getElementsByTagName("sheet"));
    for (let i = 0; i < sheetEls.length; i++) {
      const sheetEl = sheetEls[i];
      const name = sheetEl.getAttribute("name") || `Sheet ${i + 1}`;
      const rId =
        sheetEl.getAttribute("r:id") ||
        sheetEl.getAttributeNS(
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "id"
        ) ||
        "";
      const targetPath =
        relMap.get(rId) || `xl/worksheets/sheet${i + 1}.xml`;
      const sheetXml = entries.get(targetPath);
      if (sheetXml) {
        tabs.push({
          name,
          rows: parseWorksheetXml(sheetXml, sharedStrings),
        });
      }
    }
  }

  if (tabs.length === 0) {
    // Fallback: scan any xl/worksheets/sheet*.xml
    const worksheetKeys = [...entries.keys()]
      .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
      .sort();
    for (let i = 0; i < worksheetKeys.length; i++) {
      const xml = entries.get(worksheetKeys[i])!;
      tabs.push({
        name: `Sheet ${i + 1}`,
        rows: parseWorksheetXml(xml, sharedStrings),
      });
    }
  }

  return tabs.filter((t) => t.rows.length > 0);
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSheetTab[]> {
  const lowerName = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check for ZIP magic header PK\x03\x04 (.xlsx)
  const isZip =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;

  if (isZip || lowerName.endsWith(".xlsx")) {
    const tabs = await parseXlsxBuffer(buffer);
    if (tabs.length === 0) {
      throw new Error("No non-empty worksheet tables were found in this Excel file.");
    }
    return tabs;
  }

  // Check for legacy binary BIFF8 .xls (D0 CF 11 E0)
  const isCompoundBinary =
    bytes.length >= 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0;

  if (isCompoundBinary) {
    throw new Error(
      "This file is in legacy binary Excel (.xls 97-2003) format. Please re-save it as Excel Workbook (.xlsx) or CSV (.csv), or copy and paste the table directly below."
    );
  }

  const text = new TextDecoder("utf-8").decode(buffer);
  const trimmed = text.trimStart();

  if (
    trimmed.startsWith("<") &&
    (/<table\b/i.test(trimmed) || /<Worksheet\b/i.test(trimmed))
  ) {
    return parseHtmlOrXmlSpreadsheet(text);
  }

  const rows = parseDelimitedText(text);
  if (rows.length === 0) {
    throw new Error("The uploaded sheet appears to be empty.");
  }

  return [{ name: file.name.replace(/\.[^.]+$/, "") || "Sheet 1", rows }];
}

export function downloadFarmerImportTemplate() {
  const headers = [
    "Full Name",
    "Gender",
    "Age",
    "Community",
    "District",
    "Region",
    "Mobile",
    "Ghana Card Number",
    "Commodities",
    "Household Size",
    "Years Farming",
    "Farming Dependency",
  ];
  const sampleRows = [
    [
      "Abdulai Mohammed",
      "Male",
      "42",
      "Kpalsi",
      "Sagnarigu",
      "Northern",
      "0244123456",
      "GHA-123456789-1",
      "Maize; Soya",
      "6",
      "12",
      "Full-time farmer",
    ],
    [
      "Amina Fuseini",
      "Female",
      "35",
      "Kpalsi",
      "Sagnarigu",
      "Northern",
      "0549876543",
      "",
      "Shea; Cashew",
      "5",
      "8",
      "Full-time farmer",
    ],
  ];

  const escapeCell = (val: string) =>
    /[",\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;

  const csvContent = [
    headers.map(escapeCell).join(","),
    ...sampleRows.map((row) => row.map(escapeCell).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "farmeriq-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

