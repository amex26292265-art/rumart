"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { formatMoney } from "@/lib/utils";

/**
 * Counts up to `value` when scrolled into view. Real numbers only.
 * Formatting is chosen via serializable props (`money`) so this client
 * component can be rendered directly from server components.
 */
export function Counter({
  value,
  duration = 1.3,
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
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {money ? formatMoney(display, currency) : display.toLocaleString()}
    </span>
  );
}
