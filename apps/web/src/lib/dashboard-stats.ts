import type { DashboardOverview, Farmer, StatBucket } from "@farmeriq/shared";
import { COMMODITIES } from "@farmeriq/shared";
import { palette } from "../theme/colors";

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function countByLabel(
  farmers: Farmer[],
  getLabel: (f: Farmer) => string | null | undefined,
  unknownLabel = "Not specified"
): StatBucket[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const farmer of farmers) {
    const raw = getLabel(farmer)?.trim();
    if (!raw) {
      const key = unknownLabel.toLowerCase();
      const existing = counts.get(key) ?? { label: unknownLabel, count: 0 };
      existing.count += 1;
      counts.set(key, existing);
      continue;
    }

    const key = raw.toLowerCase().replace(/\s+/g, " ");
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label: raw, count: 1 });
    }
  }

  const total = farmers.length;
  return [...counts.values()]
    .map(({ label, count }) => ({ label, count, percentage: pct(count, total) }))
    .sort((a, b) => b.count - a.count);
}

function countCommodities(farmers: Farmer[]): StatBucket[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const farmer of farmers) {
    const commodities = farmer.primary_crops ?? [];
    if (commodities.length === 0) {
      const key = "not specified";
      const existing = counts.get(key) ?? { label: "Not specified", count: 0 };
      existing.count += 1;
      counts.set(key, existing);
      continue;
    }
    for (const rawCommodity of commodities) {
      const trimmed = rawCommodity.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      const match = COMMODITIES.find((c) => c.toLowerCase() === key);
      const displayLabel = match || (trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label: displayLabel, count: 1 });
      }
    }
  }

  const withCommodities =
    farmers.filter((f) => (f.primary_crops ?? []).length > 0).length || farmers.length;
  return [...counts.values()]
    .map(({ label, count }) => ({
      label,
      count,
      percentage: pct(count, withCommodities),
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildDashboardOverview(farmers: Farmer[]): DashboardOverview {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonth = farmers.filter((f) => new Date(f.created_at) >= monthStart).length;
  const districts = new Set(farmers.map((f) => f.district?.trim()).filter(Boolean)).size;
  const regions = new Set(farmers.map((f) => f.region?.trim()).filter(Boolean)).size;

  return {
    totals: {
      farmers: farmers.length,
      this_month: thisMonth,
      districts,
      regions,
      with_ghana_card: farmers.filter((f) => f.ghana_card?.trim()).length,
      with_phone: farmers.filter((f) => f.phone?.trim()).length,
      with_bank: farmers.filter((f) => f.bank_account?.trim()).length,
      with_commodities: farmers.filter((f) => (f.primary_crops ?? []).length > 0).length,
    },
    by_commodity: countCommodities(farmers),
    by_district: countByLabel(farmers, (f) => f.district),
    by_region: countByLabel(farmers, (f) => f.region),
    by_gender: countByLabel(farmers, (f) => f.gender),
    by_farming_dependency: countByLabel(farmers, (f) => f.farming_dependency),
  };
}

export function filterFarmersByCommodity(farmers: Farmer[], commodity: string | null): Farmer[] {
  if (!commodity || commodity === "all") return farmers;
  if (commodity === "Not specified") {
    return farmers.filter((f) => !(f.primary_crops ?? []).length);
  }
  const target = commodity.toLowerCase().trim();
  return farmers.filter((f) =>
    (f.primary_crops ?? []).some((c) => c.toLowerCase().trim() === target)
  );
}

export function districtStatsForCommodity(farmers: Farmer[], commodity: string | null): StatBucket[] {
  return countByLabel(filterFarmersByCommodity(farmers, commodity), (f) => f.district);
}

export function getCommodityFilterOptions(
  records: { primary_crops?: string[] }[],
  standard: readonly string[]
): string[] {
  const extras = new Set<string>();

  for (const item of records) {
    for (const raw of item.primary_crops ?? []) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const match = standard.find((c) => c.toLowerCase() === trimmed.toLowerCase());
      if (!match) {
        extras.add(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
      }
    }
  }

  return [...standard, ...extras].sort((a, b) => a.localeCompare(b));
}

/**
 * Chart color palette:
 * Starts with the signature brand green (#b0ec80) as primary,
 * then shifts toward yellow and brown tones (corn yellow, harvest amber, wheat tan, earth brown)
 * so each bar and pie slice is distinct and visually clear.
 */
export const CHART_COLORS = [
  palette.green[500],  // #b0ec80 — Exact Brand Green (Primary)
  "#facc15",           // Golden Yellow (Corn / Maize)
  palette.orange[600],  // #c9925a — Warm Harvest Ochre
  "#8b5a2b",           // Earth Soil Brown
  palette.green[600],  // #8fd066 — Deeper Brand Green
  "#f59e0b",           // Amber Gold
  "#deb781",           // Wheat Tan
  "#6c431b",           // Rich Cocoa Brown
  "#eab308",           // Sunlit Gold
  "#a2673a",           // Terracotta Brown
] as const;

export const NOT_SPECIFIED_COLOR = "#94a3b8"; // Neutral slate for "Not specified"

export function getChartColor(label: string, index: number): string {
  if (label && label.toLowerCase() === "not specified") {
    return NOT_SPECIFIED_COLOR;
  }
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** @deprecated Use filterFarmersByCommodity */
export const filterFarmersByCrop = filterFarmersByCommodity;

/** @deprecated Use districtStatsForCommodity */
export const districtStatsForCrop = districtStatsForCommodity;
