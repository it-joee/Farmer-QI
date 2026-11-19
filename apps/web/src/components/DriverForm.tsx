import { useState } from "react";
import { VEHICLE_TYPES, type CreateDriverRequest, type DriverStatus } from "@farmeriq/shared";
import { SelectField } from "./fields/SelectField";
import { sanitizePhoneInput } from "../lib/form-validation";

export interface DriverFormValues {
  full_name: string;
  phone: string;
  license_number: string;
  vehicle_type: string;
  vehicle_plate: string;
  assigned_location: string;
  status: DriverStatus;
}

const EMPTY_DRIVER_FORM: DriverFormValues = {
  full_name: "",
  phone: "",
  license_number: "",
  vehicle_type: "",
  vehicle_plate: "",
  assigned_location: "",
  status: "active",
};

interface DriverFormProps {
  initialValues?: DriverFormValues;
  submitLabel: string;
  onSubmit: (payload: CreateDriverRequest) => Promise<void>;
  onCancel: () => void;
}

export function DriverForm({ initialValues = EMPTY_DRIVER_FORM, submitLabel, onSubmit, onCancel }: DriverFormProps) {
  const [form, setForm] = useState<DriverFormValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSubmit({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        license_number: form.license_number.trim() || null,
        vehicle_type: form.vehicle_type.trim() || null,
        vehicle_plate: form.vehicle_plate.trim() || null,
        assigned_location: form.assigned_location.trim() || null,
        status: form.status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save driver.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={(e) => void handleSubmit(e)}>
      {error && <p className="error">{error}</p>}

      <div className="form-grid form-grid--2">
        <div className="form-group">
          <label htmlFor="driver-name">Full name</label>
          <input
            id="driver-name"
            required
            value={form.full_name}
            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
            placeholder="e.g. Kwame Mensah"
          />
        </div>

        <div className="form-group">
          <label htmlFor="driver-phone">Phone / Contact</label>
          <input
            id="driver-phone"
            type="tel"
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: sanitizePhoneInput(e.target.value) }))
            }
            placeholder="e.g. 0240000000"
          />
        </div>

        <div className="form-group">
          <label htmlFor="driver-license">License number</label>
          <input
            id="driver-license"
            value={form.license_number}
            onChange={(e) => setForm((prev) => ({ ...prev, license_number: e.target.value }))}
            placeholder="e.g. DL-1234567"
          />
        </div>

        <div className="form-group">
          <label htmlFor="driver-vehicle-type">Vehicle type</label>
          <SelectField
            id="driver-vehicle-type"
            value={form.vehicle_type}
            onChange={(value) => setForm((prev) => ({ ...prev, vehicle_type: value }))}
            placeholder="Select vehicle type"
            options={[
              { value: "", label: "Select vehicle type" },
              ...VEHICLE_TYPES.map((vt) => ({ value: vt, label: vt })),
            ]}
          />
        </div>

        <div className="form-group">
          <label htmlFor="driver-plate">Vehicle plate number</label>
          <input
            id="driver-plate"
            value={form.vehicle_plate}
            onChange={(e) => setForm((prev) => ({ ...prev, vehicle_plate: e.target.value }))}
            placeholder="e.g. GW-1234-24"
          />
        </div>

        <div className="form-group">
          <label htmlFor="driver-location">Assigned location / Route</label>
          <input
            id="driver-location"
            value={form.assigned_location}
            onChange={(e) => setForm((prev) => ({ ...prev, assigned_location: e.target.value }))}
            placeholder="e.g. Wa, Sissala West"
          />
        </div>

        <div className="form-group">
          <label htmlFor="driver-status">Status</label>
          <SelectField
            id="driver-status"
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value as DriverStatus }))}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
