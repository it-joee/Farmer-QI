import type { ReactNode } from "react";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface UserListMobileCardProps {
  name: string;
  email: string;
  roleLabel: string;
  officeName: string | null;
  isActive: boolean;
  actions: ReactNode;
}

export function UserListMobileCard({
  name,
  email,
  roleLabel,
  officeName,
  isActive,
  actions,
}: UserListMobileCardProps) {
  return (
    <article className="farmer-list-card farmer-list-card--static">
      <div className="farmer-list-card__main farmer-list-card__main--static">
        <div className="farmer-profile-avatar farmer-profile-avatar--list">
          <span className="farmer-profile-avatar__initials" aria-hidden="true">
            {initialsFromName(name)}
          </span>
        </div>
        <div className="farmer-list-card__content">
          <h3 className="farmer-list-card__name">{name}</h3>
          <p className="farmer-list-card__community">{roleLabel}</p>
          <p className="farmer-list-card__meta">
            {email}
            {officeName ? ` · ${officeName}` : ""}
          </p>
        </div>
      </div>
      <div className="farmer-list-card__aside">
        <span className={`sync-badge ${isActive ? "sync-badge--synced" : "sync-badge--failed"}`}>
          {isActive ? "Active" : "Inactive"}
        </span>
        <div className="farmer-list-card__menu">{actions}</div>
      </div>
    </article>
  );
}
