import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

export function AnimatedNumber({ value, duration = 700 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      currentRef.current = target;
      setDisplayValue(target);
      return;
    }

    const startValue = currentRef.current;
    if (startValue === target) {
      setDisplayValue(target);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic for a smooth deceleration at the end
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startValue + (target - startValue) * eased);

      currentRef.current = next;
      setDisplayValue(next);

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        currentRef.current = target;
        setDisplayValue(target);
      }
    }

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [value, duration]);

  return <>{displayValue}</>;
}
