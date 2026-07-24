import Link from "next/link";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ProductRow } from "@/components/store/ProductRow";
import { MarketplaceFilters, SortSelect } from "@/components/store/MarketplaceFilters";
import { getAllCategories, getMarketplace, getAvailableCountries } from "@/lib/queries";
import { filtersForCategory } from "@/lib/filter-config";

/** Workers build has no Neon — runtime-dynamic; categories/countries still memoized. */
export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const num = (v: string | string[] | undefined) => (one(v) ? Number(one(v)) : undefined);

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const category = one(sp.category);

  const [categories, countries, result] = await Promise.all([
    getAllCategories(),
    getAvailableCountries(),
    getMarketplace({
      q: one(sp.q),
      category,
      min: num(sp.min),
      max: num(sp.max),
      country: one(sp.country),
      delivery: one(sp.delivery),
      emailNative: one(sp.emailNative) === "1",
      vac: one(sp.vac),
      levelMin: num(sp.levelMin),
      levelMax: num(sp.levelMax),
      sort: one(sp.sort),
      page,
    }),
  ]);

  const { total, pageSize, products } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const defs = filtersForCategory(category);

  const pageUrl = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) next.set(k, v);
    next.set("page", String(p));
    return `/marketplace?${next.toString()}`;
  };

  const activeChips: { label: string; href: string }[] = [];
  const clearParam = (key: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== key && k !== "page") next.set(k, v);
    return `/marketplace?${next.toString()}`;
  };
  if (one(sp.q)) activeChips.push({ label: `Search: ${one(sp.q)}`, href: clearParam("q") });
  if (category) {
    const catName = categories.find((c) => c.slug === category)?.name ?? category;
    activeChips.push({ label: catName, href: clearParam("category") });
  }
  if (one(sp.country)) activeChips.push({ label: `Region: ${one(sp.country)}`, href: clearParam("country") });
  if (one(sp.delivery)) activeChips.push({ label: `Delivery: ${one(sp.delivery)}`, href: clearParam("delivery") });

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">Marketplace</h1>
      <p className="mt-1 text-sm text-ink-500">Verified digital goods with automated encrypted delivery.</p>

      {activeChips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeChips.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-400 hover:bg-accent-500/20"
            >
              {c.label} ×
            </Link>
          ))}
          <Link href="/marketplace" className="text-xs font-medium text-ink-500 hover:text-ink-900">
            Clear all
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside>
          <MarketplaceFilters
            key={category ?? "all"}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            countries={countries}
            defs={defs}
          />
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-500">
              {total > 0 ? `Showing ${from}–${to} of ${total.toLocaleString()}` : "No results"}
            </p>
            <SortSelect />
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="No listings match yet"
              description="Either no items match these filters, or the catalog hasn't been synced. Rumart only ever shows real, available stock."
              action={
                <Link href="/marketplace">
                  <Button variant="outline">Clear filters</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && (
                <Link href={pageUrl(page - 1)} className="card px-4 py-2 text-sm font-medium text-ink-700">Previous</Link>
              )}
              {pageWindow(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-2 text-ink-400">…</span>
                ) : (
                  <Link
                    key={p}
                    href={pageUrl(p as number)}
                    className={`grid h-10 min-w-10 place-items-center rounded-xl px-2 text-sm font-medium ${
                      p === page ? "bg-accent-500 text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]" : "card text-ink-700"
                    }`}
                  >
                    {p}
                  </Link>
                ),
              )}
              {page < totalPages && (
                <Link href={pageUrl(page + 1)} className="card px-4 py-2 text-sm font-medium text-ink-700">Next</Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </Container>
  );
}

/** Compact pagination window: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(current: number, total: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const push = (n: number) => out.push(n);
  const range = (a: number, b: number) => {
    for (let i = a; i <= b; i++) push(i);
  };
  if (total <= 9) {
    range(1, total);
    return out;
  }
  push(1);
  if (current > 4) out.push("…");
  range(Math.max(2, current - 2), Math.min(total - 1, current + 2));
  if (current < total - 3) out.push("…");
  push(total);
  return out;
}
