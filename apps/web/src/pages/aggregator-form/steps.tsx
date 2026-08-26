import type { AggregatorFormData } from "./types";
import type { CapturedPhoto } from "../../lib/photos";
import { FormGroup } from "../../components/FormGroup";
import { PhotoCaptureField } from "../../components/PhotoCaptureField";
import { CommodityChipSelect } from "../../components/fields/CommodityChipSelect";
import type { FieldErrors } from "../../lib/form-validation";

interface StepProps {
  form: AggregatorFormData;
  errors?: FieldErrors;
  onChange: (field: keyof AggregatorFormData, value: string) => void;
  onToggleCommodity?: (commodity: string) => void;
  onToggleOther?: (enabled: boolean) => void;
}

interface StepIdentityProps extends StepProps {
  ghanaCardPhotos: CapturedPhoto[];
  onGhanaCardPhotosChange: (photos: CapturedPhoto[]) => void;
  aggregatorPhoto: CapturedPhoto | null;
  onAggregatorPhotoChange: (photo: CapturedPhoto | null) => void;
}

export function StepAggregatorDetails({
  form,
  errors,
  onChange,
  onToggleCommodity,
  onToggleOther,
}: StepProps) {
  return (
    <div className="form-grid">
      <FormGroup fieldId="full_name" label="Full name" error={errors?.full_name}>
        <input
          id="full_name"
          placeholder="e.g. Kwame Mensah"
          value={form.full_name}
          onChange={(e) => onChange("full_name", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="age"
        label={
          <>
            Age <span className="optional">(optional)</span>
          </>
        }
        error={errors?.age}
      >
        <input
          id="age"
          type="number"
          min="1"
          max="120"
          placeholder="e.g. 38"
          value={form.age}
          onChange={(e) => onChange("age", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="phone"
        label={
          <>
            Contact / Phone <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="phone"
          type="tel"
          placeholder="e.g. 0244123456"
          value={form.phone}
          onChange={(e) => onChange("phone", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="town"
        label={
          <>
            Town <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="town"
          placeholder="e.g. Techiman, Wa, Tamale"
          value={form.town}
          onChange={(e) => onChange("town", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="business_name"
        label={
          <>
            Registered Business Name <span className="optional">(optional)</span>
          </>
        }
        className="form-group--full"
      >
        <input
          id="business_name"
          placeholder="e.g. Golden Grains Trading Ltd"
          value={form.business_name}
          onChange={(e) => onChange("business_name", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="commodities"
        label="Commodities traded / aggregated"
        labelFor={null}
        className="form-group--full"
      >
        <CommodityChipSelect
          selected={form.commodities}
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

export function StepAggregatorIdentity({
  form,
  onChange,
  ghanaCardPhotos,
  onGhanaCardPhotosChange,
  aggregatorPhoto,
  onAggregatorPhotoChange,
}: StepIdentityProps) {
  return (
    <div className="form-grid">
      <FormGroup
        fieldId="ghana_card"
        label="Ghana Card Number"
        hint="Leave blank if the aggregator does not have a Ghana Card."
      >
        <input
          id="ghana_card"
          placeholder="e.g. GHA-123456789-0"
          value={form.ghana_card}
          onChange={(e) => onChange("ghana_card", e.target.value)}
        />
      </FormGroup>

      <div className="photo-fields-row" style={{ gridColumn: "1 / -1" }}>
        <PhotoCaptureField
          label="Ghana Card photos"
          hint="Take clear photos of the Ghana Card (front, back, or both)."
          photos={ghanaCardPhotos}
          onChange={onGhanaCardPhotosChange}
          multiple
          maxPhotos={4}
        />

        <PhotoCaptureField
          label="Photo of Aggregator (themselves)"
          hint="Take a clear portrait photo of the aggregator for identification."
          photos={aggregatorPhoto ? [aggregatorPhoto] : []}
          onChange={(photos) => onAggregatorPhotoChange(photos[0] ?? null)}
        />
      </div>
    </div>
  );
}
