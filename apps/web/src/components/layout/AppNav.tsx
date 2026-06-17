import type { User, UserRole } from "@farmeriq/shared";
import { NavLink } from "react-router-dom";
import { canManageUsers } from "../../auth";
import { NavIcon, type NavIconKey } from "./NavIcons";

const ROLE_LABELS: Record<UserRole, string> = {
  agent: "Field Agent",
  team_lead: "Team Lead",
  admin: "Administrator",
};

function farmersNavLabel(user: User): string {
  if (user.role === "admin") return "All Farmers";
  if (user.role === "team_lead") return "Office Farmers";
  return "My Farmers";
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
    { to: "/events", label: "Events", tabLabel: "Events", end: true, icon: "events" },
    { to: "/reports", label: "Reports", tabLabel: "Reports", end: true, icon: "reports" },
  ];

  if (canManageUsers(user)) {
    items.push({ to: "/users", label: "Users", tabLabel: "Users", end: true, icon: "users" });
  }

  return items;
}

export function AppNav({
  user,
  variant = "top",
}: {
  user: User;
  variant?: "top" | "bottom";
}) {
  const items = getNavItems(user);
  const isBottom = variant === "bottom";

  return (
    <nav
      className={`app-nav app-nav--${variant}`}
      aria-label={isBottom ? "Main tab navigation" : "Main navigation"}
    >
      <ul className="app-nav__list">
        {items.map((item) => (
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
      </ul>
    </nav>
  );
}

export { ROLE_LABELS };
