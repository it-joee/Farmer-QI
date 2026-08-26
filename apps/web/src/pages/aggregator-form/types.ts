import { COMMODITIES } from "@farmeriq/shared";
import type { Aggregator } from "@farmeriq/shared";

export interface AggregatorFormData {
  full_name: string;
  age: string;
  phone: string;
  town: string;
  ghana_card: string;
  business_name: string;
  commodities: string[];
  other_commodity_enabled: boolean;
  other_commodity: string;
}

export const EMPTY_AGGREGATOR_FORM: AggregatorFormData = {
  full_name: "",
  age: "",
  phone: "",
  town: "",
  ghana_card: "",
  business_name: "",
  commodities: [],
  other_commodity_enabled: false,
  other_commodity: "",
};

export const AGGREGATOR_FORM_STEPS = [
  { id: 1, title: "Personal & Business Details" },
  { id: 2, title: "Identity & Photo Capture" },
] as const;

export function buildAggregatorCommodities(form: AggregatorFormData): string[] {
  const commodities = [...form.commodities];

  if (form.other_commodity_enabled && form.other_commodity.trim()) {
    const custom = form.other_commodity
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    commodities.push(...custom);
  }

  return commodities;
}

export function aggregatorToFormData(aggregator: Aggregator): AggregatorFormData {
  const standard = new Set<string>(COMMODITIES);
  const comms = aggregator.commodities ?? [];
  const standardComms = comms.filter((c: string) => standard.has(c));
  const customComms = comms.filter((c: string) => !standard.has(c));

  return {
    full_name: aggregator.full_name,
    age: aggregator.age != null ? String(aggregator.age) : "",
    phone: aggregator.phone ?? "",
    town: aggregator.town ?? "",
    ghana_card: aggregator.ghana_card ?? "",
    business_name: aggregator.business_name ?? "",
    commodities: standardComms,
    other_commodity_enabled: customComms.length > 0,
    other_commodity: customComms.join(", "),
  };
}

export function aggregatorFormToPayload(
  form: AggregatorFormData,
  createdBy: string,
  submission?: { capturedAt?: string; deviceId?: string; clientLocalId?: string }
) {
  const body: Record<string, unknown> = {
    full_name: form.full_name.trim(),
    created_by: createdBy,
  };

  if (form.age) {
    const parsedAge = parseInt(form.age, 10);
    if (!Number.isNaN(parsedAge) && parsedAge > 0) {
      body.age = parsedAge;
    }
  }

  if (form.phone) body.phone = form.phone.trim();
  if (form.town) body.town = form.town.trim();
  if (form.ghana_card) body.ghana_card = form.ghana_card.trim();
  if (form.business_name) body.business_name = form.business_name.trim();

  const commodities = buildAggregatorCommodities(form);
  body.commodities = commodities;

  if (submission?.capturedAt) body.captured_at = submission.capturedAt;
  if (submission?.deviceId) body.device_id = submission.deviceId;
  if (submission?.clientLocalId) body.client_local_id = submission.clientLocalId;

  return body;
}
