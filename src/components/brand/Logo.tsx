import { cn } from "@/lib/utils";

/** Rumart monogram — geometric R with violet pulse. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id="rm-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#rm-mark)" />
      <path
        d="M22 46V18h12.5c5.2 0 8.7 3.1 8.7 8 0 3.7-2 6.4-5.3 7.5L44 46h-6.4l-5.2-11.2H28V46h-6Zm6-16.1h6c2.4 0 3.9-1.4 3.9-3.6s-1.5-3.6-3.9-3.6h-6v7.2Z"
        className="fill-white"
      />
      <circle cx="45" cy="21" r="4" fill="#c084fc" className="animate-pulse" />
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
      <LogoMark className="h-8 w-8" />
      {showWord && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.35rem] font-bold tracking-tight">Rumart</span>
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
