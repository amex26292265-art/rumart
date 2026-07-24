import Link from "next/link";
import { Reveal } from "@/components/ui/motion";

export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "View all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <Reveal className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-accent-400 transition-colors hover:text-accent-300"
        >
          {linkLabel} →
        </Link>
      )}
    </Reveal>
  );
}
