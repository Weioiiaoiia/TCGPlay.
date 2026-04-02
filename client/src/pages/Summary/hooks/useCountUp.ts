/**
 * useCountUp - Animated number counter hook
 * Creates smooth count-up animation for financial metrics
 */

import { useState, useEffect, useRef } from "react";

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  decimals?: number;
  delay?: number;
  easing?: "linear" | "easeOut" | "easeInOut";
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function useCountUp({
  start = 0,
  end,
  duration = 1800,
  decimals = 0,
  delay = 0,
  easing = "easeOut",
}: UseCountUpOptions): number {
  const [value, setValue] = useState(start);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const startAnimation = () => {
      startTimeRef.current = 0;

      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        let easedProgress: number;
        switch (easing) {
          case "linear":
            easedProgress = progress;
            break;
          case "easeInOut":
            easedProgress = easeInOutCubic(progress);
            break;
          default:
            easedProgress = easeOutCubic(progress);
        }

        const current = start + (end - start) * easedProgress;
        setValue(parseFloat(current.toFixed(decimals)));

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    };

    const timer = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timer);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [start, end, duration, decimals, delay, easing]);

  return value;
}

export function formatCurrency(value: number, decimals = 1): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return (value / 1000).toFixed(1) + "K";
  }
  return value.toFixed(decimals);
}
