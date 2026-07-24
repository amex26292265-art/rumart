"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/utils";

/**
 * Counts up to `value` when scrolled into view. Real numbers only.
 * Uses IntersectionObserver (no framer-motion dependency).
 */
export function Counter({
  value,
  duration = 1.1,
  className,
  money = false,
  currency = "USD",
}: {
  value: number;
  duration?: number;
  className?: string;
  money?: boolean;
  currency?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { rootMargin: "-40px", threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  useEffect(() => {
    if (!started) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, value, duration]);

  return (
    <span ref={ref} className={className}>
      {money ? formatMoney(display, currency) : display.toLocaleString()}
    </span>
  );
}
