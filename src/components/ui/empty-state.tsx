import { PackageOpen } from "lucide-react";

/**
 * Honest empty state. Rumart never fabricates products/reviews/stats — when
 * there is no real data yet, we say so clearly instead of faking content.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-mist-100 text-ink-400">
        <PackageOpen className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ink-950">{title}</h3>
        {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
