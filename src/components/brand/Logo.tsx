import { cn } from "@/lib/utils";

/**
 * Rumart V3 mark — dual-axis portal / circuit node.
 * Not a letter monogram; cyber trading identity for Rumart by Velexis.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id="rm-v3-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#1e1033" />
        </linearGradient>
        <linearGradient id="rm-v3-ring" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <filter id="rm-v3-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="64" height="64" rx="18" fill="#0a0614" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="16.5" fill="none" stroke="url(#rm-v3-ring)" strokeWidth="1.25" opacity="0.85" />
      {/* Outer circuit arcs */}
      <path
        d="M18 14c10-6 22-4 28 4M46 50c-10 6-22 4-28-4"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Hex portal */}
      <path
        d="M32 14 L46 22 V38 L32 46 L18 38 V22 Z"
        fill="url(#rm-v3-core)"
        opacity="0.95"
        filter="url(#rm-v3-glow)"
      />
      <path
        d="M32 20 L40 24.5 V33.5 L32 38 L24 33.5 V24.5 Z"
        fill="#0b0714"
        stroke="#e9d5ff"
        strokeWidth="1"
        opacity="0.9"
      />
      {/* Center node + crosshair */}
      <circle cx="32" cy="29" r="3.2" fill="#c084fc" />
      <circle cx="32" cy="29" r="6" fill="none" stroke="#a78bfa" strokeWidth="1" opacity="0.7" />
      <path d="M32 16.5 V20 M32 38 V41.5 M17.5 29 H21 M43 29 H46.5" stroke="#c084fc" strokeWidth="1.25" strokeLinecap="round" opacity="0.8" />
      {/* Corner ticks */}
      <path d="M12 20 V14 H18 M52 20 V14 H46 M12 44 V50 H18 M52 44 V50 H46" fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Full lockup: mark + wordmark. */
export function Logo({
  className,
  showWord = true,
  showOwner = false,
}: {
  className?: string;
  showWord?: boolean;
  showOwner?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-ink-950", className)}>
      <LogoMark className="h-8 w-8 shrink-0" />
      {showWord && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.35rem] font-bold tracking-tight">
            Rumart
          </span>
          {showOwner && (
            <span className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-ink-500">
              by Velexis
            </span>
          )}
        </span>
      )}
    </span>
  );
}
