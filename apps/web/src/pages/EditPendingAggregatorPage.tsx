import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import type { CapturedPhoto } from "../lib/photos";
import { createCapturedPhoto } from "../lib/photos";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useToast } from "../context/ToastContext";
import { useRequireAuth } from "../hooks/useFarmers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
  type FieldValidation,
} from "../lib/form-validation";
import { getPendingAggregator, updatePendingAggregator } from "../lib/offline/store";
import type { PendingAggregatorRecord, StoredPhoto } from "../lib/offline/types";
import {
  StepAggregatorDetails,
  StepAggregatorIdentity,
} from "./aggregator-form/steps";
import {
  AGGREGATOR_FORM_STEPS,
  type AggregatorFormData,
} from "./aggregator-form/types";

function storedToCaptured(photo: StoredPhoto): CapturedPhoto {
  const file = new File([photo.data], photo.name, { type: photo.type });
  return createCapturedPhoto(file);
}

function toStoredPhoto(photo: CapturedPhoto): StoredPhoto {
  if (!photo.file) {
    throw new Error("Cannot store a server-only photo in offline pending record");
  }
  return {
    id: photo.id,
    name: photo.file.name,
    type: photo.file.type || "image/jpeg",
    data: photo.file,
  };
}

export function EditPendingAggregatorPage() {
  const { localId } = useParams<{ localId: string }>();
  const navigate = useNavigate();
  useRequireAuth();
  const { refreshPending } = useOfflineSyncContext();
  const { showSuccess } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AggregatorFormData | null>(null);
  const [baseRecord, setBaseRecord] = useState<PendingAggregatorRecord | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ghanaCardPhotos, setGhanaCardPhotos] = useState<CapturedPhoto[]>([]);
  const [aggregatorPhoto, setAggregatorPhoto] = useState<CapturedPhoto | null>(null);

  useEffect(() => {
    if (!localId) return;
    getPendingAggregator(localId).then((record) => {
      if (!record) {
        setError("Could not load aggregator.");
        setLoading(false);
        return;
      }
      setBaseRecord(record);
      setForm({ ...record.form });
      setGhanaCardPhotos(record.ghanaCardPhotos.map(storedToCaptured));
      setAggregatorPhoto(record.aggregatorPhoto ? storedToCaptured(record.aggregatorPhoto) : null);
      setLoading(false);
    });
  }, [localId]);

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
    if (!form || !baseRecord) return;
    if (!applyFieldValidation(validateStep(), setFieldErrors)) return;

    setSaving(true);
    setFormError("");

    try {
      const updated: PendingAggregatorRecord = {
        ...baseRecord,
        form: { ...form },
        ghanaCardPhotos: ghanaCardPhotos.map(toStoredPhoto),
        aggregatorPhoto: aggregatorPhoto ? toStoredPhoto(aggregatorPhoto) : null,
      };

      await updatePendingAggregator(updated);
      await refreshPending();
      showSuccess("Pending Aggregator Updated", `${form.full_name} details saved locally.`);
      navigate(`/aggregators/pending/${baseRecord.localId}`);
    } catch (err) {
      console.error("Update pending aggregator error:", err);
      setFormError(
        err instanceof Error ? err.message : "Could not save aggregator. Check required fields."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading pending aggregator…</p>
      </main>
    );
  }

  if (error || !form) {
    return (
      <main className="main main--wide">
        <BackButton to="/aggregators" />
        <p className="error">{error || "Pending aggregator not found."}</p>
      </main>
    );
  }

  return (
    <main className="main main--wide">
      <BackButton to={`/aggregators/pending/${localId}`} />
      <h2>Edit Pending Aggregator: {form.full_name || "Draft (Unnamed)"}</h2>

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
