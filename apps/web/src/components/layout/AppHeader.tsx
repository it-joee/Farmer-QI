import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "@farmeriq/shared";
import { canAccessDrivers, canAccessOfftakers, canAccessOperations } from "../../auth";
import { useOfflineSyncContext } from "../../context/OfflineSyncContext";
import {
  fetchNotifications,
  formatRelativeTime,
  getReadNotificationIds,
  saveReadNotificationIds,
  type AppNotification,
} from "../../lib/notifications";
import { AppLogo } from "./AppLogo";
import { NavIcon, type NavIconKey } from "./NavIcons";

function NotificationIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 18.5011L18.349 7.93407C17.8603 4.80601 15.166 2.5 12 2.5C8.83398 2.5 6.13971 4.80601 5.65098 7.93407L4 18.5011" />
      <path d="M20 18.5C20 16.8431 16.4183 15.5 12 15.5C7.58172 15.5 4 16.8431 4 18.5C4 20.1569 7.58172 21.5 12 21.5C16.4183 21.5 20 20.1569 20 18.5Z" />
      <path d="M13 18.5H11" />
    </svg>
  );
}

interface AppHeaderProps {
  user: User;
  onLogout?: () => void;
}

export function AppHeader({ user }: AppHeaderProps) {
  const navigate = useNavigate();
  const { online, pendingCount, lastSyncError } = useOfflineSyncContext();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [serverNotifications, setServerNotifications] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadNotificationIds(user.id));
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const mobileAddRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!online) return;
    setNotifLoading(true);
    try {
      const list = await fetchNotifications();
      setServerNotifications(list);
    } catch {
      /* keep existing notifications if offline or transient error */
    } finally {
      setNotifLoading(false);
    }
  }, [online]);

  useEffect(() => {
    setReadIds(getReadNotificationIds(user.id));
  }, [user.id]);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (notificationsOpen) {
      void loadNotifications();
    }
  }, [notificationsOpen, loadNotifications]);

  const notifications = useMemo(() => {
    const syncAlerts: AppNotification[] = [];
    if (lastSyncError) {
      syncAlerts.push({
        id: `sync-error-${lastSyncError}`,
        category: "sync",
        title: "Offline sync issue",
        message: lastSyncError,
        created_at: new Date().toISOString(),
        link: "/farmers",
      });
    } else if (pendingCount > 0) {
      syncAlerts.push({
        id: `sync-pending-${pendingCount}`,
        category: "sync",
        title: "Pending offline records",
        message: `${pendingCount} record${pendingCount === 1 ? "" : "s"} waiting to sync`,
        created_at: new Date().toISOString(),
        link: "/farmers",
      });
    }
    return [...syncAlerts, ...serverNotifications];
  }, [lastSyncError, pendingCount, serverNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  function markAsRead(id: string) {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadNotificationIds(user.id, next);
      return next;
    });
  }

  function markAllAsRead() {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const item of notifications) {
        next.add(item.id);
      }
      saveReadNotificationIds(user.id, next);
      return next;
    });
  }

  function handleNotificationClick(item: AppNotification) {
    markAsRead(item.id);
    if (item.link) {
      setNotificationsOpen(false);
      navigate(item.link);
    }
  }

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
    ...(canAccessOfftakers(user)
      ? [
          {
            label: "Add Offtaker",
            desc: "Register a buying offtaker",
            path: "/offtakers/new",
            icon: "offtakers" as NavIconKey,
          },
        ]
      : []),
    ...(canAccessDrivers(user)
      ? [
          {
            label: "Add Driver",
            desc: "Register a transport driver",
            path: "/drivers/new",
            icon: "drivers" as NavIconKey,
          },
        ]
      : []),
    ...(canAccessOperations(user)
      ? [
          {
            label: "Add Waybill",
            desc: "Record a commodity waybill",
            path: "/waybills/new",
            icon: "waybills" as NavIconKey,
          },
        ]
      : []),
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

  const renderNotificationsDropdown = (prefix: "mobile-topbar" | "top-header-card") => (
    <div className={`${prefix}__notif-dropdown`} role="dialog" aria-label="Notifications">
      <div className={`${prefix}__notif-header`}>
        <span className={`${prefix}__notif-title`}>Notifications</span>
        <div className="notif-header-actions">
          {unreadCount > 0 && (
            <button type="button" className="notif-mark-all" onClick={markAllAsRead}>
              Mark all read
            </button>
          )}
          <span className={`${prefix}__notif-badge`}>{unreadCount} new</span>
        </div>
      </div>
      <div className={`${prefix}__notif-body`}>
        {notifLoading && notifications.length === 0 ? (
          <div className={`${prefix}__notif-empty`}>
            <p className={`${prefix}__notif-empty-text`}>Loading notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={`${prefix}__notif-empty`}>
            <div className={`${prefix}__notif-empty-icon`} aria-hidden="true">
              <NotificationIcon size={28} />
            </div>
            <p className={`${prefix}__notif-empty-text`}>No new notifications</p>
            <span className={`${prefix}__notif-empty-sub`}>
              All your system alerts and sync notices will appear here.
            </span>
          </div>
        ) : (
          <ul className="notif-list">
            {notifications.map((item) => {
              const isUnread = !readIds.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`notif-item${isUnread ? " notif-item--unread" : ""}`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    <span className={`notif-item__dot notif-item__dot--${item.category}`} aria-hidden="true" />
                    <div className="notif-item__content">
                      <div className="notif-item__top">
                        <span className="notif-item__title">{item.title}</span>
                        <span className="notif-item__time">{formatRelativeTime(item.created_at)}</span>
                      </div>
                      <p className="notif-item__message">{item.message}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
              <NotificationIcon size={20} />
              {unreadCount > 0 && <span className="mobile-topbar__notif-dot" aria-hidden="true" />}
            </button>

            {notificationsOpen && renderNotificationsDropdown("mobile-topbar")}
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
              <NotificationIcon size={20} />
              {unreadCount > 0 && <span className="top-header-card__notification-dot" aria-hidden="true" />}
            </button>

            {notificationsOpen && renderNotificationsDropdown("top-header-card")}
          </div>
        </div>
      </div>
    </>
  );
}
