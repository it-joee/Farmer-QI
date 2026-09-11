import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { User, UserRole } from "@farmeriq/shared";
import { AppLogo } from "./AppLogo";
import { NavIcon, type NavIconKey } from "./NavIcons";

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
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const mobileAddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        notifRef.current &&
        !notifRef.current.contains(target) &&
        mobileNotifRef.current &&
        !mobileNotifRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (
        addRef.current &&
        !addRef.current.contains(target) &&
        mobileAddRef.current &&
        !mobileAddRef.current.contains(target)
      ) {
        setAddMenuOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setAddMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const addOptions: { label: string; desc: string; path: string; icon: NavIconKey }[] = [
    {
      label: "Register Farmer",
      desc: "Add a new farmer record",
      path: "/farmers/new",
      icon: "farmers",
    },
    {
      label: "Add Aggregator",
      desc: "Register a commodity aggregator",
      path: "/aggregators/new",
      icon: "aggregators",
    },
    {
      label: "Add Offtaker",
      desc: "Register a buying offtaker",
      path: "/offtakers/new",
      icon: "offtakers",
    },
    {
      label: "Create Event",
      desc: "Schedule a field event",
      path: "/events/new",
      icon: "events",
    },
    ...(user.role === "admin"
      ? [
        {
          label: "Add User",
          desc: "Invite an agent or team lead",
          path: "/users",
          icon: "users" as NavIconKey,
        },
      ]
      : []),
  ];

  const renderAddDropdown = () => (
    <div className="quick-add-dropdown" role="dialog" aria-label="Add new record">
      <div className="quick-add-header">
        <span className="quick-add-title">QUICK ADD</span>
      </div>
      <div className="quick-add-body">
        {addOptions.map((opt) => (
          <Link
            key={opt.path}
            to={opt.path}
            className="quick-add-item"
            onClick={() => setAddMenuOpen(false)}
          >
            <div className="quick-add-item__icon">
              <NavIcon name={opt.icon} />
            </div>
            <div className="quick-add-item__content">
              <span className="quick-add-item__label">{opt.label}</span>
              <span className="quick-add-item__desc">{opt.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile-only topbar (hidden on desktop via CSS) ── */}
      <header className="mobile-topbar">
        <div className="mobile-topbar__start">
          <AppLogo as="div" />
        </div>

        <div className="mobile-topbar__end">
          {/* Quick Add Button */}
          <div className="quick-add-wrap" ref={mobileAddRef}>
            <button
              type="button"
              className={`quick-add-btn${addMenuOpen ? " quick-add-btn--active" : ""}`}
              onClick={() => setAddMenuOpen((prev) => !prev)}
              aria-expanded={addMenuOpen}
              aria-label="Add record"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add</span>
            </button>

            {addMenuOpen && renderAddDropdown()}
          </div>

          {/* Notification */}
          <div className="mobile-topbar__notif-wrap" ref={mobileNotifRef}>
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

      {/* ── Desktop-only header card (welcome left, add + notif right) ── */}
      <div className="top-header-card">
        {/* Welcome — desktop only, hidden on mobile via CSS */}
        <div className="top-header-card__welcome">
          <h2 className="top-header-card__title">
            Welcome, <span className="top-header-card__name">{user.full_name}</span>
          </h2>
        </div>

        <div className="top-header-card__actions">
          {/* Quick Add Button */}
          <div className="quick-add-wrap" ref={addRef}>
            <button
              type="button"
              className={`quick-add-btn${addMenuOpen ? " quick-add-btn--active" : ""}`}
              onClick={() => setAddMenuOpen((prev) => !prev)}
              aria-expanded={addMenuOpen}
              aria-label="Add record"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add</span>
            </button>

            {addMenuOpen && renderAddDropdown()}
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
