import { FarmerProfileAvatar } from "./FarmerProfileAvatar";
import { FarmerActionsMenu, type FarmerActionItem } from "./FarmerActionsMenu";

export type FarmerListStatus = "synced" | "pending" | "syncing" | "failed";

interface FarmerListMobileCardProps {
  name: string;
  community: string;
  phone?: string | null;
  status: FarmerListStatus;
  statusLabel?: string;
  portraitUrl?: string | null;
  menuItems: FarmerActionItem[];
  onOpen: () => void;
}

const STATUS_LABEL: Record<FarmerListStatus, string> = {
  synced: "Synced",
  pending: "Pending sync",
  syncing: "Syncing…",
  failed: "Sync failed",
};

export function FarmerListMobileCard({
  name,
  community,
  phone,
  status,
  statusLabel,
  portraitUrl,
  menuItems,
  onOpen,
}: FarmerListMobileCardProps) {
  const badgeClass =
    status === "synced"
      ? "sync-badge--synced"
      : status === "failed"
        ? "sync-badge--failed"
        : "sync-badge--pending";

  return (
    <article className="farmer-list-card">
      <button type="button" className="farmer-list-card__main" onClick={onOpen}>
        <FarmerProfileAvatar name={name} portraitUrl={portraitUrl} className="farmer-profile-avatar--list" />
        <div className="farmer-list-card__content">
          <h3 className="farmer-list-card__name">{name}</h3>
          <p className="farmer-list-card__community">{community}</p>
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
