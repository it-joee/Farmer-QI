import { useEffect, useRef, useState } from "react";
import type { User, UserRole } from "@farmeriq/shared";

const ROLE_LABELS: Record<UserRole, string> = {
  agent: "Field Agent",
  team_lead: "Team Lead",
  admin: "Administrator",
};

interface AppHeaderProps {
  user: User;
  onLogout?: () => void;
}

export function AppHeader({ user }: AppHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notificationsOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setNotificationsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsOpen]);

  return (
    <div className="top-header-card">
      <div className="top-header-card__welcome">
        <h2 className="top-header-card__title">
          Welcome, <span className="top-header-card__name">{user.full_name}</span>
        </h2>
        <span className="top-header-card__role-badge">
          {ROLE_LABELS[user.role]}
        </span>
      </div>

      <div className="top-header-card__actions">
        <div className="top-header-card__search">
          <svg
            className="top-header-card__search-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            className="top-header-card__search-input"
            placeholder="Search records…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search records"
          />
        </div>

        <div className="top-header-card__notif-container" ref={notifRef}>
          <button
            type="button"
            className={`top-header-card__btn-notification${notificationsOpen ? " top-header-card__btn-notification--active" : ""}`}
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((prev) => !prev)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="top-header-card__notification-dot" aria-hidden="true" />
          </button>

          {notificationsOpen && (
            <div className="top-header-card__notif-dropdown" role="dialog" aria-label="Notifications">
              <div className="top-header-card__notif-header">
                <span className="top-header-card__notif-title">Notifications</span>
                <span className="top-header-card__notif-badge">0 new</span>
              </div>
              <div className="top-header-card__notif-body">
                <div className="top-header-card__notif-empty">
                  <div className="top-header-card__notif-empty-icon" aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="28"
                      height="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                      <path d="M4 4l16 16" />
                    </svg>
                  </div>
                  <p className="top-header-card__notif-empty-text">No new notifications</p>
                  <span className="top-header-card__notif-empty-sub">
                    All your system alerts and sync notices will appear here.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
