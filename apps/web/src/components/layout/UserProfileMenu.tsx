import { useEffect, useRef, useState } from "react";
import type { User } from "@farmeriq/shared";
import { useNavigate } from "react-router-dom";
import { DEMO_USERS, SKIP_AUTH, setDevUser } from "../../auth";
import { useDropdownPlacement } from "../../hooks/useDropdownPlacement";
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const placement = useDropdownPlacement({ open, triggerRef, menuRef: panelRef, gap: 4 });

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
        ref={triggerRef}
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
        <span className="user-profile__more" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
          >
            <circle cx="12" cy="5" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="19" r="1.75" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          ref={panelRef}
          className={`user-profile__menu${placement === "above" ? " dropdown-panel--above" : ""}`}
          role="menu"
        >
          <div className="user-profile__menu-header">
            <span className="user-profile__menu-name">{user.full_name}</span>
            <span className="user-profile__menu-email muted">{user.email}</span>
            <span className="user-profile__menu-role-badge">{ROLE_LABELS[user.role]}</span>
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
          <div className="user-profile__menu-actions">
            <button
              type="button"
              className="user-profile__menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate("/change-password");
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M22 4H2v1.5h20V4Zm0 14.5H2V20h20v-1.5ZM5 12.865l-1.415.82-.5-.87L4.5 12l-1.415-.815.5-.87 1.415.82V9.5h1v1.635l1.415-.82.5.87L6.5 12l1.415.815-.5.87L6 12.865V14.5H5v-1.635Zm5.085.82 1.415-.82V14.5h1v-1.635l1.415.82.5-.87L13 12l1.415-.815-.5-.87-1.415.82V9.5h-1v1.635l-1.415-.82-.5.87L11 12l-1.415.815.5.87Zm7.915-.82-1.415.82-.5-.87L17.5 12l-1.415-.815.5-.87 1.415.82V9.5h1v1.635l1.415-.82.5.87L19.5 12l1.415.815-.5.87-1.415-.82V14.5h-1v-1.635Z" />
              </svg>
              Change password
            </button>
            <button
              type="button"
              className="user-profile__menu-item user-profile__menu-item--danger"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
