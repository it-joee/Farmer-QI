import { COMMODITIES } from "@farmeriq/shared";
import type { Farmer } from "@farmeriq/shared";
import { buildPrimaryCommodities } from "./commodities";

export interface FarmerFormData {
  full_name: string;
  gender: string;
  date_of_birth: string;
  household_size: string;
  farming_dependency: string;
  years_farming: string;
  primary_crops: string[];
  other_commodity_enabled: boolean;
  other_commodity: string;
  region: string;
  district: string;
  community: string;
  digital_address: string;
  farm_address: string;
  bank_name: string;
  bank_branch: string;
  bank_account: string;
  bank_account_confirm: string;
  ghana_card: string;
  phone: string;
}

export const EMPTY_FORM: FarmerFormData = {
  full_name: "",
  gender: "",
  date_of_birth: "",
  household_size: "",
  farming_dependency: "",
  years_farming: "",
  primary_crops: [],
  other_commodity_enabled: false,
  other_commodity: "",
  region: "",
  district: "",
  community: "",
  digital_address: "",
  farm_address: "",
  bank_name: "",
  bank_branch: "",
  bank_account: "",
  bank_account_confirm: "",
  ghana_card: "",
  phone: "",
};

export const FORM_STEPS = [
  { id: 1, title: "Personal Information" },
  { id: 2, title: "Farm Location & Details" },
  { id: 3, title: "Identity & Contact" },
  { id: 4, title: "Farm Boundary" },
] as const;

export const EDIT_FORM_STEPS = FORM_STEPS;

export function farmerToFormData(farmer: Farmer): FarmerFormData {
  const standard = new Set<string>(COMMODITIES);
  const crops = farmer.primary_crops ?? [];
  const primary_crops = crops.filter((c) => standard.has(c));
  const otherCrops = crops.filter((c) => !standard.has(c));

  return {
    full_name: farmer.full_name,
    gender: farmer.gender ?? "",
    date_of_birth: farmer.date_of_birth?.slice(0, 10) ?? "",
    household_size: farmer.household_size != null ? String(farmer.household_size) : "",
    farming_dependency: farmer.farming_dependency ?? "",
    years_farming: farmer.years_farming != null ? String(farmer.years_farming) : "",
    primary_crops,
    other_commodity_enabled: otherCrops.length > 0,
    other_commodity: otherCrops.join(", "),
    region: farmer.region ?? "",
    district: farmer.district ?? "",
    community: farmer.community,
    digital_address: farmer.digital_address ?? "",
    farm_address: farmer.farm_address ?? "",
    bank_name: farmer.bank_name ?? "",
    bank_branch: farmer.bank_branch ?? "",
    bank_account: farmer.bank_account ?? "",
    bank_account_confirm: farmer.bank_account ?? "",
    ghana_card: farmer.ghana_card ?? "",
    phone: farmer.phone ?? "",
  };
}

export function ageFromDateOfBirth(dob: string): number | undefined {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age > 0 ? age : undefined;
}

export function formToPayload(
  form: FarmerFormData,
  createdBy: string,
  submission?: { capturedAt?: string; deviceId?: string; clientLocalId?: string }
) {
  const body: Record<string, unknown> = {
    full_name: form.full_name.trim(),
    community: form.community.trim(),
    created_by: createdBy,
  };

  if (form.gender) body.gender = form.gender;
  if (form.date_of_birth) {
    body.date_of_birth = form.date_of_birth;
    const age = ageFromDateOfBirth(form.date_of_birth);
    if (age) body.age = age;
  }
  if (form.household_size) body.household_size = Number(form.household_size);
  if (form.farming_dependency) body.farming_dependency = form.farming_dependency;
  if (form.years_farming) body.years_farming = Number(form.years_farming);
  const commodities = buildPrimaryCommodities(form);
  if (commodities.length > 0) body.primary_crops = commodities;
  if (form.region) body.region = form.region;
  if (form.district) body.district = form.district.trim();
  if (form.digital_address) body.digital_address = form.digital_address.trim();
  if (form.farm_address) body.farm_address = form.farm_address.trim();
  if (form.bank_name) body.bank_name = form.bank_name.trim();
  if (form.bank_branch) body.bank_branch = form.bank_branch.trim();
  if (form.bank_account) body.bank_account = form.bank_account.trim();
  if (form.ghana_card) body.ghana_card = form.ghana_card.trim();
  if (form.phone) body.phone = form.phone.trim();
  if (submission?.capturedAt) body.captured_at = submission.capturedAt;
  if (submission?.deviceId) body.device_id = submission.deviceId;
  if (submission?.clientLocalId) body.client_local_id = submission.clientLocalId;

  return body;
}
