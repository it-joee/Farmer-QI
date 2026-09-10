import { useCallback, useEffect, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import {
  EventFormFields,
  eventFormToSubmitInput,
  eventFormToUpdatePayload,
  validateEventForm,
  type EventFormValues,
  valuesFromEvent,
} from "../components/EventFormFields";
import { getCurrentUser } from "../auth";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useToast } from "../context/ToastContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useRequireAuth } from "../hooks/useFarmers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
} from "../lib/form-validation";
import { fetchEvent, isEventUpcoming, updateEvent, deleteEvent } from "../lib/events";
import { getPendingEvent, updatePendingEventDetails, removePendingEvent } from "../lib/offline/event-sync";

const EVENT_FIELD_IDS: Record<keyof EventFormValues, string> = {
  title: "event-title",
  eventDate: "event-date",
  communityLocation: "event-community-location",
  district: "event-district",
  mofaOfficer: "event-mofa-officer",
  description: "event-description",
};

export function EditEventPage() {
  const { id, localId } = useParams<{ id?: string; localId?: string }>();
  const pendingEditMatch = useMatch("/events/pending/:localId/edit");
  const pendingLocalId = pendingEditMatch?.params.localId ?? localId;
  const isPendingEvent = Boolean(pendingLocalId);
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { refreshPending } = useOfflineSyncContext();
  const { showSuccess } = useToast();
  const { confirm } = useConfirmDialog();
  const [values, setValues] = useState<EventFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

      const data = await fetchEvent(id);
      setValues(valuesFromEvent(data.event));
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
    setFieldErrors((prev) => clearFieldError(prev, EVENT_FIELD_IDS[field]));
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


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const actor = getCurrentUser();
    if (!actor || !values) return;

    if (!applyFieldValidation(validateEventForm(values), setFieldErrors)) return;

    setSaving(true);
    setFormError("");

    try {
      showSuccess("Event Updated", `Event "${values.title}" updated successfully.`);
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
      setFormError(err instanceof Error ? err.message : "Could not update event. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(permanent: boolean = false) {
    const actor = getCurrentUser();
    if (!actor) return;

    const isConfirmed = await confirm({
      title: permanent ? "Permanent Delete" : "Delete Event",
      message: permanent 
        ? "Are you sure you want to permanently delete this event and all its attendees? This action cannot be undone."
        : "Are you sure you want to delete this event? It will be moved to the trash.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!isConfirmed) return;

    setDeleting(true);
    setFormError("");

    try {
      if (isPendingEvent && pendingLocalId) {
        await removePendingEvent(pendingLocalId);
        void refreshPending();
        showSuccess("Event Deleted", "Pending event was removed successfully.");
        navigate("/events", { replace: true });
        return;
      }

      if (id) {
        await deleteEvent(id, actor.id, permanent);
        void refreshPending();
        showSuccess(permanent ? "Event Deleted Permanently" : "Event Deleted", "Event was deleted successfully.");
        navigate("/events", { replace: true });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not delete event. Try again.");
    } finally {
      setDeleting(false);
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
        {formError && <p className="error">{formError}</p>}

        <EventFormFields values={values} errors={fieldErrors} onChange={handleChange} />

        <div className="form-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ color: "var(--color-danger, #ef4444)", borderColor: "var(--color-danger, #ef4444)" }}
              disabled={saving || deleting}
              onClick={() => handleDelete(false)}
            >
              {deleting ? "Deleting…" : "Delete event"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ color: "var(--color-danger, #ef4444)", borderColor: "var(--color-danger, #ef4444)" }}
              disabled={saving || deleting}
              onClick={() => handleDelete(true)}
            >
              Permanent delete
            </button>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
