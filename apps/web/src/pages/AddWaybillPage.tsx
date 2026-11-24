import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { FormStepProgress } from "../components/FormStepProgress";
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
import type { CapturedPhoto } from "../lib/photos";
import { AGGREGATORS_SYNCED_EVENT } from "../lib/offline/aggregator-sync";
import { OFFTAKERS_SYNCED_EVENT } from "../lib/offline/offtaker-sync";
import { checkWaybillConflicts, createWaybill, uploadWaybillPhotos } from "../lib/waybills";
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
  createEmptyWaybillForm,
  validateAllWaybillRequiredFields,
  validateWaybillKeyFields,
  waybillFormToPayload,
  type WaybillFormData,
} from "./waybill-form/types";

export function AddWaybillPage() {
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { confirm } = useConfirmDialog();
  const { showSuccess } = useToast();

  const { offtakers } = useAllOfftakers();
  const { aggregators } = useAllAggregators();
  const { drivers } = useDrivers(1, 500);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WaybillFormData>(createEmptyWaybillForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [truckPhotos, setTruckPhotos] = useState<CapturedPhoto[]>([]);
  const [docPhotos, setDocPhotos] = useState<CapturedPhoto[]>([]);

  if (!user) return null;

  const currentStep = WAYBILL_FORM_STEPS[step - 1];

  function updateField(field: keyof WaybillFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => clearFieldError(prev, field));
  }

  async function goNext() {
    if (!applyFieldValidation(validateWaybillKeyFields(form, step), setFieldErrors)) {
      return;
    }
    if (step === 1 && form.waybill_number.trim()) {
      const check = await checkWaybillConflicts(waybillFormToPayload(form));
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

  async function persistWaybill(isStageSave: boolean) {
    if (isStageSave) {
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
      const conflictCheck = await checkWaybillConflicts(payload);
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

      const { waybill } = await createWaybill(payload);
      if (truckPhotos.length > 0 || docPhotos.length > 0) {
        await uploadWaybillPhotos(waybill.id, truckPhotos, docPhotos);
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

      showSuccess(
        isStageSave ? "Waybill Stage Saved" : "Waybill Saved",
        `Waybill ${waybill.waybill_number} recorded successfully.`
      );
      navigate(`/waybills/${waybill.id}`);
    } catch (err) {
      console.error("Save waybill error:", err);
      setFormError(
        err instanceof Error ? err.message : "Could not save waybill. Check required fields."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main main--wide">
      <BackButton to="/waybills" />

      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Add Waybill</h2>
        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
          Enter key dispatch details now and update additional fields or photos anytime.
        </p>
      </div>

      <FormStepProgress steps={WAYBILL_FORM_STEPS} currentStep={step} />

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
              setForm((prev) => applyOfftakerSelection(prev, val, offtakers));
              setFieldErrors((prev) => clearFieldError(clearFieldError(prev, "buyer_selection"), "buyer_name"));
            }}
            onSelectAggregator={(val) =>
              setForm((prev) => applyAggregatorSelection(prev, val, aggregators))
            }
          />
        )}

        {step === 2 && (
          <StepWaybillCommodity
            form={form}
            errors={fieldErrors}
            onChange={updateField}
            onWeightKgChange={(kg) => {
              setForm((prev) => applyWeightKgChange(prev, kg));
              setFieldErrors((prev) => clearFieldError(prev, "weight_kg"));
            }}
            onWeightTonsChange={(tons) => {
              setForm((prev) => applyWeightTonsChange(prev, tons));
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
              setForm((prev) => applyDriverSelection(prev, driverId, drivers));
              setFieldErrors((prev) => clearFieldError(prev, "truck_number"));
            }}
            onTruckPhotosChange={setTruckPhotos}
            onDocPhotosChange={setDocPhotos}
          />
        )}

        <div className="form-actions form-actions--draft">
          <div className="form-actions__left">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void persistWaybill(true)}
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
                onClick={() => void persistWaybill(false)}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save waybill"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
