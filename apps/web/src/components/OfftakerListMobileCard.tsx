import { FarmerActionsMenu, type FarmerActionItem } from "./FarmerActionsMenu";

export type OfftakerListStatus = "synced" | "pending" | "syncing" | "failed";

interface OfftakerListMobileCardProps {
  name: string;
  deliveryLocation: string;
  companyName?: string | null;
  contact?: string | null;
  status: OfftakerListStatus;
  statusLabel?: string;
  menuItems: FarmerActionItem[];
  onOpen: () => void;
}

const STATUS_LABEL: Record<OfftakerListStatus, string> = {
  synced: "Synced",
  pending: "Pending sync",
  syncing: "Syncing…",
  failed: "Sync failed",
};

export function OfftakerListMobileCard({
  name,
  deliveryLocation,
  companyName,
  contact,
  status,
  statusLabel,
  menuItems,
  onOpen,
}: OfftakerListMobileCardProps) {
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
          {companyName && <p className="muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>{companyName}</p>}
          <p className="farmer-list-card__community">{deliveryLocation || "—"}</p>
          {contact && <p className="farmer-list-card__phone">{contact}</p>}
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
