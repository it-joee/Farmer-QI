import { FarmerActionsMenu, type FarmerActionItem } from "./FarmerActionsMenu";

export type AggregatorListStatus = "synced" | "pending" | "syncing" | "failed";

interface AggregatorListMobileCardProps {
  name: string;
  town: string;
  businessName?: string | null;
  phone?: string | null;
  status: AggregatorListStatus;
  statusLabel?: string;
  menuItems: FarmerActionItem[];
  onOpen: () => void;
}

const STATUS_LABEL: Record<AggregatorListStatus, string> = {
  synced: "Synced",
  pending: "Pending sync",
  syncing: "Syncing…",
  failed: "Sync failed",
};

export function AggregatorListMobileCard({
  name,
  town,
  businessName,
  phone,
  status,
  statusLabel,
  menuItems,
  onOpen,
}: AggregatorListMobileCardProps) {
  const badgeClass =
    status === "synced"
      ? "sync-badge--synced"
      : status === "failed"
        ? "sync-badge--failed"
        : "sync-badge--pending";

  return (
    <article className="farmer-list-card">
      <button type="button" className="farmer-list-card__main" onClick={onOpen}>
        <div className="farmer-list-card__content">
          <h3 className="farmer-list-card__name">{name}</h3>
          {businessName && <p className="muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>{businessName}</p>}
          <p className="farmer-list-card__community">{town || "—"}</p>
          {phone && <p className="farmer-list-card__phone">{phone}</p>}
        </div>
      </button>
      <div
        className="farmer-list-card__aside"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <span className={`sync-badge ${badgeClass}`}>{statusLabel ?? STATUS_LABEL[status]}</span>
        <div className="farmer-list-card__menu">
          <FarmerActionsMenu label={`Actions for ${name}`} items={menuItems} />
        </div>
      </div>
    </article>
  );
}
