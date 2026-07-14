"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countryLabel } from "@/lib/countries";
import type { FilterDef } from "@/lib/filter-config";

export interface CategoryOption {
  slug: string;
  name: string;
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-mist-200 pt-4 first:border-0 first:pt-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</p>
      {children}
    </div>
  );
}

/**
 * Category-aware, debounced, sticky, collapsible filter panel. The set of
 * filters is driven by `defs` (computed per category on the server), so Steam
 * shows VAC / level while socials don't. Changes auto-apply after a short
 * debounce for an instant feel.
 */
export function MarketplaceFilters({
  categories,
  countries,
  defs,
}: {
  categories: CategoryOption[];
  countries: string[];
  defs: FilterDef[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const firstRun = useRef(true);
  const [open, setOpen] = useState(false); // mobile collapse

  const [q, setQ] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const [country, setCountry] = useState(params.get("country") ?? "");
  const [delivery, setDelivery] = useState(params.get("delivery") ?? "");
  const [emailNative, setEmailNative] = useState(params.get("emailNative") === "1");
  const [vac, setVac] = useState(params.get("vac") ?? "");
  const [levelMin, setLevelMin] = useState(params.get("levelMin") ?? "");
  const [levelMax, setLevelMax] = useState(params.get("levelMax") ?? "");

  const has = (k: string) => defs.some((d) => d.key === k);

  // Debounced auto-apply.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams();
      if (q.trim()) next.set("q", q.trim());
      if (category) next.set("category", category);
      if (min) next.set("min", min);
      if (max) next.set("max", max);
      if (country) next.set("country", country);
      if (delivery) next.set("delivery", delivery);
      if (emailNative) next.set("emailNative", "1");
      if (vac) next.set("vac", vac);
      if (levelMin) next.set("levelMin", levelMin);
      if (levelMax) next.set("levelMax", levelMax);
      const sort = params.get("sort");
      if (sort) next.set("sort", sort);
      router.push(`/marketplace?${next.toString()}`, { scroll: false });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, min, max, country, delivery, emailNative, vac, levelMin, levelMax]);

  const reset = () => {
    setQ(""); setCategory(""); setMin(""); setMax(""); setCountry("");
    setDelivery(""); setEmailNative(false); setVac(""); setLevelMin(""); setLevelMax("");
    router.push("/marketplace", { scroll: false });
  };

  const body = (
    <div className="space-y-4">
      <FilterSection title="Search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or ID…" className="field" />
      </FilterSection>

      <FilterSection title="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="field">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </FilterSection>

      {has("price") && (
        <FilterSection title="Price ($)">
          <div className="flex items-center gap-2">
            <input value={min} onChange={(e) => setMin(e.target.value)} type="number" min="0" placeholder="Min" className="field" />
            <span className="text-ink-400">–</span>
            <input value={max} onChange={(e) => setMax(e.target.value)} type="number" min="0" placeholder="Max" className="field" />
          </div>
        </FilterSection>
      )}

      {has("country") && (
        <FilterSection title="Country">
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="field">
            <option value="">Any country</option>
            {countries.map((c) => (
              <option key={c} value={c}>{countryLabel(c)}</option>
            ))}
          </select>
        </FilterSection>
      )}

      {has("delivery") && (
        <FilterSection title="Delivery">
          <select value={delivery} onChange={(e) => setDelivery(e.target.value)} className="field">
            <option value="">Any</option>
            <option value="auto">Instant (auto)</option>
            <option value="manual">Manual</option>
          </select>
        </FilterSection>
      )}

      {has("emailNative") && (
        <FilterSection title="Email access">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={emailNative} onChange={(e) => setEmailNative(e.target.checked)} className="accent-accent-500" />
            Native email access
          </label>
        </FilterSection>
      )}

      {has("vac") && (
        <FilterSection title="VAC / game ban">
          <select value={vac} onChange={(e) => setVac(e.target.value)} className="field">
            <option value="">Any</option>
            <option value="no">Without VAC ban</option>
            <option value="yes">With VAC ban</option>
          </select>
        </FilterSection>
      )}

      {has("level") && (
        <FilterSection title="Account level">
          <div className="flex items-center gap-2">
            <input value={levelMin} onChange={(e) => setLevelMin(e.target.value)} type="number" min="0" placeholder="Min" className="field" />
            <span className="text-ink-400">–</span>
            <input value={levelMax} onChange={(e) => setLevelMax(e.target.value)} type="number" min="0" placeholder="Max" className="field" />
          </div>
        </FilterSection>
      )}

      <Button type="button" variant="outline" onClick={reset} className="w-full">Reset filters</Button>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-mist-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 lg:hidden"
      >
        <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</span>
        {open ? <X className="h-4 w-4" /> : null}
      </button>

      <div className="hidden lg:block">
        <div className="card sticky top-20 p-5">{body}</div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden lg:hidden"
          >
            <div className="card mb-4 p-5">{body}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const change = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("sort", value);
    next.delete("page");
    router.push(`/marketplace?${next.toString()}`, { scroll: false });
  };
  return (
    <select value={params.get("sort") ?? "newest"} onChange={(e) => change(e.target.value)} className="field !w-auto" aria-label="Sort">
      <option value="newest">Newest</option>
      <option value="priceAsc">Price: low to high</option>
      <option value="priceDesc">Price: high to low</option>
    </select>
  );
}
