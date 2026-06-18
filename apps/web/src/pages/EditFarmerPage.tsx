import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { GpsPin } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import type { CapturedPhoto } from "../lib/photos";
import { uploadFarmerPhotos } from "../lib/photos";
import { fetchFarmer, updateFarmer } from "../lib/farmers";
import { fetchFarmerPlots, updateFarmPlot, uploadFarmPlot } from "../lib/plots";
import { useRequireAuth } from "../hooks/useFarmers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
  type FieldValidation,
} from "../lib/form-validation";
import { StepFarmBoundary, StepIdentity, StepLocation, StepPersonal } from "./farmer-form/steps";
import {
  EDIT_FORM_STEPS,
  farmerToFormData,
  type FarmerFormData,
} from "./farmer-form/types";

export function EditFarmerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useRequireAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FarmerFormData | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ghanaCardPhotos, setGhanaCardPhotos] = useState<CapturedPhoto[]>([]);
  const [farmerPhoto, setFarmerPhoto] = useState<CapturedPhoto | null>(null);
  const [plotId, setPlotId] = useState<string | null>(null);
  const [boundaryEnabled, setBoundaryEnabled] = useState(false);
  const [boundaryPins, setBoundaryPins] = useState<GpsPin[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchFarmer(id), fetchFarmerPlots(id)])
      .then(([farmer, plots]) => {
        setForm(farmerToFormData(farmer));
        const plot = plots[0];
        if (plot) {
          setPlotId(plot.id);
          const pins = plot.gps_accuracy_notes ?? [];
          setBoundaryPins(pins);
          setBoundaryEnabled(pins.length >= 3 || !!plot.boundary);
        }
      })
      .catch(() => setError("Could not load farmer."))
      .finally(() => setLoading(false));
  }, [id]);

  if (!user) return null;

  const currentStep = EDIT_FORM_STEPS[step - 1];

  function updateField(field: keyof FarmerFormData, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setFieldErrors((prev) => clearFieldError(prev, field));
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

  function validateStep(): FieldValidation | null {
    if (!form) return null;
    if (step === 1 && !form.full_name.trim()) {
      return { fieldId: "full_name", message: "Full name is required." };
    }
    if (step === 2 && !form.community.trim()) {
      return { fieldId: "community", message: "Community / village is required." };
    }
    if (step === 4 && boundaryEnabled && boundaryPins.length > 0 && boundaryPins.length < 3) {
      return {
        fieldId: "farm-boundary",
        message: "Drop at least 3 GPS points to define the farm boundary.",
      };
    }
    return null;
  }

  function goNext() {
    if (!applyFieldValidation(validateStep(), setFieldErrors)) return;
    setFormError("");
    setStep((s) => Math.min(s + 1, EDIT_FORM_STEPS.length));
  }

  function goBack() {
    setFormError("");
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!form || !id || !user) return;
    if (!applyFieldValidation(validateStep(), setFieldErrors)) return;

    setSaving(true);
    setFormError("");

    try {
      await updateFarmer(id, form, user.id);
      if (ghanaCardPhotos.length > 0 || farmerPhoto) {
        await uploadFarmerPhotos(id, ghanaCardPhotos, farmerPhoto);
      }
      if (boundaryEnabled && boundaryPins.length >= 3) {
        if (plotId) {
          await updateFarmPlot(id, plotId, boundaryPins, user.id);
        } else {
          await uploadFarmPlot(id, boundaryPins, user.id);
        }
      }
      navigate(`/farmers/${id}`);
    } catch {
      setFormError("Could not save changes.");
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
      <p className="muted">Update profile details and farm GPS boundary.</p>

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

        {formError && <p className="error">{formError}</p>}

        {step === 1 && (
          <StepPersonal
            form={form}
            errors={fieldErrors}
            onChange={updateField}
            onToggleCommodity={toggleCommodity}
            onToggleOther={toggleOther}
          />
        )}
        {step === 2 && (
          <StepLocation form={form} errors={fieldErrors} onChange={updateField} />
        )}
        {step === 3 && (
          <StepIdentity
            form={form}
            errors={fieldErrors}
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
            error={fieldErrors["farm-boundary"]}
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
