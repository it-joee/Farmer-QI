import type { ReactNode } from "react";
import type { Farmer } from "@farmeriq/shared";
import type { FarmerFormData } from "../pages/farmer-form/types";
import { buildPrimaryCommodities } from "../pages/farmer-form/commodities";

export interface ProfileField {
  label: string;
  value: ReactNode;
  /** Span full row on mobile (long text). Omit for side-by-side pairs. */
  fullWidth?: boolean;
}

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}

export function profileFieldsFromFarmer(farmer: Farmer): ProfileField[] {
  return [
    { label: "Full name", value: farmer.full_name, fullWidth: true },
    { label: "Ghana Card", value: display(farmer.ghana_card), fullWidth: true },
    { label: "Phone", value: display(farmer.phone), fullWidth: true },
    { label: "Gender", value: display(farmer.gender) },
    { label: "Age", value: display(farmer.age) },
    {
      label: "Date of birth",
      value: farmer.date_of_birth ? farmer.date_of_birth.slice(0, 10) : "—",
      fullWidth: true,
    },
    { label: "Community", value: farmer.community },
    { label: "District", value: display(farmer.district) },
    { label: "Region", value: display(farmer.region), fullWidth: true },
    { label: "Digital address", value: display(farmer.digital_address), fullWidth: true },
    { label: "Farm address", value: display(farmer.farm_address), fullWidth: true },
    { label: "Commodities", value: (farmer.primary_crops ?? []).join(", ") || "—", fullWidth: true },
    { label: "Household size", value: display(farmer.household_size) },
    { label: "Years farming", value: display(farmer.years_farming) },
    { label: "Farming dependency", value: display(farmer.farming_dependency), fullWidth: true },
    { label: "Bank name", value: display(farmer.bank_name) },
    { label: "Bank branch", value: display(farmer.bank_branch) },
    { label: "Bank account", value: display(farmer.bank_account), fullWidth: true },
    {
      label: "Registered",
      value: new Date(farmer.created_at).toLocaleString(),
      fullWidth: true,
    },
  ];
}

export function profileFieldsFromForm(form: FarmerFormData): ProfileField[] {
  const commodities = buildPrimaryCommodities(form);
  return [
    { label: "Full name", value: form.full_name, fullWidth: true },
    { label: "Ghana Card", value: display(form.ghana_card), fullWidth: true },
    { label: "Phone", value: display(form.phone), fullWidth: true },
    { label: "Gender", value: display(form.gender) },
    { label: "Date of birth", value: display(form.date_of_birth) },
    { label: "Community", value: form.community },
    { label: "District", value: display(form.district) },
    { label: "Region", value: display(form.region), fullWidth: true },
    { label: "Digital address", value: display(form.digital_address), fullWidth: true },
    { label: "Farm address", value: display(form.farm_address), fullWidth: true },
    { label: "Commodities", value: commodities.join(", ") || "—", fullWidth: true },
    { label: "Household size", value: display(form.household_size) },
    { label: "Years farming", value: display(form.years_farming) },
    { label: "Farming dependency", value: display(form.farming_dependency), fullWidth: true },
    { label: "Bank name", value: display(form.bank_name) },
    { label: "Bank branch", value: display(form.bank_branch) },
    { label: "Bank account", value: display(form.bank_account), fullWidth: true },
  ];
}

export function FarmerProfileGrid({ fields }: { fields: ProfileField[] }) {
  return (
    <dl className="detail-grid">
      {fields.map((field) => (
        <div
          key={field.label}
          className={field.fullWidth ? "detail-grid__item detail-grid__item--full" : "detail-grid__item"}
        >
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
