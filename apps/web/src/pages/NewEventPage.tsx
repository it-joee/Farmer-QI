import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import {
  EventFormFields,
  eventFormToSubmitInput,
  validateEventForm,
  type EventFormValues,
} from "../components/EventFormFields";
import { getCurrentUser } from "../auth";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useRequireAuth } from "../hooks/useFarmers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
} from "../lib/form-validation";
import { submitEvent } from "../lib/offline/event-sync";

const INITIAL_VALUES: EventFormValues = {
  title: "",
  eventDate: new Date().toISOString().slice(0, 10),
  communityLocation: "",
  description: "",
  district: "",
  mofaOfficer: "",
};

const EVENT_FIELD_IDS: Record<keyof EventFormValues, string> = {
  title: "event-title",
  eventDate: "event-date",
  communityLocation: "event-community-location",
  district: "event-district",
  mofaOfficer: "event-mofa-officer",
  description: "event-description",
};

export function NewEventPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { refreshPending } = useOfflineSyncContext();
  const [values, setValues] = useState<EventFormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  function handleChange<K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => clearFieldError(prev, EVENT_FIELD_IDS[field]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const actor = getCurrentUser();
    if (!actor) return;

    if (!applyFieldValidation(validateEventForm(values), setFieldErrors)) return;

    setSaving(true);
    setFormError("");

    try {
      const outcome = await submitEvent(eventFormToSubmitInput(values, actor.id));

      await refreshPending();

      if (outcome.result === "queued" && outcome.localId) {
        navigate(`/events/pending/${outcome.localId}`);
        return;
      }

      if (outcome.eventId) {
        navigate(`/events/${outcome.eventId}`);
      }
    } catch {
      setFormError("Could not create event. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main main--wide">
      <BackButton fallback="/events" />
      <h2>New event</h2>
      <p className="muted">Saved on this device if offline, then synced automatically when online.</p>

      <form className="card card--form" onSubmit={handleSubmit}>
        {formError && <p className="error">{formError}</p>}

        <EventFormFields values={values} errors={fieldErrors} onChange={handleChange} />

        <div className="form-actions">
          <span />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Create event"}
          </button>
        </div>
      </form>
    </main>
  );
}
