import { cn } from "@/lib/utils";

/** Rumart monogram mark — geometric "R" in a rounded square with a blue accent. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="currentColor" />
      <path
        d="M22 46V18h12.5c5.2 0 8.7 3.1 8.7 8 0 3.7-2 6.4-5.3 7.5L44 46h-6.4l-5.2-11.2H28V46h-6Zm6-16.1h6c2.4 0 3.9-1.4 3.9-3.6s-1.5-3.6-3.9-3.6h-6v7.2Z"
        className="fill-white"
      />
      {/* Gently pulsing accent dot */}
      <circle cx="45" cy="21" r="4" fill="#2563eb" className="animate-pulse" />
    </svg>
  );
}

/** Full lockup: mark + wordmark. */
export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-ink-950", className)}>
      <LogoMark className="h-8 w-8" />
      {showWord && (
        <span className="text-[1.35rem] font-semibold tracking-tight">
          Rumart
        </span>
      )}
    </span>
  );
}
