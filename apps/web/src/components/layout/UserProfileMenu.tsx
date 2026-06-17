import { useEffect, useRef, useState } from "react";
import type { User } from "@farmeriq/shared";
import { DEMO_USERS, SKIP_AUTH, setDevUser } from "../../auth";
import { ROLE_LABELS } from "./AppNav";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

interface UserProfileMenuProps {
  user: User;
  onLogout: () => void;
}

export function UserProfileMenu({ user, onLogout }: UserProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="user-profile" ref={menuRef}>
      <button
        type="button"
        className="user-profile__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.full_name}`}
      >
        <span className="user-profile__avatar" aria-hidden="true">
          {getInitials(user.full_name)}
        </span>
        <span className="user-profile__info">
          <span className="user-profile__name">{user.full_name}</span>
          <span className="user-profile__role">{ROLE_LABELS[user.role]}</span>
        </span>
        <span className={`user-profile__chevron${open ? " user-profile__chevron--open" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="user-profile__menu" role="menu">
          <div className="user-profile__menu-header">
            <span className="user-profile__menu-name">{user.full_name}</span>
            <span className="user-profile__menu-email muted">{user.email}</span>
            <span className="user-profile__menu-role">{ROLE_LABELS[user.role]}</span>
          </div>
          {SKIP_AUTH && (
            <div className="user-profile__dev-switch">
              <span className="user-profile__dev-label muted">Switch role (dev)</span>
              {DEMO_USERS.map((demoUser) => (
                <button
                  key={demoUser.id}
                  type="button"
                  className={`user-profile__dev-option${demoUser.id === user.id ? " user-profile__dev-option--active" : ""}`}
                  role="menuitem"
                  onClick={() => {
                    setDevUser(demoUser.id);
                    setOpen(false);
                  }}
                >
                  {ROLE_LABELS[demoUser.role]}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="user-profile__logout"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
