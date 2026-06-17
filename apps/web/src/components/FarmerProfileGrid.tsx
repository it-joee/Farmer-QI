import type { ReactNode } from "react";
import type { Farmer } from "@farmeriq/shared";
import type { FarmerFormData } from "../pages/farmer-form/types";
import { buildPrimaryCommodities } from "../pages/farmer-form/commodities";

export interface ProfileField {
  label: string;
  value: ReactNode;
}

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}

export function profileFieldsFromFarmer(farmer: Farmer): ProfileField[] {
  return [
    { label: "Full name", value: farmer.full_name },
    { label: "Ghana Card", value: display(farmer.ghana_card) },
    { label: "Phone", value: display(farmer.phone) },
    { label: "Gender", value: display(farmer.gender) },
    { label: "Date of birth", value: farmer.date_of_birth ? farmer.date_of_birth.slice(0, 10) : "—" },
    { label: "Age", value: display(farmer.age) },
    { label: "Community", value: farmer.community },
    { label: "District", value: display(farmer.district) },
    { label: "Region", value: display(farmer.region) },
    { label: "Digital address", value: display(farmer.digital_address) },
    { label: "Farm address", value: display(farmer.farm_address) },
    { label: "Commodities", value: (farmer.primary_crops ?? []).join(", ") || "—" },
    { label: "Household size", value: display(farmer.household_size) },
    { label: "Years farming", value: display(farmer.years_farming) },
    { label: "Farming dependency", value: display(farmer.farming_dependency) },
    { label: "Bank name", value: display(farmer.bank_name) },
    { label: "Bank branch", value: display(farmer.bank_branch) },
    { label: "Bank account", value: display(farmer.bank_account) },
    {
      label: "Registered",
      value: new Date(farmer.created_at).toLocaleString(),
    },
  ];
}

export function profileFieldsFromForm(form: FarmerFormData): ProfileField[] {
  const commodities = buildPrimaryCommodities(form);
  return [
    { label: "Full name", value: form.full_name },
    { label: "Ghana Card", value: display(form.ghana_card) },
    { label: "Phone", value: display(form.phone) },
    { label: "Gender", value: display(form.gender) },
    { label: "Date of birth", value: display(form.date_of_birth) },
    { label: "Community", value: form.community },
    { label: "District", value: display(form.district) },
    { label: "Region", value: display(form.region) },
    { label: "Digital address", value: display(form.digital_address) },
    { label: "Farm address", value: display(form.farm_address) },
    { label: "Commodities", value: commodities.join(", ") || "—" },
    { label: "Household size", value: display(form.household_size) },
    { label: "Years farming", value: display(form.years_farming) },
    { label: "Farming dependency", value: display(form.farming_dependency) },
    { label: "Bank name", value: display(form.bank_name) },
    { label: "Bank branch", value: display(form.bank_branch) },
    { label: "Bank account", value: display(form.bank_account) },
  ];
}

export function FarmerProfileGrid({ fields }: { fields: ProfileField[] }) {
  return (
    <dl className="detail-grid">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
