import { useEffect, useRef, useState } from "react";
import { useDropdownPlacement } from "../hooks/useDropdownPlacement";

export interface FarmerActionItem {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface FarmerActionsMenuProps {
  items: FarmerActionItem[];
  label?: string;
}

export function FarmerActionsMenu({ items, label = "Farmer actions" }: FarmerActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const placement = useDropdownPlacement({ open, triggerRef, menuRef: panelRef });

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

  function runAction(item: FarmerActionItem) {
    setOpen(false);
    item.onClick();
  }

  return (
    <div className="row-actions" ref={menuRef}>
      <button
        type="button"
        ref={triggerRef}
        className="row-actions__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
      >
        <span className="row-actions__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="3" cy="8" r="1.25" />
            <circle cx="8" cy="8" r="1.25" />
            <circle cx="13" cy="8" r="1.25" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          ref={panelRef}
          className={`row-actions__menu${placement === "above" ? " dropdown-panel--above" : ""}`}
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`row-actions__item${item.variant === "danger" ? " row-actions__item--danger" : ""}`}
              role="menuitem"
              onClick={() => runAction(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
