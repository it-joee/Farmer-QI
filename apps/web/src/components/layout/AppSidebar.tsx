import type { User } from "@farmeriq/shared";
import { NavLink } from "react-router-dom";
import { canManageUsers } from "../../auth";
import { NavIcon, type NavIconKey } from "./NavIcons";
import { AppLogo } from "./AppLogo";
import { UserProfileMenu } from "./UserProfileMenu";

export function AppSidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const registryItems = [
    { to: "/", label: "Overview", icon: "overview" as NavIconKey },
    { to: "/farmers", label: "Farmers", icon: "farmers" as NavIconKey },
    { to: "/aggregators", label: "Aggregators", icon: "aggregators" as NavIconKey },
    { to: "/offtakers", label: "Offtakers", icon: "offtakers" as NavIconKey },
  ];

  const activitiesItems = [
    { to: "/events", label: "Events", icon: "events" as NavIconKey },
    { to: "/reports", label: "Reports", icon: "reports" as NavIconKey },
  ];

  const adminItems = canManageUsers(user)
    ? [
        { to: "/users", label: "Users", icon: "users" as NavIconKey },
        { to: "/trash", label: "Trash Bin", icon: "trash" as NavIconKey },
      ]
    : [];

  const renderNavList = (title: string, items: { to: string; label: string; icon: NavIconKey }[]) => {
    if (items.length === 0) return null;
    return (
      <div className="sidebar-group">
        <h3 className="sidebar-group-title">{title}</h3>
        <ul className="sidebar-list">
          {items.map((item) => (
            <li key={item.to} className="sidebar-item">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " sidebar-link--active" : ""}`
                }
                title={item.label}
              >
                <NavIcon name={item.icon} />
                <span className="sidebar-link-text">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <AppLogo as="h1" />
      </div>

      <nav className="sidebar-nav">
        {renderNavList("REGISTRY", registryItems)}
        {renderNavList("ACTIVITIES", activitiesItems)}
        {renderNavList("ADMINISTRATION", adminItems)}
      </nav>

      <div className="sidebar-footer">
        <UserProfileMenu user={user} onLogout={onLogout} />
      </div>
    </aside>
  );
}
