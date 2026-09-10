import { useEffect, useRef, useState } from "react";
import type { User, UserRole } from "@farmeriq/shared";
import { AppLogo } from "./AppLogo";

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
    <>
      {/* ── Mobile-only topbar (hidden on desktop via CSS) ── */}
      <header className="mobile-topbar">
        <div className="mobile-topbar__start">
          <AppLogo as="div" />
        </div>

        <div className="mobile-topbar__end">
          {/* Search */}
          <div className="mobile-topbar__search-wrap">
            <svg
              className="mobile-topbar__search-icon"
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
              className="mobile-topbar__search-input"
              placeholder="Search records…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search records"
            />
          </div>

          {/* Notification */}
          <div className="mobile-topbar__notif-wrap" ref={notifRef}>
            <button
              type="button"
              className={`mobile-topbar__notif-btn${notificationsOpen ? " mobile-topbar__notif-btn--active" : ""}`}
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
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="m20 15.05-1.5-2.6V8.5C18.5 4.915 15.585 2 12 2a6.506 6.506 0 0 0-6.5 6.5v3.95L4 15.05V19h4.325c.35 1.71 1.865 3 3.675 3 1.81 0 3.325-1.29 3.675-3H20v-3.95Zm-8 5.45c-.975 0-1.8-.63-2.11-1.5h4.225c-.31.87-1.135 1.5-2.11 1.5H12Zm6.5-3h-13v-2.05l1.5-2.6V8.495c0-2.755 2.245-5 5-5s5 2.245 5 5v4.355l1.5 2.6v2.05Z" />
              </svg>
              <span className="mobile-topbar__notif-dot" aria-hidden="true" />
            </button>

            {notificationsOpen && (
              <div className="mobile-topbar__notif-dropdown" role="dialog" aria-label="Notifications">
                <div className="mobile-topbar__notif-header">
                  <span className="mobile-topbar__notif-title">Notifications</span>
                  <span className="mobile-topbar__notif-badge">0 new</span>
                </div>
                <div className="mobile-topbar__notif-body">
                  <div className="mobile-topbar__notif-empty">
                    <div className="mobile-topbar__notif-empty-icon" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="m20 15.05-1.5-2.6V8.5C18.5 4.915 15.585 2 12 2a6.506 6.506 0 0 0-6.5 6.5v3.95L4 15.05V19h4.325c.35 1.71 1.865 3 3.675 3 1.81 0 3.325-1.29 3.675-3H20v-3.95Zm-8 5.45c-.975 0-1.8-.63-2.11-1.5h4.225c-.31.87-1.135 1.5-2.11 1.5H12Zm6.5-3h-13v-2.05l1.5-2.6V8.495c0-2.755 2.245-5 5-5s5 2.245 5 5v4.355l1.5 2.6v2.05Z" />
                      </svg>
                    </div>
                    <p className="mobile-topbar__notif-empty-text">No new notifications</p>
                    <span className="mobile-topbar__notif-empty-sub">
                      All your system alerts and sync notices will appear here.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile-only welcome banner (below topbar) ── */}
      <div className="mobile-welcome">
        <span className="mobile-welcome__greeting">
          Welcome back, <strong>{user.full_name.split(" ")[0]}</strong>
        </span>
      </div>

      {/* ── Desktop-only header card (welcome left, search + notif right) ── */}
      <div className="top-header-card">
        {/* Welcome — desktop only, hidden on mobile via CSS */}
        <div className="top-header-card__welcome">
          <h2 className="top-header-card__title">
            Welcome, <span className="top-header-card__name">{user.full_name}</span>
          </h2>
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
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="m20 15.05-1.5-2.6V8.5C18.5 4.915 15.585 2 12 2a6.506 6.506 0 0 0-6.5 6.5v3.95L4 15.05V19h4.325c.35 1.71 1.865 3 3.675 3 1.81 0 3.325-1.29 3.675-3H20v-3.95Zm-8 5.45c-.975 0-1.8-.63-2.11-1.5h4.225c-.31.87-1.135 1.5-2.11 1.5H12Zm6.5-3h-13v-2.05l1.5-2.6V8.495c0-2.755 2.245-5 5-5s5 2.245 5 5v4.355l1.5 2.6v2.05Z" />
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="m20 15.05-1.5-2.6V8.5C18.5 4.915 15.585 2 12 2a6.506 6.506 0 0 0-6.5 6.5v3.95L4 15.05V19h4.325c.35 1.71 1.865 3 3.675 3 1.81 0 3.325-1.29 3.675-3H20v-3.95Zm-8 5.45c-.975 0-1.8-.63-2.11-1.5h4.225c-.31.87-1.135 1.5-2.11 1.5H12Zm6.5-3h-13v-2.05l1.5-2.6V8.495c0-2.755 2.245-5 5-5s5 2.245 5 5v4.355l1.5 2.6v2.05Z" />
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
    </>
  );
}

