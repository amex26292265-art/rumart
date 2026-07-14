import Link from "next/link";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { Stagger, StaggerItem } from "@/components/ui/motion";

export interface CategoryTile {
  slug: string;
  name: string;
  icon: string | null;
  accent: string;
  count: number;
}

export function CategoryGrid({ categories }: { categories: CategoryTile[] }) {
  return (
    <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" stagger={0.05}>
      {categories.map((c) => (
        <StaggerItem key={c.slug}>
          <Link
            href={`/marketplace?category=${c.slug}`}
            className="card group flex flex-col items-center gap-3 p-5 text-center transition-all hover:-translate-y-1 hover:border-ink-900"
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, ${c.accent}, #0a0a0b 160%)` }}
            >
              <BrandIcon slug={c.slug} className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-950">{c.name}</p>
              <p className="text-xs text-ink-400">
                {c.count > 0 ? `${c.count} listing${c.count === 1 ? "" : "s"}` : "Coming soon"}
              </p>
            </div>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
