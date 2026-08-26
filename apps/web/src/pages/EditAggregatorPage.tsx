import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { AggregatorPhoto } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import type { CapturedPhoto } from "../lib/photos";
import {
  collectRemovedServerPhotoIds,
  existingAggregatorPhotoToCaptured,
  mergeRemovedServerPhotoIds,
  syncAggregatorPhotoChanges,
} from "../lib/photos";
import {
  fetchAggregator,
  updateAggregator,
  fetchAggregatorPhotos,
} from "../lib/aggregators";
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
  AGGREGATOR_FORM_STEPS,
  aggregatorToFormData,
  type AggregatorFormData,
} from "./aggregator-form/types";
import { useToast } from "../context/ToastContext";

export function EditAggregatorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { showSuccess } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AggregatorFormData | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ghanaCardPhotos, setGhanaCardPhotos] = useState<CapturedPhoto[]>([]);
  const [aggregatorPhoto, setAggregatorPhoto] = useState<CapturedPhoto | null>(null);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchAggregator(id), fetchAggregatorPhotos(id)])
      .then(([aggregator, photos]: [any, AggregatorPhoto[]]) => {
        setForm(aggregatorToFormData(aggregator));
        setGhanaCardPhotos(
          photos
            .filter((photo: AggregatorPhoto) => photo.photo_type === "ghana_card")
            .map(existingAggregatorPhotoToCaptured)
        );
        const portrait = photos.find((photo: AggregatorPhoto) => photo.photo_type === "portrait");
        setAggregatorPhoto(portrait ? existingAggregatorPhotoToCaptured(portrait) : null);
        setRemovedPhotoIds([]);
      })
      .catch(() => setError("Could not load aggregator."))
      .finally(() => setLoading(false));
  }, [id]);

  if (!user) return null;

  const currentStep = AGGREGATOR_FORM_STEPS[step - 1];

  function updateField(field: keyof AggregatorFormData, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setFieldErrors((prev) => clearFieldError(prev, field));
  }

  function toggleCommodity(commodity: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            commodities: prev.commodities.includes(commodity)
              ? prev.commodities.filter((c) => c !== commodity)
              : [...prev.commodities, commodity],
          }
        : prev
    );
  }

  function toggleOther(enabled: boolean) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            other_commodity_enabled: enabled,
            other_commodity: enabled ? prev.other_commodity : "",
          }
        : prev
    );
  }

  function handleGhanaCardPhotosChange(nextPhotos: CapturedPhoto[]) {
    const removed = collectRemovedServerPhotoIds(ghanaCardPhotos, nextPhotos);
    if (removed.length > 0) {
      setRemovedPhotoIds((prev) => mergeRemovedServerPhotoIds(prev, ...removed));
    }
    setGhanaCardPhotos(nextPhotos);
  }

  function handleAggregatorPhotoChange(nextPhoto: CapturedPhoto | null) {
    if (aggregatorPhoto?.serverPhotoId && (!nextPhoto || nextPhoto.id !== aggregatorPhoto.id)) {
      setRemovedPhotoIds((prev) =>
        mergeRemovedServerPhotoIds(prev, aggregatorPhoto.serverPhotoId!)
      );
    }
    setAggregatorPhoto(nextPhoto);
  }

  function validateStep(): FieldValidation | null {
    if (step === 1 && !form?.full_name.trim()) {
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

  async function handleSubmit() {
    if (!form || !id) return;
    if (!applyFieldValidation(validateStep(), setFieldErrors)) return;

    setSaving(true);
    setFormError("");

    try {
      await updateAggregator(id, form, user!.id);
      await syncAggregatorPhotoChanges(
        id,
        ghanaCardPhotos,
        aggregatorPhoto,
        removedPhotoIds
      );

      showSuccess("Aggregator Updated", `${form.full_name} details updated.`);
      navigate(`/aggregators/${id}`);
    } catch (err) {
      console.error("Update aggregator error:", err);
      setFormError(
        err instanceof Error ? err.message : "Could not update aggregator. Check required fields."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading aggregator…</p>
      </main>
    );
  }

  if (error || !form) {
    return (
      <main className="main main--wide">
        <BackButton to="/aggregators" />
        <p className="error">{error || "Aggregator not found."}</p>
      </main>
    );
  }

  return (
    <main className="main main--wide">
      <BackButton to={`/aggregators/${id}`} />
      <h2>Edit Aggregator: {form.full_name || "Unnamed"}</h2>

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
            onGhanaCardPhotosChange={handleGhanaCardPhotosChange}
            aggregatorPhoto={aggregatorPhoto}
            onAggregatorPhotoChange={handleAggregatorPhotoChange}
          />
        )}

        <div className="form-actions">
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
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
