import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  neutral: "bg-mist-200 text-ink-700 border border-mist-300",
  dark: "bg-mist-100 text-ink-950 border border-mist-300",
  accent: "bg-accent-500/15 text-accent-400 border border-accent-500/25",
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  danger: "bg-red-500/15 text-red-400 border border-red-500/25",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
