import type { OfftakerFormData } from "./types";
import { FormGroup } from "../../components/FormGroup";
import { CommodityChipSelect } from "../../components/fields/CommodityChipSelect";
import type { FieldErrors } from "../../lib/form-validation";

interface StepProps {
  form: OfftakerFormData;
  errors?: FieldErrors;
  onChange: (field: keyof OfftakerFormData, value: string) => void;
  onToggleCommodity?: (commodity: string) => void;
  onToggleOther?: (enabled: boolean) => void;
}

export function StepOfftakerDetails({
  form,
  errors,
  onChange,
  onToggleCommodity,
  onToggleOther,
}: StepProps) {
  return (
    <div className="form-grid">
      <FormGroup fieldId="company_name" label="Company Name" error={errors?.company_name}>
        <input
          id="company_name"
          placeholder="e.g. Acme Corp"
          value={form.company_name}
          onChange={(e) => onChange("company_name", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="contact_person" label="Name of Contact Person">
        <input
          id="contact_person"
          placeholder="e.g. John Doe"
          value={form.contact_person}
          onChange={(e) => onChange("contact_person", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="contact" label="Contact / Phone">
        <input
          id="contact"
          type="tel"
          placeholder="e.g. 0244123456"
          value={form.contact}
          onChange={(e) => onChange("contact", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="official_email" label="Official Email">
        <input
          id="official_email"
          type="email"
          placeholder="e.g. john@acme.com"
          value={form.official_email}
          onChange={(e) => onChange("official_email", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="designation" label="Designation">
        <input
          id="designation"
          placeholder="e.g. Procurement Manager"
          value={form.designation}
          onChange={(e) => onChange("designation", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="delivery_location" label="Delivery Location">
        <input
          id="delivery_location"
          placeholder="e.g. Tema Port"
          value={form.delivery_location}
          onChange={(e) => onChange("delivery_location", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="payment_terms" label="Payment Terms">
        <input
          id="payment_terms"
          placeholder="e.g. Net 30, Cash on Delivery"
          value={form.payment_terms}
          onChange={(e) => onChange("payment_terms", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="target_products"
        label="Target Products"
        labelFor={null}
        className="form-group--full"
      >
        <CommodityChipSelect
          selected={form.target_products}
          onToggle={(commodity) => onToggleCommodity?.(commodity)}
          otherEnabled={form.other_commodity_enabled}
          onToggleOther={(enabled) => onToggleOther?.(enabled)}
          otherValue={form.other_commodity}
          onOtherChange={(value) => onChange("other_commodity", value)}
        />
      </FormGroup>
    </div>
  );
}
