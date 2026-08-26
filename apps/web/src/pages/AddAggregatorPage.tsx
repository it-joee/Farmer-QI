import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import type { CapturedPhoto } from "../lib/photos";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useToast } from "../context/ToastContext";
import { submitAggregator } from "../lib/offline/aggregator-sync";
import { useRequireAuth } from "../hooks/useFarmers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
  type FieldValidation,
} from "../lib/form-validation";
import {
  StepAggregatorDetails,
  StepAggregatorIdentity,
} from "./aggregator-form/steps";
import {
  EMPTY_AGGREGATOR_FORM,
  AGGREGATOR_FORM_STEPS,
  type AggregatorFormData,
} from "./aggregator-form/types";

export function AddAggregatorPage() {
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { refreshPending } = useOfflineSyncContext();
  const { showSuccess } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AggregatorFormData>(EMPTY_AGGREGATOR_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ghanaCardPhotos, setGhanaCardPhotos] = useState<CapturedPhoto[]>([]);
  const [aggregatorPhoto, setAggregatorPhoto] = useState<CapturedPhoto | null>(null);

  if (!user) return null;

  const agent = user;
  const currentStep = AGGREGATOR_FORM_STEPS[step - 1];

  function updateField(field: keyof AggregatorFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => clearFieldError(prev, field));
  }

  function toggleCommodity(commodity: string) {
    setForm((prev) => ({
      ...prev,
      commodities: prev.commodities.includes(commodity)
        ? prev.commodities.filter((c) => c !== commodity)
        : [...prev.commodities, commodity],
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
    if (step === 1 && !form.full_name.trim()) {
      return { fieldId: "full_name", message: "Full name is required." };
    }
    return null;
  }

  function goNext() {
    if (!applyFieldValidation(validateStep(), setFieldErrors)) return;
    setFormError("");
    setStep((s) => Math.min(s + 1, AGGREGATOR_FORM_STEPS.length));
  }

  function goBack() {
    setFormError("");
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  async function saveStage() {
    setSaving(true);
    setFormError("");

    try {
      const result = await submitAggregator({
        agentId: agent.id,
        form,
        ghanaCardPhotos,
        aggregatorPhoto,
      });

      await refreshPending();
      showSuccess(
        result === "queued" ? "Stage Queued Offline" : "Stage Saved",
        form.full_name
          ? `${form.full_name} stage details saved.`
          : "Aggregator stage progress saved."
      );
      navigate("/aggregators");
    } catch (err) {
      console.error("Save stage error:", err);
      setFormError(err instanceof Error ? err.message : "Could not save current stage.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!applyFieldValidation(validateStep(), setFieldErrors)) return;

    setSaving(true);
    setFormError("");

    try {
      const result = await submitAggregator({
        agentId: agent.id,
        form,
        ghanaCardPhotos,
        aggregatorPhoto,
      });

      await refreshPending();
      showSuccess(
        result === "queued" ? "Aggregator Submission Queued" : "Aggregator Saved",
        `${form.full_name} profile created successfully.`
      );
      navigate("/aggregators");
    } catch (err) {
      console.error("Submit aggregator error:", err);
      setFormError(
        err instanceof Error ? err.message : "Could not save aggregator. Check required fields."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main main--wide">
      <BackButton to="/aggregators" />
      <h2>Add Aggregator</h2>
      <p className="muted">An ID is generated automatically when you save.</p>

      <div className="step-progress">
        {AGGREGATOR_FORM_STEPS.map((s) => (
          <div
            key={s.id}
            className={`step-progress__item ${
              step === s.id ? "step-progress__item--active" : ""
            } ${step > s.id ? "step-progress__item--done" : ""}`}
          >
            <span className="step-progress__number">{s.id}</span>
            <span className="step-progress__label">{s.title}</span>
          </div>
        ))}
      </div>

      <div className="card card--form">
        <div className="section-header">{currentStep.title}</div>

        {formError && <p className="error">{formError}</p>}

        {step === 1 && (
          <StepAggregatorDetails
            form={form}
            errors={fieldErrors}
            onChange={updateField}
            onToggleCommodity={toggleCommodity}
            onToggleOther={toggleOther}
          />
        )}

        {step === 2 && (
          <StepAggregatorIdentity
            form={form}
            errors={fieldErrors}
            onChange={updateField}
            ghanaCardPhotos={ghanaCardPhotos}
            onGhanaCardPhotosChange={setGhanaCardPhotos}
            aggregatorPhoto={aggregatorPhoto}
            onAggregatorPhotoChange={setAggregatorPhoto}
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
              Save Stage
            </button>
          </div>

          <div className="form-actions__right">
            {step > 1 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={goBack}
                disabled={saving}
              >
                Previous
              </button>
            )}

            {step < AGGREGATOR_FORM_STEPS.length ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={goNext}
                disabled={saving}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save aggregator"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
