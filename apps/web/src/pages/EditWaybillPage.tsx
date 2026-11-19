import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { WaybillPhoto } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { useAllAggregators } from "../hooks/useAggregators";
import { useDrivers } from "../hooks/useDrivers";
import { useRequireAuth } from "../hooks/useFarmers";
import { useAllOfftakers } from "../hooks/useOfftakers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
} from "../lib/form-validation";
import {
  collectRemovedServerPhotoIds,
  mergeRemovedServerPhotoIds,
  type CapturedPhoto,
} from "../lib/photos";
import { AGGREGATORS_SYNCED_EVENT } from "../lib/offline/aggregator-sync";
import { OFFTAKERS_SYNCED_EVENT } from "../lib/offline/offtaker-sync";
import {
  checkWaybillConflicts,
  existingWaybillPhotoToCaptured,
  fetchWaybill,
  fetchWaybillPhotos,
  syncWaybillPhotoChanges,
  updateWaybill,
} from "../lib/waybills";
import {
  StepWaybillCommodity,
  StepWaybillRoute,
  StepWaybillTransport,
} from "./waybill-form/steps";
import {
  WAYBILL_FORM_STEPS,
  applyAggregatorSelection,
  applyDriverSelection,
  applyOfftakerSelection,
  applyWeightKgChange,
  applyWeightTonsChange,
  validateAllWaybillRequiredFields,
  validateWaybillKeyFields,
  waybillFormToPayload,
  waybillToFormData,
  type WaybillFormData,
} from "./waybill-form/types";

