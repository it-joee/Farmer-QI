import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { GpsPin } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import type { CapturedPhoto } from "../lib/photos";
import { createCapturedPhoto } from "../lib/photos";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { getPendingFarmer } from "../lib/offline/sync";
import { updatePendingFarmer } from "../lib/offline/store";
import type { PendingFarmerRecord, StoredPhoto } from "../lib/offline/types";
import { StepFarmBoundary, StepIdentity, StepLocation, StepPersonal } from "./farmer-form/steps";
import {
  EDIT_FORM_STEPS,
  type FarmerFormData,
} from "./farmer-form/types";

function storedToCaptured(photo: StoredPhoto): CapturedPhoto {
  const file = new File([photo.data], photo.name, { type: photo.type });
  return createCapturedPhoto(file);
}

function toStoredPhoto(photo: CapturedPhoto): StoredPhoto {
  return {
    id: photo.id,
    name: photo.file.name,
    type: photo.file.type || "image/jpeg",
    data: photo.file,
  };
}

export function EditPendingFarmerPage() {
  const { localId } = useParams<{ localId: string }>();
  const navigate = useNavigate();
  useRequireAuth();
  const { refreshPending } = useOfflineSyncContext();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FarmerFormData | null>(null);
  const [baseRecord, setBaseRecord] = useState<PendingFarmerRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ghanaCardPhotos, setGhanaCardPhotos] = useState<CapturedPhoto[]>([]);
  const [farmerPhoto, setFarmerPhoto] = useState<CapturedPhoto | null>(null);
  const [boundaryEnabled, setBoundaryEnabled] = useState(false);
  const [boundaryPins, setBoundaryPins] = useState<GpsPin[]>([]);

  useEffect(() => {
    if (!localId) return;
    getPendingFarmer(localId).then((record) => {
      if (!record) {
        setError("Could not load farmer.");
        setLoading(false);
        return;
      }
      setBaseRecord(record);
      setForm({ ...record.form });
      setGhanaCardPhotos(record.ghanaCardPhotos.map(storedToCaptured));
      setFarmerPhoto(record.farmerPhoto ? storedToCaptured(record.farmerPhoto) : null);
      setBoundaryEnabled(record.boundaryEnabled);
      setBoundaryPins(record.boundaryPins ?? []);
      setLoading(false);
    });
  }, [localId]);

  const currentStep = EDIT_FORM_STEPS[step - 1];

  function updateField(field: keyof FarmerFormData, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function toggleCommodity(commodity: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            primary_crops: prev.primary_crops.includes(commodity)
              ? prev.primary_crops.filter((c) => c !== commodity)
              : [...prev.primary_crops, commodity],
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

  function validateStep(): string | null {
    if (!form) return "Form not loaded.";
    if (step === 1 && !form.full_name.trim()) return "Full name is required.";
    if (step === 2 && !form.community.trim()) return "Community / village is required.";
    if (step === 4 && boundaryEnabled && boundaryPins.length > 0 && boundaryPins.length < 3) {
      return "Drop at least 3 GPS points to define the farm boundary.";
    }
    return null;
  }

  function goNext() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, EDIT_FORM_STEPS.length));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!form || !localId || !baseRecord) return;
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    setError("");

    const updated: PendingFarmerRecord = {
      ...baseRecord,
      form,
      ghanaCardPhotos: ghanaCardPhotos.map(toStoredPhoto),
      farmerPhoto: farmerPhoto ? toStoredPhoto(farmerPhoto) : null,
      boundaryEnabled,
      boundaryPins,
      status: "pending",
      lastError: undefined,
    };

    try {
      await updatePendingFarmer(updated);
      await refreshPending();
      navigate(`/farmers/pending/${localId}`);
    } catch {
      setError("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!form || error === "Could not load farmer.") {
    return (
      <main className="main main--wide">
        <BackButton />
        <p className="error">{error || "Farmer not found."}</p>
      </main>
    );
  }

  return (
    <main className="main main--wide">
      <BackButton />
      <h2>Edit farmer</h2>
      <p className="muted">Changes are saved on this device until sync succeeds.</p>

      <div className="step-progress">
        {EDIT_FORM_STEPS.map((s) => (
          <div
            key={s.id}
            className={`step-progress__item ${step === s.id ? "step-progress__item--active" : ""} ${step > s.id ? "step-progress__item--done" : ""}`}
          >
            <span className="step-progress__number">{s.id}</span>
            <span className="step-progress__label">{s.title}</span>
          </div>
        ))}
      </div>

      <div className="card card--form">
        <div className="section-header">{currentStep.title}</div>
        {error && error !== "Could not load farmer." && <p className="error">{error}</p>}

        {step === 1 && (
          <StepPersonal
            form={form}
            onChange={updateField}
            onToggleCommodity={toggleCommodity}
            onToggleOther={toggleOther}
          />
        )}
        {step === 2 && <StepLocation form={form} onChange={updateField} />}
        {step === 3 && (
          <StepIdentity
            form={form}
            onChange={updateField}
            ghanaCardPhotos={ghanaCardPhotos}
            onGhanaCardPhotosChange={setGhanaCardPhotos}
            farmerPhoto={farmerPhoto}
            onFarmerPhotoChange={setFarmerPhoto}
          />
        )}
        {step === 4 && (
          <StepFarmBoundary
            enabled={boundaryEnabled}
            onEnabledChange={setBoundaryEnabled}
            pins={boundaryPins}
            onPinsChange={setBoundaryPins}
          />
        )}

        <div className="form-actions">
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={goBack}>
              Previous
            </button>
          ) : (
            <span />
          )}
          {step < EDIT_FORM_STEPS.length ? (
            <button type="button" className="btn btn-primary" onClick={goNext}>
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
