"use client";

import { useState, useTransition } from "react";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { saveCategoryBranding, seedCategoryLogos } from "@/app/actions/admin";

type Cat = {
  id: string;
  slug: string;
  name: string;
  accent: string;
  featured: boolean;
  logoUrl: string | null;
  bannerUrl: string | null;
  count: number;
};

export function CategoryBrandingManager({ categories }: { categories: Cat[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          className="rounded-xl border border-mist-300 bg-mist-100 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-accent-500/40"
          onClick={() => {
            setMsg(null);
            start(async () => {
              const res = await seedCategoryLogos();
              setMsg(`Applied default logos to ${res.updated} categories.`);
            });
          }}
        >
          Apply default brand logos
        </button>
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((c) => (
          <form
            key={c.id}
            className="card space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                await saveCategoryBranding(fd);
                setMsg(`Saved ${c.name}.`);
              });
            }}
          >
            <input type="hidden" name="id" value={c.id} />
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-mist-200">
                <BrandIcon slug={c.slug} logoUrl={c.logoUrl} className="h-12 w-12" />
              </span>
              <div>
                <p className="font-semibold text-ink-950">{c.name}</p>
                <p className="text-xs text-ink-500">
                  {c.slug} · {c.count} live
                </p>
              </div>
            </div>
            <label className="block text-xs font-medium text-ink-500">
              Logo URL
              <input name="logoUrl" defaultValue={c.logoUrl ?? ""} placeholder="/brands/fortnite.svg" className="field mt-1" />
            </label>
            <label className="block text-xs font-medium text-ink-500">
              Banner URL
              <input name="bannerUrl" defaultValue={c.bannerUrl ?? ""} placeholder="https://…/banner.jpg" className="field mt-1" />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-medium text-ink-500">
                Accent
                <input name="accent" type="color" defaultValue={c.accent || "#7c3aed"} className="ml-2 h-8 w-12 cursor-pointer rounded border border-mist-300 bg-transparent" />
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
                <input name="featured" type="checkbox" defaultChecked={c.featured} className="rounded" />
                Featured on homepage
              </label>
              <button
                type="submit"
                disabled={pending}
                className="ml-auto rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
