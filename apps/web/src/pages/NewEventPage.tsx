import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import {
  EventFormFields,
  eventFormToSubmitInput,
  type EventFormValues,
} from "../components/EventFormFields";
import { getCurrentUser } from "../auth";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { submitEvent } from "../lib/offline/event-sync";

const INITIAL_VALUES: EventFormValues = {
  title: "",
  eventDate: new Date().toISOString().slice(0, 10),
  communityLocation: "",
  description: "",
  district: "",
  mofaOfficer: "",
};

export function NewEventPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { refreshPending } = useOfflineSyncContext();
  const [values, setValues] = useState<EventFormValues>(INITIAL_VALUES);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  function handleChange<K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const actor = getCurrentUser();
    if (!actor) return;

    if (!values.title.trim()) {
      setError("Event title is required.");
      return;
    }
    if (!values.eventDate) {
      setError("Event date is required.");
      return;
    }

    setSaving(true);
    setError("");

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
      setError("Could not create event. Try again.");
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
        {error && <p className="error">{error}</p>}

        <EventFormFields values={values} onChange={handleChange} />

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
