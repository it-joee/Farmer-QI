import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useToast } from "../context/ToastContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { useOfftaker } from "../hooks/useOfftakers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
  type FieldValidation,
} from "../lib/form-validation";
import { apiFetch } from "../lib/api-client";
import { getDeviceId } from "../lib/device-id";
import { StepOfftakerDetails } from "./offtaker-form/steps";
import {
  EMPTY_OFFTAKER_FORM,
  OFFTAKER_FORM_STEPS,
  type OfftakerFormData,
  offtakerFormToPayload,
  offtakerToFormData,
} from "./offtaker-form/types";

export function EditOfftakerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { offtaker, loading: loadingData, error: loadError } = useOfftaker(id ?? "");
  const { showSuccess } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OfftakerFormData>(EMPTY_OFFTAKER_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (offtaker) {
      setForm(offtakerToFormData(offtaker));
    }
  }, [offtaker]);

  if (!user) return null;
  if (loadingData) return <div className="p-xl text-center">Loading…</div>;
  if (loadError || !offtaker) {
    return (
      <div className="p-xl text-center error">
        {loadError?.message || "Offtaker not found"}
      </div>
    );
  }

  const currentStep = OFFTAKER_FORM_STEPS[step - 1];

  function updateField(field: keyof OfftakerFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => clearFieldError(prev, field));
  }

  function toggleCommodity(commodity: string) {
    setForm((prev) => ({
      ...prev,
      target_products: prev.target_products.includes(commodity)
        ? prev.target_products.filter((c) => c !== commodity)
        : [...prev.target_products, commodity],
    }));
  }

  function toggleOther(enabled: boolean) {
    setForm((prev) => ({
      ...prev,
      other_commodity_enabled: enabled,
      other_commodity: enabled ? prev.other_commodity : "",
    }));
  }

  function validateStep(): FieldValidation | null {
    if (!form.company_name.trim()) {
      return { fieldId: "company_name", message: "Company name is required." };
    }
    return null;
  }

  async function handleSubmit() {
    if (!applyFieldValidation(validateStep(), setFieldErrors)) return;

    setSaving(true);
    setFormError("");

    try {
      if (!navigator.onLine) {
        throw new Error("You must be online to update an existing offtaker directly.");
      }

      const res = await apiFetch(`/api/offtakers/${offtaker!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          offtakerFormToPayload(form, user!.id, {
            capturedAt: new Date().toISOString(),
            deviceId: getDeviceId(),
          })
        ),
      });

      if (!res.ok) {
        throw new Error(
          res.status >= 500
            ? "Server error while updating offtaker"
            : "Could not update offtaker. Check required fields."
        );
      }

      showSuccess("Offtaker Updated", `${form.company_name} has been updated.`);
      navigate(`/offtakers/${offtaker!.reference_id || offtaker!.id}`);
    } catch (err) {
      console.error("Update offtaker error:", err);
      setFormError(
        err instanceof Error ? err.message : "Could not update offtaker. Check required fields."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main main--wide">
      <BackButton to={`/offtakers/${offtaker.reference_id || offtaker.id}`} />
      <h2>Edit Offtaker</h2>
      <p className="muted">Updating {offtaker.company_name}</p>

      <div className="card card--form">
        <div className="section-header">{currentStep.title}</div>

        {formError && <p className="error">{formError}</p>}

        {step === 1 && (
          <StepOfftakerDetails
            form={form}
            errors={fieldErrors}
            onChange={updateField}
            onToggleCommodity={toggleCommodity}
            onToggleOther={toggleOther}
          />
        )}

        <div className="form-actions">
          <div className="form-actions__right">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
