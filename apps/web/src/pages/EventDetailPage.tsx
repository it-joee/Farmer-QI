import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useMatch, useParams } from "react-router-dom";
import type { EventAttendee, EventDetail, EventAttendeeGender } from "@farmeriq/shared";
import { GENDER_OPTIONS } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import { FormGroup } from "../components/FormGroup";
import { SelectField } from "../components/fields/SelectField";
import { getCurrentUser } from "../auth";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useRequireAuth } from "../hooks/useFarmers";
import {
  applyFieldValidation,
  clearFieldError,
  type FieldErrors,
  type FieldValidation,
} from "../lib/form-validation";
import { fetchEvent, formatEventDate, formatEventMeta, removeEventAttendee } from "../lib/events";
import { getPendingEvent } from "../lib/offline/store";
import {
  addPendingEventAttendee,
  addServerEventAttendeeWithOffline,
  removePendingEventAttendee,
} from "../lib/offline/event-sync";
import type { PendingEventAttendee, PendingEventRecord } from "../lib/offline/types";

interface DisplayAttendee {
  id: string;
  full_name: string;
  phone: string | null;
  community: string | null;
  gender: string | null;
  age: number | null;
  pendingSync?: boolean;
}

const GENDER_LABELS = Object.fromEntries(GENDER_OPTIONS.map((o) => [o.value, o.label]));

