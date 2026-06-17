import type { FarmerFormData } from "./types";

export function buildPrimaryCommodities(form: FarmerFormData): string[] {
  const commodities = [...form.primary_crops];

  if (form.other_commodity_enabled && form.other_commodity.trim()) {
    const custom = form.other_commodity
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    commodities.push(...custom);
  }

  return commodities;
}
