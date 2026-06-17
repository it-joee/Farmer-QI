import { useCallback, useEffect, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import {
  EventFormFields,
  eventFormToSubmitInput,
  eventFormToUpdatePayload,
  type EventFormValues,
  valuesFromEvent,
} from "../components/EventFormFields";
import { getCurrentUser } from "../auth";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { fetchEvent, isEventUpcoming, updateEvent } from "../lib/events";
import { getPendingEvent, updatePendingEventDetails } from "../lib/offline/event-sync";

export function EditEventPage() {
  const { id, localId } = useParams<{ id?: string; localId?: string }>();
  const pendingEditMatch = useMatch("/events/pending/:localId/edit");
  const pendingLocalId = pendingEditMatch?.params.localId ?? localId;
  const isPendingEvent = Boolean(pendingLocalId);
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { refreshPending } = useOfflineSyncContext();
  const [values, setValues] = useState<EventFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (isPendingEvent && pendingLocalId) {
        const record = await getPendingEvent(pendingLocalId);
        if (!record) {
          setError("Could not load event.");
          setValues(null);
          return;
        }
        setValues(valuesFromEvent(record));
        return;
      }

      if (!id) return;

      const event = await fetchEvent(id);
      if (!isEventUpcoming(event.event_date)) {
        setError("This event has already passed and cannot be edited.");
        setValues(null);
        return;
      }
      setValues(valuesFromEvent(event));
    } catch {
      setError("Could not load event.");
      setValues(null);
    } finally {
      setLoading(false);
    }
  }, [id, isPendingEvent, pendingLocalId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  function handleChange<K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) {
    setValues((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  if (!user) return null;

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading event…</p>
      </main>
    );
  }

  if (!values || error === "Could not load event.") {
    return (
      <main className="main main--wide">
        <BackButton fallback="/events" />
        <p className="error">{error || "Event not found."}</p>
      </main>
    );
  }

  if (error === "This event has already passed and cannot be edited.") {
    return (
      <main className="main main--wide">
        <BackButton fallback={id ? `/events/${id}` : "/events"} />
        <p className="error">{error}</p>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const actor = getCurrentUser();
    if (!actor || !values) return;

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
      if (isPendingEvent && pendingLocalId) {
        const { agentId: _agentId, ...input } = eventFormToSubmitInput(values, actor.id);
        await updatePendingEventDetails(pendingLocalId, input);
        void refreshPending();
        navigate("/events", { replace: true });
        return;
      }

      if (id) {
        await updateEvent(id, eventFormToUpdatePayload(values), actor.id);
        void refreshPending();
        navigate("/events", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update event. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main main--wide">
      <BackButton
        fallback={
          isPendingEvent && pendingLocalId
            ? `/events/pending/${pendingLocalId}`
            : id
              ? `/events/${id}`
              : "/events"
        }
      />
      <h2>Edit event</h2>
      <p className="muted">Update details for an upcoming event.</p>

      <form className="card card--form" onSubmit={handleSubmit}>
        {error && error !== "Could not load event." && <p className="error">{error}</p>}

        <EventFormFields values={values} onChange={handleChange} />

        <div className="form-actions">
          <span />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
