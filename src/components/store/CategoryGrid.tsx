import Link from "next/link";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { cn } from "@/lib/utils";

export interface CategoryTile {
  slug: string;
  name: string;
  icon: string | null;
  accent: string;
  count: number;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
}

/** Compact grid of category tiles. */
export function CategoryGrid({ categories }: { categories: CategoryTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/marketplace?category=${c.slug}`}
          className="card group flex flex-col items-center gap-3 p-5 text-center transition-transform duration-200 hover:-translate-y-1 hover:border-accent-500/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.15)]"
        >
          <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110">
            <BrandIcon slug={c.slug} logoUrl={c.logoUrl} className="h-12 w-12" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-950">{c.name}</p>
            <p className="text-xs text-ink-500">
              {c.count > 0 ? `${c.count} listing${c.count === 1 ? "" : "s"}` : "Coming soon"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Large cinematic category banners for homepage / categories page. */
export function CategoryBanners({
  categories,
  className,
}: {
  categories: CategoryTile[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/marketplace?category=${c.slug}`}
          className="group relative flex min-h-[160px] overflow-hidden rounded-2xl border border-mist-300 transition-transform duration-200 hover:-translate-y-1"
        >
          {c.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{
                background: `
                  radial-gradient(ellipse at 20% 30%, ${c.accent}99 0%, transparent 55%),
                  linear-gradient(135deg, #12121a 0%, #07070b 100%)
                `,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="relative z-10 flex w-full flex-col justify-between p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-black/40 shadow-lg ring-1 ring-white/10">
                <BrandIcon slug={c.slug} logoUrl={c.logoUrl} className="h-11 w-11" />
              </span>
              <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90">
                {c.count > 0 ? `${c.count} live` : "Soon"}
              </span>
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white">{c.name}</h3>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-xs text-white/70">{c.description}</p>
              )}
              <span className="mt-3 inline-block text-xs font-semibold text-accent-400 opacity-0 transition-opacity group-hover:opacity-100">
                Browse →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
