import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useToast } from "../context/ToastContext";
import { useRequireAuth } from "../hooks/useFarmers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
  type FieldValidation,
} from "../lib/form-validation";
import {
  getPendingOfftaker,
  updatePendingOfftaker,
} from "../lib/offline/store";
import type { PendingOfftakerRecord } from "../lib/offline/types";
import { StepOfftakerDetails } from "./offtaker-form/steps";
import {
  EMPTY_OFFTAKER_FORM,
  OFFTAKER_FORM_STEPS,
  type OfftakerFormData,
} from "./offtaker-form/types";

export function EditPendingOfftakerPage() {
  const { localId } = useParams<{ localId: string }>();
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { refreshPending } = useOfflineSyncContext();
  const { showSuccess } = useToast();

  const [record, setRecord] = useState<PendingOfftakerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OfftakerFormData>(EMPTY_OFFTAKER_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!localId) return;
      try {
        const r = await getPendingOfftaker(localId);
        if (!r) throw new Error("Not found");
        setRecord(r);
        setForm(r.form);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Not found");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [localId]);

  if (!user) return null;
  if (loading) return <div className="p-xl text-center">Loading…</div>;
  if (loadError || !record) {
    return <div className="p-xl text-center error">{loadError || "Record not found"}</div>;
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
      const updated: PendingOfftakerRecord = {
        ...record!,
        form,
      };

      await updatePendingOfftaker(updated);
      await refreshPending();
      showSuccess("Draft Updated", "Changes saved to offline draft.");
      navigate(`/pending-offtakers/${localId}`);
    } catch (err) {
      console.error("Update draft error:", err);
      setFormError(err instanceof Error ? err.message : "Could not update draft.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main main--wide">
      <BackButton to={`/pending-offtakers/${localId}`} />
      <h2>Edit Draft Offtaker</h2>
      <p className="muted">Updating pending record</p>

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
