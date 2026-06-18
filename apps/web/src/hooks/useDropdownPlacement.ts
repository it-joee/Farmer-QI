import { useLayoutEffect, useState, type RefObject } from "react";

export type DropdownPlacement = "below" | "above";

interface UseDropdownPlacementOptions {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLElement | null>;
  gap?: number;
  padding?: number;
}

function getViewportBottomLimit(): number {
  const bottomNav = document.querySelector<HTMLElement>(".app-nav--bottom");
  if (bottomNav) {
    const style = window.getComputedStyle(bottomNav);
    if (style.display !== "none" && style.visibility !== "hidden") {
      return bottomNav.getBoundingClientRect().top;
    }
  }
  return window.innerHeight;
}

export function useDropdownPlacement({
  open,
  triggerRef,
  menuRef,
  gap = 8,
  padding = 8,
}: UseDropdownPlacementOptions): DropdownPlacement {
  const [placement, setPlacement] = useState<DropdownPlacement>("below");

  useLayoutEffect(() => {
    if (!open) {
      setPlacement("below");
      return;
    }

    function updatePlacement() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuHeight = menu.offsetHeight;
      const viewportTop = padding;
      const viewportBottom = getViewportBottomLimit() - padding;

      const spaceBelow = viewportBottom - triggerRect.bottom - gap;
      const spaceAbove = triggerRect.top - viewportTop - gap;

      const fitsBelow = spaceBelow >= menuHeight;
      const fitsAbove = spaceAbove >= menuHeight;

      if (fitsBelow) {
        setPlacement("below");
      } else if (fitsAbove) {
        setPlacement("above");
      } else {
        setPlacement(spaceAbove > spaceBelow ? "above" : "below");
      }
    }

    updatePlacement();

    const menu = menuRef.current;
    const resizeObserver = menu ? new ResizeObserver(updatePlacement) : null;
    if (menu && resizeObserver) resizeObserver.observe(menu);

    window.addEventListener("resize", updatePlacement);
    document.addEventListener("scroll", updatePlacement, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePlacement);
      document.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open, triggerRef, menuRef, gap, padding]);

  return placement;
}
