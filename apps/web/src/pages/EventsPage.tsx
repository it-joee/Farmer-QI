import { Link, useNavigate } from "react-router-dom";
import { canRegisterFarmers } from "../auth";
import { EventListMobileCard } from "../components/EventListMobileCard";
import { useEvents, usePendingEventsList } from "../hooks/useEvents";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { formatEventDate, isEventUpcoming } from "../lib/events";

export function EventsPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { events, loading, error } = useEvents();
  const { pendingEvents } = usePendingEventsList();
  const { refreshPending } = useOfflineSyncContext();

  if (!user) return null;

  const hasPending = pendingEvents.length > 0;
  const hasSynced = events.length > 0;

  return (
    <main className="main main--dashboard">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Events</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            Create events and record who attended
          </p>
        </div>
        {canRegisterFarmers(user) && (
          <Link to="/events/new" className="btn btn-primary">
            + New event
          </Link>
        )}
      </div>

      <div className="card">
        {loading && <p className="muted">Loading events…</p>}
        {error && !hasPending && <p className="error">{error}</p>}
        {error && hasPending && <p className="muted">{error} Showing saved events on this device.</p>}
        {!loading && !hasPending && !hasSynced && !error && (
          <p className="muted">No events yet. Create one to start taking attendance.</p>
        )}

        {hasPending && (
          <>
          <div className="table-scroll event-list--desktop-only">
            <table className="table table--pending">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Attendance</th>
                  <th>Status</th>
                  <th className="table__actions-col">More</th>
                </tr>
              </thead>
              <tbody>
                {pendingEvents.map((event) => (
                  <tr key={event.localId}>
                    <td>{formatEventDate(event.event_date)}</td>
                    <td>{event.title}</td>
                    <td>{event.community || event.location || "—"}</td>
                    <td>
                      <span className="attendance-count">{event.attendees.length} attendees</span>
                    </td>
                    <td>
                      <span className={`sync-badge sync-badge--${event.status}`}>
                        {event.status === "failed" ? "Sync failed" : "Pending sync"}
                      </span>
                      {event.lastError && (
                        <span className="sync-badge__error muted">{event.lastError}</span>
                      )}
                    </td>
                    <td className="table__actions-col">
                      <div className="table__actions">
                        {canRegisterFarmers(user) && (
                          <Link
                            to={`/events/pending/${event.localId}/edit`}
                            className="btn btn-secondary btn--sm"
                          >
                            Edit
                          </Link>
                        )}
                        <Link
                          to={`/events/pending/${event.localId}`}
                          className="btn btn-secondary btn--sm"
                          onClick={() => void refreshPending()}
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="event-list--mobile-only">
            {pendingEvents.map((event) => {
              const location = event.community || event.location || "—";
              return (
                <EventListMobileCard
                  key={event.localId}
                  title={event.title}
                  date={formatEventDate(event.event_date)}
                  location={location}
                  attendance={`${event.attendees.length} attendee${event.attendees.length === 1 ? "" : "s"}`}
                  status={event.status === "failed" ? "failed" : "pending"}
                  statusLabel={event.status === "failed" ? "Sync failed" : undefined}
                  openTo={`/events/pending/${event.localId}`}
                  editTo={
                    canRegisterFarmers(user) ? `/events/pending/${event.localId}/edit` : undefined
                  }
                  onOpenClick={() => void refreshPending()}
                  onOpen={() => {
                    void refreshPending();
                    navigate(`/events/pending/${event.localId}`);
                  }}
                />
              );
            })}
          </div>
          </>
        )}

        {hasSynced && (
          <>
          <div className="table-scroll event-list--desktop-only">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Attendance</th>
                  <th className="table__actions-col">More</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{formatEventDate(event.event_date)}</td>
                    <td>{event.title}</td>
                    <td>{event.community || event.location || "—"}</td>
                    <td>
                      <span className="attendance-count">{event.attendance_count ?? 0} attendees</span>
                    </td>
                    <td className="table__actions-col">
                      <div className="table__actions">
                        {canRegisterFarmers(user) && isEventUpcoming(event.event_date) && (
                          <Link to={`/events/${event.id}/edit`} className="btn btn-secondary btn--sm">
                            Edit
                          </Link>
                        )}
                        <Link to={`/events/${event.id}`} className="btn btn-secondary btn--sm">
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="event-list--mobile-only">
            {events.map((event) => {
              const location = event.community || event.location || "—";
              const count = event.attendance_count ?? 0;
              return (
                <EventListMobileCard
                  key={event.id}
                  title={event.title}
                  date={formatEventDate(event.event_date)}
                  location={location}
                  attendance={`${count} attendee${count === 1 ? "" : "s"}`}
                  openTo={`/events/${event.id}`}
                  editTo={
                    canRegisterFarmers(user) && isEventUpcoming(event.event_date)
                      ? `/events/${event.id}/edit`
                      : undefined
                  }
                  onOpen={() => navigate(`/events/${event.id}`)}
                />
              );
            })}
          </div>
          </>
        )}
      </div>
    </main>
  );
}
