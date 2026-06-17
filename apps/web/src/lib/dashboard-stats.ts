import type { DashboardOverview, Farmer, StatBucket } from "@farmeriq/shared";
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
  const counts = new Map<string, number>();

  for (const farmer of farmers) {
    const raw = getLabel(farmer)?.trim();
    const label = raw || unknownLabel;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = farmers.length;
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, percentage: pct(count, total) }))
    .sort((a, b) => b.count - a.count);
}

function countCommodities(farmers: Farmer[]): StatBucket[] {
  const counts = new Map<string, number>();

  for (const farmer of farmers) {
    const commodities = farmer.primary_crops ?? [];
    if (commodities.length === 0) {
      counts.set("Not specified", (counts.get("Not specified") ?? 0) + 1);
      continue;
    }
    for (const commodity of commodities) {
      counts.set(commodity, (counts.get(commodity) ?? 0) + 1);
    }
  }

  const withCommodities =
    farmers.filter((f) => (f.primary_crops ?? []).length > 0).length || farmers.length;
  return [...counts.entries()]
    .map(([label, count]) => ({
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
  return farmers.filter((f) => (f.primary_crops ?? []).includes(commodity));
}

export function districtStatsForCommodity(farmers: Farmer[], commodity: string | null): StatBucket[] {
  return countByLabel(filterFarmersByCommodity(farmers, commodity), (f) => f.district);
}

export function getCommodityFilterOptions(
  farmers: Farmer[],
  standard: readonly string[]
): string[] {
  const extras = new Set<string>();

  for (const farmer of farmers) {
    for (const commodity of farmer.primary_crops ?? []) {
      if (!standard.includes(commodity)) {
        extras.add(commodity);
      }
    }
  }

  return [...standard, ...extras].sort((a, b) => a.localeCompare(b));
}

export const CHART_COLORS = [
  palette.green[500],
  palette.green[300],
  palette.green[400],
  palette.green[600],
  palette.orange[200],
  palette.orange[300],
  palette.orange[400],
  palette.wheat[400],
  palette.corn[400],
  palette.corn[500],
] as const;

/** @deprecated Use filterFarmersByCommodity */
export const filterFarmersByCrop = filterFarmersByCommodity;

/** @deprecated Use districtStatsForCommodity */
export const districtStatsForCrop = districtStatsForCommodity;
