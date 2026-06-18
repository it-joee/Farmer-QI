import {
  FARMING_DEPENDENCY_OPTIONS,
  GENDER_OPTIONS,
  GHANA_REGIONS,
} from "@farmeriq/shared";
import type { GpsPin } from "@farmeriq/shared";
import type { FarmerFormData } from "./types";
import type { CapturedPhoto } from "../../lib/photos";
import { FormGroup } from "../../components/FormGroup";
import { FarmBoundaryCapture } from "../../components/FarmBoundaryCapture";
import { DateField } from "../../components/fields/DateField";
import { SelectField } from "../../components/fields/SelectField";
import { PhotoCaptureField } from "../../components/PhotoCaptureField";
import { CommodityChipSelect } from "../../components/fields/CommodityChipSelect";
import type { FieldErrors } from "../../lib/form-validation";

interface StepProps {
  form: FarmerFormData;
  errors?: FieldErrors;
  onChange: (field: keyof FarmerFormData, value: string) => void;
  onToggleCommodity?: (commodity: string) => void;
  onToggleOther?: (enabled: boolean) => void;
}

interface StepIdentityProps extends StepProps {
  ghanaCardPhotos: CapturedPhoto[];
  onGhanaCardPhotosChange: (photos: CapturedPhoto[]) => void;
  farmerPhoto: CapturedPhoto | null;
  onFarmerPhotoChange: (photo: CapturedPhoto | null) => void;
}

export function StepPersonal({ form, errors, onChange, onToggleCommodity, onToggleOther }: StepProps) {
  return (
    <div className="form-grid">
      <FormGroup fieldId="full_name" label="Full name" error={errors?.full_name}>
        <input
          id="full_name"
          value={form.full_name}
          onChange={(e) => onChange("full_name", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="gender"
        label={
          <>
            Gender <span className="optional">(optional)</span>
          </>
        }
      >
        <SelectField
          id="gender"
          value={form.gender}
          onChange={(value) => onChange("gender", value)}
          placeholder="Select"
          options={[{ value: "", label: "Select" }, ...GENDER_OPTIONS]}
        />
      </FormGroup>

      <FormGroup
        fieldId="date_of_birth"
        label={
          <>
            Date of birth <span className="optional">(optional)</span>
          </>
        }
      >
        <DateField
          id="date_of_birth"
          value={form.date_of_birth}
          onChange={(value) => onChange("date_of_birth", value)}
          minYear={1920}
          maxYear={new Date().getFullYear()}
        />
      </FormGroup>

      <FormGroup
        fieldId="household_size"
        label={
          <>
            Household size <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="household_size"
          type="number"
          min="1"
          value={form.household_size}
          onChange={(e) => onChange("household_size", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="farming_dependency"
        label={
          <>
            Farming dependency <span className="optional">(optional)</span>
          </>
        }
      >
        <SelectField
          id="farming_dependency"
          value={form.farming_dependency}
          onChange={(value) => onChange("farming_dependency", value)}
          placeholder="Select"
          options={[
            { value: "", label: "Select" },
            ...FARMING_DEPENDENCY_OPTIONS.map((opt) => ({ value: opt, label: opt })),
          ]}
        />
      </FormGroup>

      <FormGroup
        fieldId="years_farming"
        label={
          <>
            Years farming <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="years_farming"
          type="number"
          min="0"
          value={form.years_farming}
          onChange={(e) => onChange("years_farming", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="primary_crops"
        label="Commodities grown"
        labelFor={null}
        className="form-group--full"
      >
        <CommodityChipSelect
          selected={form.primary_crops}
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

export function StepLocation({ form, errors, onChange }: StepProps) {
  return (
    <div className="form-grid">
      <FormGroup
        fieldId="region"
        label={
          <>
            Region <span className="optional">(optional)</span>
          </>
        }
      >
        <SelectField
          id="region"
          value={form.region}
          onChange={(value) => onChange("region", value)}
          placeholder="Select region"
          options={[
            { value: "", label: "Select region" },
            ...GHANA_REGIONS.map((region) => ({ value: region, label: region })),
          ]}
        />
      </FormGroup>

      <FormGroup
        fieldId="district"
        label={
          <>
            District <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="district"
          value={form.district}
          onChange={(e) => onChange("district", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="community" label="Community / village" error={errors?.community}>
        <input
          id="community"
          value={form.community}
          onChange={(e) => onChange("community", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="digital_address"
        label={
          <>
            Ghana Post GPS <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="digital_address"
          placeholder="e.g. GA-183-8163"
          value={form.digital_address}
          onChange={(e) => onChange("digital_address", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="farm_address"
        label={
          <>
            Farm address <span className="optional">(optional)</span>
          </>
        }
        className="form-group--full"
      >
        <textarea
          id="farm_address"
          rows={3}
          value={form.farm_address}
          onChange={(e) => onChange("farm_address", e.target.value)}
        />
      </FormGroup>
    </div>
  );
}

export function StepIdentity({
  form,
  onChange,
  ghanaCardPhotos,
  onGhanaCardPhotosChange,
  farmerPhoto,
  onFarmerPhotoChange,
}: StepIdentityProps) {
  return (
    <div className="form-grid">
      <FormGroup
        fieldId="ghana_card"
        label="Ghana Card Number"
        hint="Leave blank if the farmer does not have a Ghana Card."
      >
        <input
          id="ghana_card"
          value={form.ghana_card}
          onChange={(e) => onChange("ghana_card", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="phone" label="Mobile">
        <input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => onChange("phone", e.target.value)}
        />
      </FormGroup>

      <div className="photo-fields-row">
        <PhotoCaptureField
          label="Ghana Card photos"
          hint="Take clear photos of the Ghana Card (front, back, or both)."
          photos={ghanaCardPhotos}
          onChange={onGhanaCardPhotosChange}
          multiple
          maxPhotos={4}
        />

        <PhotoCaptureField
          label="Farmer photo"
          hint="Take a photo of the farmer for identification."
          photos={farmerPhoto ? [farmerPhoto] : []}
          onChange={(photos) => onFarmerPhotoChange(photos[0] ?? null)}
        />
      </div>
    </div>
  );
}

interface StepFarmBoundaryProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  pins: GpsPin[];
  onPinsChange: (pins: GpsPin[]) => void;
  error?: string;
}

export function StepFarmBoundary({
  enabled,
  onEnabledChange,
  pins,
  onPinsChange,
  error,
}: StepFarmBoundaryProps) {
  return (
    <div className="form-grid">
      <FormGroup fieldId="farm-boundary" labelFor={null} error={error} className="form-group--full">
        <div id="farm-boundary" tabIndex={-1}>
          <FarmBoundaryCapture
            enabled={enabled}
            onEnabledChange={onEnabledChange}
            pins={pins}
            onPinsChange={onPinsChange}
          />
        </div>
      </FormGroup>
    </div>
  );
}