export function EditWaybillPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { confirm } = useConfirmDialog();
  const { showSuccess } = useToast();

  const { offtakers } = useAllOfftakers();
  const { aggregators } = useAllAggregators();
  const { drivers } = useDrivers(1, 500);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WaybillFormData | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [truckPhotos, setTruckPhotos] = useState<CapturedPhoto[]>([]);
  const [docPhotos, setDocPhotos] = useState<CapturedPhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchWaybill(id), fetchWaybillPhotos(id)])
      .then(([waybill, photos]: [Awaited<ReturnType<typeof fetchWaybill>>, WaybillPhoto[]]) => {
        setForm(waybillToFormData(waybill));
        setTruckPhotos(
          photos
            .filter((p) => p.photo_type === "truck")
            .map(existingWaybillPhotoToCaptured)
        );
        setDocPhotos(
          photos
            .filter((p) => p.photo_type === "waybill_doc")
            .map(existingWaybillPhotoToCaptured)
        );
        setRemovedPhotoIds([]);
      })
      .catch(() => setError("Could not load waybill."))
      .finally(() => setLoading(false));
  }, [id]);

  if (!user) return null;

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading waybill…</p>
      </main>
    );
  }

  if (error || !form || !id) {
    return (
      <main className="main main--wide">
        <BackButton to="/waybills" />
        <p className="error">{error || "Waybill not found."}</p>
      </main>
    );
  }

  const currentStep = WAYBILL_FORM_STEPS[step - 1];

  function updateField(field: keyof WaybillFormData, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setFieldErrors((prev) => clearFieldError(prev, field));
  }

  function handleTruckPhotosChange(next: CapturedPhoto[]) {
    const removed = collectRemovedServerPhotoIds(truckPhotos, next);
    if (removed.length > 0) {
      setRemovedPhotoIds((prev) => mergeRemovedServerPhotoIds(prev, ...removed));
    }
    setTruckPhotos(next);
  }

  function handleDocPhotosChange(next: CapturedPhoto[]) {
    const removed = collectRemovedServerPhotoIds(docPhotos, next);
    if (removed.length > 0) {
      setRemovedPhotoIds((prev) => mergeRemovedServerPhotoIds(prev, ...removed));
    }
    setDocPhotos(next);
  }

  async function goNext() {
    if (!form) return;
    if (!applyFieldValidation(validateWaybillKeyFields(form, step), setFieldErrors)) {
      return;
    }
    if (step === 1 && form.waybill_number.trim()) {
      const check = await checkWaybillConflicts(waybillFormToPayload(form), id);
      if (check.duplicate_number) {
        applyFieldValidation(
          { fieldId: "waybill_number", message: check.duplicate_number.message },
          setFieldErrors
        );
        return;
      }
    }
    setFormError("");
    setStep((s) => Math.min(s + 1, WAYBILL_FORM_STEPS.length));
  }

  function goBack() {
    setFormError("");
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSave(isPartialSave = false) {
    if (!form || !id) return;
    if (isPartialSave) {
      const keyError = validateWaybillKeyFields(form, 1);
      if (keyError) {
        setStep(1);
        applyFieldValidation(keyError, setFieldErrors);
        return;
      }
    } else {
      const allError = validateAllWaybillRequiredFields(form);
      if (allError) {
        setStep(allError.step);
        setTimeout(() => applyFieldValidation(allError.validation, setFieldErrors), 0);
        return;
      }
    }

    setSaving(true);
    setFormError("");

    try {
      const payload = waybillFormToPayload(form);
      const conflictCheck = await checkWaybillConflicts(payload, id);
      if (conflictCheck.duplicate_number) {
        setStep(1);
        setTimeout(
          () =>
            applyFieldValidation(
              { fieldId: "waybill_number", message: conflictCheck.duplicate_number!.message },
              setFieldErrors
            ),
          0
        );
        setSaving(false);
        return;
      }

      if (conflictCheck.warnings.length > 0) {
        const proceed = await confirm({
          title: "Possible Duplicate / Conflict Detected",
          message: (
            <div style={{ textAlign: "left" }}>
              <p style={{ margin: "0 0 0.5rem" }}>
                This waybill matches existing dispatch details:
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {conflictCheck.warnings.map((w, idx) => (
                  <li key={idx}>{w.message}</li>
                ))}
              </ul>
            </div>
          ),
          confirmText: "Save Anyway",
          variant: "warning",
        });
        if (!proceed) {
          setSaving(false);
          return;
        }
      }

      const { waybill } = await updateWaybill(id, payload);
      const hasPhotoChanges =
        removedPhotoIds.length > 0 ||
        truckPhotos.some((p) => p.file) ||
        docPhotos.some((p) => p.file);
      if (hasPhotoChanges) {
        await syncWaybillPhotoChanges(waybill.id, truckPhotos, docPhotos, removedPhotoIds);
      }
      if (!form.offtaker_id && form.buyer_name.trim()) {
        window.dispatchEvent(new Event(OFFTAKERS_SYNCED_EVENT));
      }
      if (
        !form.aggregator_id &&
        form.aggregator_name.trim() &&
        form.aggregator_name.trim().toLowerCase() !== "direct company sourcing"
      ) {
        window.dispatchEvent(new Event(AGGREGATORS_SYNCED_EVENT));
      }

      showSuccess("Waybill Updated", `Waybill ${waybill.waybill_number} updated successfully.`);
      navigate(`/waybills/${waybill.id}`);
    } catch (err) {
      console.error("Update waybill error:", err);
      setFormError(
        err instanceof Error ? err.message : "Could not update waybill. Check required fields."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main main--wide">
      <BackButton to={`/waybills/${id}`} />

      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Edit Waybill: {form.waybill_number || "Waybill"}</h2>
        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
          Update dispatch details, delivery status, weighbridge weights, or photos.
        </p>
      </div>

      <div className="step-progress step-progress--3">
        {WAYBILL_FORM_STEPS.map((s) => (
          <div
            key={s.id}
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            onClick={() => {
              setFormError("");
              setFieldErrors({});
              setStep(s.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setFormError("");
                setFieldErrors({});
                setStep(s.id);
              }
            }}
            className={`step-progress__item ${step === s.id ? "step-progress__item--active" : ""} ${
              step > s.id ? "step-progress__item--done" : ""
            }`}
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
          <StepWaybillRoute
            form={form}
            errors={fieldErrors}
            offtakers={offtakers}
            aggregators={aggregators}
            onChange={updateField}
            onSelectOfftaker={(val) => {
              setForm((prev) => (prev ? applyOfftakerSelection(prev, val, offtakers) : prev));
              setFieldErrors((prev) => clearFieldError(clearFieldError(prev, "buyer_selection"), "buyer_name"));
            }}
            onSelectAggregator={(val) =>
              setForm((prev) => (prev ? applyAggregatorSelection(prev, val, aggregators) : prev))
            }
          />
        )}

        {step === 2 && (
          <StepWaybillCommodity
            form={form}
            errors={fieldErrors}
            onChange={updateField}
            onWeightKgChange={(kg) => {
              setForm((prev) => (prev ? applyWeightKgChange(prev, kg) : prev));
              setFieldErrors((prev) => clearFieldError(prev, "weight_kg"));
            }}
            onWeightTonsChange={(tons) => {
              setForm((prev) => (prev ? applyWeightTonsChange(prev, tons) : prev));
              setFieldErrors((prev) => clearFieldError(prev, "weight_kg"));
            }}
          />
        )}

        {step === 3 && (
          <StepWaybillTransport
            form={form}
            errors={fieldErrors}
            drivers={drivers}
            truckPhotos={truckPhotos}
            docPhotos={docPhotos}
            onChange={updateField}
            onSelectDriver={(driverId) => {
              setForm((prev) => (prev ? applyDriverSelection(prev, driverId, drivers) : prev));
              setFieldErrors((prev) => clearFieldError(prev, "truck_number"));
            }}
            onTruckPhotosChange={handleTruckPhotosChange}
            onDocPhotosChange={handleDocPhotosChange}
          />
        )}

        <div className="form-actions form-actions--draft">
          <div className="form-actions__left">
            {step < WAYBILL_FORM_STEPS.length && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => void handleSave(true)}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            )}
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

            {step < WAYBILL_FORM_STEPS.length ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void goNext()}
                disabled={saving}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
