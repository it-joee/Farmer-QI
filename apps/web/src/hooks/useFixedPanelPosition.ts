import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import type { DropdownPlacement } from "./useDropdownPlacement";

interface UseFixedPanelPositionOptions {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  placement: DropdownPlacement;
  gap?: number;
  padding?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useFixedPanelPosition({
  open,
  triggerRef,
  panelRef,
  placement,
  gap = 8,
  padding = 8,
  minWidth = 280,
  maxWidth = 320,
}: UseFixedPanelPositionOptions): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) {
      setStyle({});
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const rect = trigger.getBoundingClientRect();
      const panelHeight = panel.offsetHeight;
      const panelWidth = Math.min(maxWidth, Math.max(minWidth, rect.width));
      const viewportBottom =
        document.querySelector<HTMLElement>(".app-nav--bottom")?.getBoundingClientRect().top ??
        window.innerHeight;

      let top =
        placement === "below" ? rect.bottom + gap : rect.top - gap - panelHeight;

      top = Math.min(top, viewportBottom - panelHeight - padding);
      top = Math.max(padding, top);

      let left = rect.left;
      left = Math.min(left, window.innerWidth - panelWidth - padding);
      left = Math.max(padding, left);

      setStyle({
        position: "fixed",
        top,
        left,
        width: panelWidth,
        zIndex: 1100,
      });
    }

    updatePosition();

    const panel = panelRef.current;
    const resizeObserver = panel ? new ResizeObserver(updatePosition) : null;
    if (panel && resizeObserver) resizeObserver.observe(panel);

    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, placement, triggerRef, panelRef, gap, padding, minWidth, maxWidth]);

  return style;
}