function formatAttendeeMeta(person: DisplayAttendee): string {
  const parts = [
    person.community,
    person.gender ? GENDER_LABELS[person.gender] ?? person.gender : null,
    person.age != null ? `Age ${person.age}` : null,
    person.phone,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function countAttendeesByGender(attendees: DisplayAttendee[]) {
  return attendees.reduce(
    (counts, person) => {
      if (person.gender === "male") counts.male += 1;
      else if (person.gender === "female") counts.female += 1;
      return counts;
    },
    { male: 0, female: 0 }
  );
}

function pendingToDisplay(attendee: PendingEventAttendee): DisplayAttendee {
  return {
    id: attendee.localId,
    full_name: attendee.full_name,
    phone: attendee.phone,
    community: attendee.community,
    gender: attendee.gender,
    age: attendee.age,
    pendingSync: !attendee.serverId,
  };
}

function serverToDisplay(attendee: EventAttendee): DisplayAttendee {
  return {
    id: attendee.id,
    full_name: attendee.full_name,
    phone: attendee.phone,
    community: attendee.community,
    gender: attendee.gender,
    age: attendee.age,
  };
}

function validateAttendeeForm(values: {
  name: string;
  phone: string;
  community: string;
  gender: string;
  age: string;
}): FieldValidation | null {
  if (!values.name.trim()) {
    return { fieldId: "attendee-name", message: "Full name is required." };
  }
  if (!values.gender) {
    return { fieldId: "attendee-gender", message: "Gender is required." };
  }
  const ageNum = Number.parseInt(values.age, 10);
  if (!values.age.trim() || Number.isNaN(ageNum) || ageNum < 1) {
    return { fieldId: "attendee-age", message: "Age is required." };
  }
  if (!values.phone.trim()) {
    return { fieldId: "attendee-phone", message: "Mobile is required." };
  }
  if (!values.community.trim()) {
    return { fieldId: "attendee-community", message: "Community is required." };
  }
  return null;
}

export function EventDetailPage() {
  const { id } = useParams<{ id?: string; localId?: string }>();
  const pendingMatch = useMatch("/events/pending/:localId");
  const pendingLocalId = pendingMatch?.params.localId;
  const isPendingEvent = Boolean(pendingLocalId);
  const location = useLocation();
  const user = useRequireAuth();
  const { refreshPending } = useOfflineSyncContext();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [pendingEvent, setPendingEvent] = useState<PendingEventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [community, setCommunity] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const addAttendeeRef = useRef<HTMLElement>(null);

  function scrollToAddAttendee() {
    addAttendeeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      document.getElementById("attendee-name")?.focus();
    }, 300);
  }

  const loadEvent = useCallback(async () => {
    if (isPendingEvent && pendingLocalId) {
      setLoading(true);
      setError("");
      const record = await getPendingEvent(pendingLocalId);
      if (!record) {
        setError("Could not load event.");
        setPendingEvent(null);
      } else {
        setPendingEvent(record);
      }
      setLoading(false);
      return;
    }

    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchEvent(id);
      setEvent(data);
    } catch {
      setError("Could not load event.");
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id, isPendingEvent, pendingLocalId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent, location.pathname]);

  const attendees: DisplayAttendee[] = isPendingEvent
    ? (pendingEvent?.attendees ?? []).map(pendingToDisplay)
    : (event?.attendees ?? []).map(serverToDisplay);
  const genderCounts = countAttendeesByGender(attendees);

  async function handleAddAttendee(e: React.FormEvent) {
    e.preventDefault();
    const actor = getCurrentUser();
    if (!actor) return;

    if (
      !applyFieldValidation(
        validateAttendeeForm({ name, phone, community, gender, age }),
        setFieldErrors
      )
    ) {
      return;
    }

    const ageNum = Number.parseInt(age, 10);

    setSaving(true);
    setFormError("");

    const input = {
      full_name: name.trim(),
      phone: phone.trim(),
      community: community.trim(),
      gender: gender as EventAttendeeGender,
      age: ageNum,
    };

    try {
      if (isPendingEvent && pendingLocalId) {
        const added = await addPendingEventAttendee(pendingLocalId, input);
        const updated = await getPendingEvent(pendingLocalId);
        if (updated) setPendingEvent(updated);
        else {
          setPendingEvent((prev) =>
            prev ? { ...prev, attendees: [...prev.attendees, added] } : prev
          );
        }
      } else if (id) {
        const result = await addServerEventAttendeeWithOffline(id, input, actor.id);
        if (result.attendee) {
          setEvent((prev) => {
            if (!prev) return prev;
            const row: EventAttendee = {
              id: result.attendee!.serverId ?? result.attendee!.localId,
              event_id: id,
              full_name: result.attendee!.full_name,
              phone: result.attendee!.phone,
              community: result.attendee!.community,
              gender: result.attendee!.gender,
              age: result.attendee!.age,
              marked_by: actor.id,
              marked_at: new Date().toISOString(),
            };
            return {
              ...prev,
              attendees: [...prev.attendees, row],
              attendance_count: (prev.attendance_count ?? prev.attendees.length) + 1,
            };
          });
        }
      }

      setName("");
      setPhone("");
      setCommunity("");
      setGender("");
      setAge("");
      setFieldErrors({});
      await refreshPending();
    } catch {
      setFormError("Could not add attendee. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(attendeeId: string) {
    const actor = getCurrentUser();
    if (!actor) return;

    setBusyId(attendeeId);
    setError("");

    try {
      if (isPendingEvent && pendingLocalId) {
        await removePendingEventAttendee(pendingLocalId, attendeeId);
        const updated = await getPendingEvent(pendingLocalId);
        if (updated) setPendingEvent(updated);
        else {
          setPendingEvent((prev) =>
            prev
              ? { ...prev, attendees: prev.attendees.filter((a) => a.localId !== attendeeId) }
              : prev
          );
        }
      } else if (id) {
        const count = await removeEventAttendee(id, attendeeId, actor.id);
        setEvent((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            attendees: prev.attendees.filter((a) => a.id !== attendeeId),
            attendance_count: count,
          };
        });
      }
      await refreshPending();
    } catch {
      setError("Could not remove attendee.");
    } finally {
      setBusyId(null);
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading event…</p>
      </main>
    );
  }

  const title = isPendingEvent ? pendingEvent?.title : event?.title;
  const eventDate = isPendingEvent ? pendingEvent?.event_date : event?.event_date;
  const eventLocation = isPendingEvent ? pendingEvent?.location : event?.location;
  const eventCommunity = isPendingEvent ? pendingEvent?.community : event?.community;
  const eventDistrict = isPendingEvent ? pendingEvent?.district : event?.district;
  const mofaOfficer = isPendingEvent ? pendingEvent?.mofa_officer : event?.mofa_officer;
  const eventDescription = isPendingEvent ? pendingEvent?.description : event?.description;
  const eventMeta = formatEventMeta({
    location: eventLocation,
    community: eventCommunity,
    district: eventDistrict,
    mofa_officer: mofaOfficer,
  });

  if ((!isPendingEvent && !event) || (isPendingEvent && !pendingEvent) || error === "Could not load event.") {
    return (
      <main className="main main--wide">
        <BackButton fallback="/events" />
        <p className="error">{error || "Event not found."}</p>
      </main>
    );
  }

  return (
    <main className="main main--wide event-detail">
      <BackButton fallback="/events" />

      {isPendingEvent && pendingEvent && (
        <div className={`sync-banner sync-banner--${pendingEvent.status === "failed" ? "error" : "pending"}`}>
          <span>
            {pendingEvent.status === "failed" ? "Sync failed" : "Pending sync"} — saved on this device
            {pendingEvent.lastError ? `: ${pendingEvent.lastError}` : ""}
          </span>
        </div>
      )}

      <div className="page-header event-detail__header">
        <div>
          <h2>{title}</h2>
          <p className="muted">
            {eventDate ? formatEventDate(eventDate) : ""}
            {eventMeta ? ` · ${eventMeta}` : eventLocation ? ` · ${eventLocation}` : ""}
          </p>
          {eventDescription && <p className="event-detail__description">{eventDescription}</p>}
        </div>
      </div>

      <div className="event-detail__stats-row">
        <div className="event-detail__stats card">
          <span className="event-detail__stat-value">{attendees.length}</span>
          <span className="event-detail__stat-label muted">Total attendees</span>
        </div>
        <div className="event-detail__stats card">
          <span className="event-detail__stat-value">{genderCounts.male}</span>
          <span className="event-detail__stat-label muted">Male</span>
        </div>
        <div className="event-detail__stats card">
          <span className="event-detail__stat-value">{genderCounts.female}</span>
          <span className="event-detail__stat-label muted">Female</span>
        </div>
      </div>

      <section className="card event-detail__section">
        <div className="event-detail__list-header">
          <div>
            <h3 className="card-title">Attendance list</h3>
            <p className="card-desc">Everyone registered for this event.</p>
          </div>
          <button type="button" className="btn btn-primary btn--sm" onClick={scrollToAddAttendee}>
            Add attendee
          </button>
        </div>

        {attendees.length === 0 ? (
          <p className="muted">No attendees yet. Add someone using the form below.</p>
        ) : (
          <div className="attendance-list">
            {attendees.map((person) => (
              <div key={person.id} className="attendance-row attendance-row--present">
                <span className="attendance-row__info">
                  <span className="attendance-row__name">
                    {person.full_name}
                    {person.pendingSync && <span className="muted"> (pending sync)</span>}
                  </span>
                  <span className="attendance-row__meta muted">
                    {formatAttendeeMeta(person)}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn--sm"
                  disabled={busyId === person.id}
                  onClick={() => void handleRemove(person.id)}
                >
                  {busyId === person.id ? "Removing…" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section ref={addAttendeeRef} className="card event-detail__section">
        <h3 className="card-title">Add attendee</h3>
        <p className="card-desc">Register someone who attended this event.</p>

        {formError && <p className="error">{formError}</p>}

        <form className="form-grid event-attendee-form" onSubmit={handleAddAttendee}>
          <FormGroup fieldId="attendee-name" label="Full name" error={fieldErrors["attendee-name"]}>
            <input
              id="attendee-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((prev) => clearFieldError(prev, "attendee-name"));
              }}
              placeholder="e.g. Ama Mensah"
            />
          </FormGroup>
          <div className="form-grid-pair">
            <FormGroup fieldId="attendee-gender" label="Gender" error={fieldErrors["attendee-gender"]}>
              <SelectField
                id="attendee-gender"
                value={gender}
                onChange={(value) => {
                  setGender(value);
                  setFieldErrors((prev) => clearFieldError(prev, "attendee-gender"));
                }}
                placeholder="Select"
                options={[{ value: "", label: "Select" }, ...GENDER_OPTIONS]}
                invalid={Boolean(fieldErrors["attendee-gender"])}
              />
            </FormGroup>
            <FormGroup fieldId="attendee-age" label="Age" error={fieldErrors["attendee-age"]}>
              <input
                id="attendee-age"
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  setFieldErrors((prev) => clearFieldError(prev, "attendee-age"));
                }}
                placeholder="e.g. 35"
              />
            </FormGroup>
          </div>
          <FormGroup fieldId="attendee-phone" label="Mobile" error={fieldErrors["attendee-phone"]}>
            <input
              id="attendee-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setFieldErrors((prev) => clearFieldError(prev, "attendee-phone"));
              }}
              placeholder="e.g. 0241234567"
            />
          </FormGroup>
          <FormGroup
            fieldId="attendee-community"
            label="Community"
            error={fieldErrors["attendee-community"]}
          >
            <input
              id="attendee-community"
              type="text"
              value={community}
              onChange={(e) => {
                setCommunity(e.target.value);
                setFieldErrors((prev) => clearFieldError(prev, "attendee-community"));
              }}
              placeholder="e.g. Wa"
            />
          </FormGroup>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Adding…" : "Add attendee"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
