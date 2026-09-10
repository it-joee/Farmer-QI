import type { User, UserRole } from "@farmeriq/shared";
import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { canManageUsers, offtakersScopeLabel } from "../../auth";
import { NavIcon, type NavIconKey } from "./NavIcons";

const ROLE_LABELS: Record<UserRole, string> = {
  agent: "Field Agent",
  team_lead: "Team Lead",
  admin: "Administrator",
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function farmersNavLabel(user: User): string {
  if (user.role === "admin") return "All Farmers";
  if (user.role === "team_lead") return "Office Farmers";
  return "My Farmers";
}

function aggregatorsNavLabel(user: User): string {
  if (user.role === "admin") return "All Aggregators";
  if (user.role === "team_lead") return "Office Aggregators";
  return "My Aggregators";
}

function getNavItems(user: User) {
  const items: {
    to: string;
    label: string;
    tabLabel: string;
    end: boolean;
    icon: NavIconKey;
  }[] = [
    { to: "/", label: "Overview", tabLabel: "Overview", end: true, icon: "overview" },
    {
      to: "/farmers",
      label: farmersNavLabel(user),
      tabLabel: "Farmers",
      end: true,
      icon: "farmers",
    },
    {
      to: "/aggregators",
      label: aggregatorsNavLabel(user),
      tabLabel: "Aggregators",
      end: true,
      icon: "aggregators",
    },
    {
      to: "/offtakers",
      label: offtakersScopeLabel(user),
      tabLabel: "Offtakers",
      end: true,
      icon: "offtakers",
    },
    { to: "/events", label: "Events", tabLabel: "Events", end: true, icon: "events" },
    { to: "/reports", label: "Reports", tabLabel: "Reports", end: true, icon: "reports" },
  ];

  if (canManageUsers(user)) {
    items.push({ to: "/users", label: "Users", tabLabel: "Users", end: true, icon: "users" });
    items.push({ to: "/trash", label: "Trash Bin", tabLabel: "Trash", end: true, icon: "trash" });
  }

  return items;
}

// ── Mobile Bottom Sheet Drawer ──────────────────────────────────────────────

function MobileDrawer({
  user,
  hiddenItems,
  onClose,
  onLogout,
}: {
  user: User;
  hiddenItems: ReturnType<typeof getNavItems>;
  onClose: () => void;
  onLogout?: () => void;
}) {
  const navigate = useNavigate();

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleNavClick(to: string) {
    onClose();
    navigate(to);
  }

  function handleLogout() {
    onClose();
    onLogout?.();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="mobile-drawer__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="More options">
        {/* Drag handle */}
        <div className="mobile-drawer__handle" aria-hidden="true" />

        {/* User profile card */}
        <div className="mobile-drawer__profile">
          <div className="mobile-drawer__avatar">
            {getInitials(user.full_name)}
          </div>
          <div className="mobile-drawer__profile-info">
            <span className="mobile-drawer__profile-name">{user.full_name}</span>
            <span className="mobile-drawer__profile-email">{user.email}</span>
            <span className="mobile-drawer__profile-badge">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mobile-drawer__divider" />

        {/* Hidden nav items */}
        {hiddenItems.length > 0 && (
          <nav className="mobile-drawer__nav" aria-label="More navigation">
            {hiddenItems.map((item) => (
              <button
                key={item.to}
                type="button"
                className="mobile-drawer__nav-item"
                onClick={() => handleNavClick(item.to)}
              >
                <span className="mobile-drawer__nav-icon">
                  <NavIcon name={item.icon} />
                </span>
                <span className="mobile-drawer__nav-label">{item.label}</span>
                <svg className="mobile-drawer__nav-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            ))}
          </nav>
        )}

        {/* Divider */}
        <div className="mobile-drawer__divider" />

        {/* Account actions */}
        <div className="mobile-drawer__actions">
          <button
            type="button"
            className="mobile-drawer__action-item"
            onClick={() => { onClose(); navigate("/change-password"); }}
          >
            <span className="mobile-drawer__action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9" />
                <circle cx="7.5" cy="15.5" r="5.5" />
              </svg>
            </span>
            Change password
          </button>
          <button
            type="button"
            className="mobile-drawer__action-item mobile-drawer__action-item--danger"
            onClick={handleLogout}
          >
            <span className="mobile-drawer__action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            Log out
          </button>
        </div>
      </div>
    </>
  );
}

// ── AppNav ──────────────────────────────────────────────────────────────────

export function AppNav({
  user,
  variant = "top",
  onLogout,
}: {
  user: User;
  variant?: "top" | "bottom";
  onLogout?: () => void;
}) {
  const items = getNavItems(user);
  const isBottom = variant === "bottom";

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const MAX_VISIBLE = 4;
  const visibleItems = isBottom && items.length > MAX_VISIBLE ? items.slice(0, MAX_VISIBLE) : items;
  const hiddenItems = isBottom && items.length > MAX_VISIBLE ? items.slice(MAX_VISIBLE) : [];

  return (
    <>
      <nav
        className={`app-nav app-nav--${variant}`}
        aria-label={isBottom ? "Main tab navigation" : "Main navigation"}
      >
        <ul className="app-nav__list">
          {visibleItems.map((item) => (
            <li key={item.to} className="app-nav__item">
              <NavLink
                to={item.to}
                end={item.end}
                aria-label={item.label}
                className={({ isActive }) =>
                  `app-nav__link${isActive ? " app-nav__link--active" : ""}`
                }
              >
                <NavIcon name={item.icon} />
                {isBottom ? (
                  <>
                    <span className="app-nav__label app-nav__label--full">{item.label}</span>
                    <span className="app-nav__label app-nav__label--short">{item.tabLabel}</span>
                  </>
                ) : (
                  <span className="app-nav__label">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}

          {/* Hamburger — always shown on mobile bottom nav when there are overflow items OR to access profile */}
          {isBottom && hiddenItems.length > 0 && (
            <li className="app-nav__item">
              <button
                type="button"
                className={`app-nav__link${isDrawerOpen ? " app-nav__link--active" : ""}`}
                onClick={() => setIsDrawerOpen(true)}
                aria-label="More options"
                aria-expanded={isDrawerOpen}
              >
                <span className="app-nav__icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <MobileDrawer
          user={user}
          hiddenItems={hiddenItems}
          onClose={() => setIsDrawerOpen(false)}
          onLogout={onLogout}
        />
      )}
    </>
  );
}

export { ROLE_LABELS };
