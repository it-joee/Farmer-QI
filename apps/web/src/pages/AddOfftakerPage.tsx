import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useToast } from "../context/ToastContext";
import { submitOfftaker } from "../lib/offline/offtaker-sync";
import { useRequireAuth } from "../hooks/useFarmers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
  type FieldValidation,
} from "../lib/form-validation";
import { StepOfftakerDetails } from "./offtaker-form/steps";
import {
  EMPTY_OFFTAKER_FORM,
  OFFTAKER_FORM_STEPS,
  type OfftakerFormData,
} from "./offtaker-form/types";

export function AddOfftakerPage() {
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { refreshPending } = useOfflineSyncContext();
  const { showSuccess } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OfftakerFormData>(EMPTY_OFFTAKER_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const agent = user;
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

  async function saveStage() {
    setSaving(true);
    setFormError("");

    try {
      const result = await submitOfftaker({
        agentId: agent.id,
        form,
      });

      await refreshPending();
      showSuccess(
        result === "queued" ? "Saved Offline" : "Saved",
        form.company_name
          ? `${form.company_name} details saved.`
          : "Offtaker progress saved."
      );
      navigate("/offtakers");
    } catch (err) {
      console.error("Save error:", err);
      setFormError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!applyFieldValidation(validateStep(), setFieldErrors)) return;

    setSaving(true);
    setFormError("");

    try {
      const result = await submitOfftaker({
        agentId: agent.id,
        form,
      });

      await refreshPending();
      showSuccess(
        result === "queued" ? "Offtaker Queued" : "Offtaker Saved",
        `${form.company_name} created successfully.`
      );
      navigate("/offtakers");
    } catch (err) {
      console.error("Submit offtaker error:", err);
      setFormError(
        err instanceof Error ? err.message : "Could not save offtaker."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main main--wide">
      <BackButton to="/offtakers" />
      <h2>Add Offtaker</h2>
      <p className="muted">An ID is generated automatically when you save.</p>

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

        <div className="form-actions form-actions--draft">
          <div className="form-actions__left">
            <button
              type="button"
              className="btn btn-outline"
              onClick={saveStage}
              disabled={saving}
            >
              Save Draft
            </button>
          </div>

          <div className="form-actions__right">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Offtaker"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
