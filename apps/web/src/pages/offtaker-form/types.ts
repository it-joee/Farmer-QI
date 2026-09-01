import { COMMODITIES } from "@farmeriq/shared";
import type { Offtaker } from "@farmeriq/shared";

export interface OfftakerFormData {
  company_name: string;
  contact_person: string;
  contact: string;
  designation: string;
  official_email: string;
  target_products: string[];
  payment_terms: string;
  delivery_location: string;
  other_commodity_enabled: boolean;
  other_commodity: string;
}

export const EMPTY_OFFTAKER_FORM: OfftakerFormData = {
  company_name: "",
  contact_person: "",
  contact: "",
  designation: "",
  official_email: "",
  target_products: [],
  payment_terms: "",
  delivery_location: "",
  other_commodity_enabled: false,
  other_commodity: "",
};

export const OFFTAKER_FORM_STEPS = [
  { id: 1, title: "Company Details" },
] as const;

export function buildOfftakerCommodities(form: OfftakerFormData): string[] {
  const commodities = [...form.target_products];

  if (form.other_commodity_enabled && form.other_commodity.trim()) {
    const custom = form.other_commodity
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    commodities.push(...custom);
  }

  return commodities;
}

export function offtakerToFormData(offtaker: Offtaker): OfftakerFormData {
  const standard = new Set<string>(COMMODITIES);
  const comms = offtaker.target_products ?? [];
  const standardComms = comms.filter((c: string) => standard.has(c));
  const customComms = comms.filter((c: string) => !standard.has(c));

  return {
    company_name: offtaker.company_name ?? "",
    contact_person: offtaker.contact_person ?? "",
    contact: offtaker.contact ?? "",
    designation: offtaker.designation ?? "",
    official_email: offtaker.official_email ?? "",
    target_products: standardComms,
    payment_terms: offtaker.payment_terms ?? "",
    delivery_location: offtaker.delivery_location ?? "",
    other_commodity_enabled: customComms.length > 0,
    other_commodity: customComms.join(", "),
  };
}

export function offtakerFormToPayload(
  form: OfftakerFormData,
  userId: string,
  submission?: { capturedAt?: string; deviceId?: string; clientLocalId?: string }
) {
  const body: Record<string, unknown> = {
    company_name: form.company_name.trim(),
    contact_person: form.contact_person.trim() || null,
    contact: form.contact?.trim() || null,
    designation: form.designation?.trim() || null,
    official_email: form.official_email?.trim() || null,
    payment_terms: form.payment_terms?.trim() || null,
    delivery_location: form.delivery_location?.trim() || null,
    created_by: userId,
    updated_by: userId,
  };
  
  const commodities = buildOfftakerCommodities(form);
  body.target_products = commodities;

  if (submission?.capturedAt) body.captured_at = submission.capturedAt;
  if (submission?.deviceId) body.device_id = submission.deviceId;
  if (submission?.clientLocalId) body.client_local_id = submission.clientLocalId;

  return body;
}
