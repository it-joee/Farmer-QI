import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import type { CapturedPhoto } from "../lib/photos";
import type { GpsPin } from "@farmeriq/shared";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { submitFarmer } from "../lib/offline/sync";
import { useRequireAuth } from "../hooks/useFarmers";
import { StepFarmBoundary, StepIdentity, StepLocation, StepPersonal } from "./farmer-form/steps";
import { EMPTY_FORM, FORM_STEPS, type FarmerFormData } from "./farmer-form/types";

export function AddFarmerPage() {
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { refreshPending } = useOfflineSyncContext();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FarmerFormData>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ghanaCardPhotos, setGhanaCardPhotos] = useState<CapturedPhoto[]>([]);
  const [farmerPhoto, setFarmerPhoto] = useState<CapturedPhoto | null>(null);
  const [boundaryEnabled, setBoundaryEnabled] = useState(false);
  const [boundaryPins, setBoundaryPins] = useState<GpsPin[]>([]);

  if (!user) return null;

  const agent = user;
  const currentStep = FORM_STEPS[step - 1];

  function updateField(field: keyof FarmerFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleCommodity(commodity: string) {
    setForm((prev) => ({
      ...prev,
      primary_crops: prev.primary_crops.includes(commodity)
        ? prev.primary_crops.filter((c) => c !== commodity)
        : [...prev.primary_crops, commodity],
    }));
  }

  function toggleOther(enabled: boolean) {
    setForm((prev) => ({
      ...prev,
      other_commodity_enabled: enabled,
      other_commodity: enabled ? prev.other_commodity : "",
    }));
  }

  function validateStep(): string | null {
    if (step === 1 && !form.full_name.trim()) {
      return "Full name is required.";
    }
    if (step === 2 && !form.community.trim()) {
      return "Community / village is required.";
    }
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
    setStep((s) => Math.min(s + 1, FORM_STEPS.length));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await submitFarmer({
        agentId: agent.id,
        form,
        ghanaCardPhotos,
        farmerPhoto,
        boundaryEnabled,
        boundaryPins,
      });

      await refreshPending();

      if (result === "queued") {
        navigate("/farmers");
        return;
      }

      navigate("/farmers");
    } catch {
      setError("Could not save farmer. Check required fields.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main main--wide">
      <BackButton />
        <h2>Add Farmer</h2>
        <p className="muted">A system ID is generated automatically when you save.</p>

        <div className="step-progress">
          {FORM_STEPS.map((s) => (
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

          {error && <p className="error">{error}</p>}

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

            {step < FORM_STEPS.length ? (
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
                {saving ? "Saving…" : "Save farmer"}
              </button>
            )}
          </div>
        </div>
    </main>
  );
}
