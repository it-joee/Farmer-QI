import {
  COMMODITIES,
  FARMING_DEPENDENCY_OPTIONS,
  GENDER_OPTIONS,
  GHANA_REGIONS,
  OTHER_COMMODITY_OPTION,
} from "@farmeriq/shared";
import type { GpsPin } from "@farmeriq/shared";
import type { FarmerFormData } from "./types";
import type { CapturedPhoto } from "../../lib/photos";
import { FarmBoundaryCapture } from "../../components/FarmBoundaryCapture";
import { DateField } from "../../components/fields/DateField";
import { SelectField } from "../../components/fields/SelectField";
import { PhotoCaptureField } from "../../components/PhotoCaptureField";

interface StepProps {
  form: FarmerFormData;
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

export function StepPersonal({ form, onChange, onToggleCommodity, onToggleOther }: StepProps) {
  return (
    <div className="form-grid">
      <div className="form-group">
        <label htmlFor="full_name">Full name</label>
        <input
          id="full_name"
          value={form.full_name}
          onChange={(e) => onChange("full_name", e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="gender">
          Gender <span className="optional">(optional)</span>
        </label>
        <SelectField
          id="gender"
          value={form.gender}
          onChange={(value) => onChange("gender", value)}
          placeholder="Select"
          options={[{ value: "", label: "Select" }, ...GENDER_OPTIONS]}
        />
      </div>

      <div className="form-group">
        <label htmlFor="date_of_birth">
          Date of birth <span className="optional">(optional)</span>
        </label>
        <DateField
          id="date_of_birth"
          value={form.date_of_birth}
          onChange={(value) => onChange("date_of_birth", value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="household_size">
          Household size <span className="optional">(optional)</span>
        </label>
        <input
          id="household_size"
          type="number"
          min="1"
          value={form.household_size}
          onChange={(e) => onChange("household_size", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="farming_dependency">
          Farming dependency <span className="optional">(optional)</span>
        </label>
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
      </div>

      <div className="form-group">
        <label htmlFor="years_farming">
          Years farming <span className="optional">(optional)</span>
        </label>
        <input
          id="years_farming"
          type="number"
          min="0"
          value={form.years_farming}
          onChange={(e) => onChange("years_farming", e.target.value)}
        />
      </div>

      <div className="form-group form-group--full">
        <span className="field-label">Commodities grown</span>
        <div className="crop-checkboxes">
          {COMMODITIES.map((commodity) => (
            <label key={commodity} className="crop-checkbox">
              <input
                type="checkbox"
                checked={form.primary_crops.includes(commodity)}
                onChange={() => onToggleCommodity?.(commodity)}
              />
              {commodity}
            </label>
          ))}
          <label className="crop-checkbox">
            <input
              type="checkbox"
              checked={form.other_commodity_enabled}
              onChange={(e) => onToggleOther?.(e.target.checked)}
            />
            {OTHER_COMMODITY_OPTION}
          </label>
        </div>
        {form.other_commodity_enabled && (
          <div className="form-group form-group--nested">
            <label htmlFor="other_commodity">Other commodity</label>
            <input
              id="other_commodity"
              placeholder="Enter commodity name"
              value={form.other_commodity}
              onChange={(e) => onChange("other_commodity", e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function StepLocation({ form, onChange }: StepProps) {
  return (
    <div className="form-grid">
      <div className="form-group">
        <label htmlFor="region">
          Region <span className="optional">(optional)</span>
        </label>
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
      </div>

      <div className="form-group">
        <label htmlFor="district">
          District <span className="optional">(optional)</span>
        </label>
        <input
          id="district"
          value={form.district}
          onChange={(e) => onChange("district", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="community">Community / village</label>
        <input
          id="community"
          value={form.community}
          onChange={(e) => onChange("community", e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="digital_address">
          Ghana Post GPS <span className="optional">(optional)</span>
        </label>
        <input
          id="digital_address"
          placeholder="e.g. GA-183-8163"
          value={form.digital_address}
          onChange={(e) => onChange("digital_address", e.target.value)}
        />
      </div>

      <div className="form-group form-group--full">
        <label htmlFor="farm_address">
          Farm address <span className="optional">(optional)</span>
        </label>
        <textarea
          id="farm_address"
          rows={3}
          value={form.farm_address}
          onChange={(e) => onChange("farm_address", e.target.value)}
        />
      </div>
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
      <div className="form-group">
        <label htmlFor="ghana_card">Ghana Card Number</label>
        <input
          id="ghana_card"
          value={form.ghana_card}
          onChange={(e) => onChange("ghana_card", e.target.value)}
        />
        <p className="field-hint">Leave blank if the farmer does not have a Ghana Card.</p>
      </div>

      <div className="form-group">
        <label htmlFor="phone">Mobile</label>
        <input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => onChange("phone", e.target.value)}
        />
      </div>

      <PhotoCaptureField
        label="Ghana Card photos"
        hint="Take clear photos of the Ghana Card (front, back, or both)."
        photos={ghanaCardPhotos}
        onChange={onGhanaCardPhotosChange}
        multiple
        maxPhotos={4}
        capture="environment"
      />

      <PhotoCaptureField
        label="Farmer photo"
        hint="Take a photo of the farmer for identification."
        photos={farmerPhoto ? [farmerPhoto] : []}
        onChange={(photos) => onFarmerPhotoChange(photos[0] ?? null)}
        capture="user"
      />
    </div>
  );
}

interface StepFarmBoundaryProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  pins: GpsPin[];
  onPinsChange: (pins: GpsPin[]) => void;
}

export function StepFarmBoundary({
  enabled,
  onEnabledChange,
  pins,
  onPinsChange,
}: StepFarmBoundaryProps) {
  return (
    <div className="form-grid">
      <FarmBoundaryCapture
        enabled={enabled}
        onEnabledChange={onEnabledChange}
        pins={pins}
        onPinsChange={onPinsChange}
      />
    </div>
  );
}
