import { Link } from "react-router-dom";

export type EventListStatus = "synced" | "pending" | "failed";

interface EventListMobileCardProps {
  title: string;
  date: string;
  location: string;
  attendance: string;
  status?: EventListStatus;
  statusLabel?: string;
  openTo: string;
  editTo?: string;
  onOpenClick?: () => void;
  onOpen: () => void;
}

const STATUS_LABEL: Record<Exclude<EventListStatus, "synced">, string> = {
  pending: "Pending sync",
  failed: "Sync failed",
};

export function EventListMobileCard({
  title,
  date,
  location,
  attendance,
  status,
  statusLabel,
  openTo,
  editTo,
  onOpenClick,
  onOpen,
}: EventListMobileCardProps) {
  const badgeClass =
    status === "failed" ? "sync-badge--failed" : status === "pending" ? "sync-badge--pending" : null;

  return (
    <article className="event-list-card">
      <div className="event-list-card__header">
        <button type="button" className="event-list-card__title-btn" onClick={onOpen}>
          <h3 className="event-list-card__title">{title}</h3>
        </button>
        {status && badgeClass && (
          <span className={`sync-badge ${badgeClass}`}>
            {statusLabel ??
              (status === "failed" ? STATUS_LABEL.failed : STATUS_LABEL.pending)}
          </span>
        )}
      </div>
      <div className="event-list-card__body">
        <button type="button" className="event-list-card__main" onClick={onOpen}>
          <div className="event-list-card__content">
            <p className="event-list-card__date">{date}</p>
            <p className="event-list-card__location">{location}</p>
            <p className="event-list-card__attendance">{attendance}</p>
          </div>
        </button>
        <div className="event-list-card__actions">
          {editTo && (
            <Link to={editTo} className="btn btn-secondary btn--sm">
              Edit
            </Link>
          )}
          <Link
            to={openTo}
            className="btn btn-secondary btn--sm"
            onClick={() => onOpenClick?.()}
          >
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}
