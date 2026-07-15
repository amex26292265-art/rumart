import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { getSupplier } from "../src/lib/suppliers/registry";
import { applyPricing, resolveCategoryPricing } from "../src/lib/pricing/engine";
import { slugify } from "../src/lib/utils";
import type { SupplierListing } from "../src/lib/suppliers/types";

/**
 * Bulk catalog import — run with `pnpm exec tsx scripts/bulk-sync.ts`.
 *
 * Curation rules (why this is more than a dumb pager):
 *  - Sell price never exceeds $300 → supplier cost is capped at $240
 *    (240 * 1.2 markup ≈ $288.99). Anything already above $300 is archived.
 *  - Variety: game categories are bucketed per game (max ~30 per game so the
 *    catalog is never 1000 copies of one title); social categories are
 *    bucketed per country. Each category is fetched across several price
 *    bands, which naturally pulls in different games/regions.
 *  - Safe to re-run: refreshes prices of known items, imports new ones,
 *    re-balances buckets.
 */

// FORCE_REFRESH=1 rewrites attributes/images/title on every re-encountered
// product (use after changing the account-info builder).
const FORCE = process.env.FORCE_REFRESH === "1";

const MAX_COST = 240; // supplier cost cap → sell ≈ ≤ $289 < $300
const MAX_SELL = 300;
const GAME_CAP = 30; // max listings per individual game
const COUNTRY_CAP = 30; // max listings per country (social categories)
const MISC_CAP = 60; // max listings in the "unclassified" bucket
const PAGE_DELAY_MS = 3200;
const BAND_MAX_PAGES = 20;
const CHUNK = 100;
const PRICE_BANDS: Array<[number, number]> = [
  [0, 20],
  [20, 60],
  [60, 140],
  [140, MAX_COST],
];

// Storefront category slug → total import target.
const IMPORT_TARGETS: Record<string, number> = {
  steam: 1500,
  fortnite: 800,
  valorant: 700,
  ea: 600,
  gta: 600,
  discord: 600,
  telegram: 600,
  genshin: 600,
  epicgames: 600,
  roblox: 600,
  minecraft: 600,
  supercell: 600,
  warface: 400,
  battlenet: 600,
  uplay: 500,
  vpn: 400,
  instagram: 600,
  tiktok: 600,
  giftcards: 400,
};

// Named sub-game buckets (title keywords, lowercase). Cap chosen so the
// buckets can still add up to the category target.
const KEYWORD_BUCKETS: Record<string, { cap: number; buckets: Record<string, string[]> }> = {
  valorant: { cap: 350, buckets: { valorant: ["valorant"], league: ["league", "lol "] } },
  supercell: {
    cap: 150,
    buckets: {
      "clash of clans": ["clash of clans", "coc"],
      "brawl stars": ["brawl"],
      "clash royale": ["royale"],
      "hay day": ["hay day"],
    },
  },
  ea: {
    cap: 120,
    buckets: {
      "ea fc / fifa": ["fifa", "fc 2", "fc2", "ea fc"],
      apex: ["apex"],
      battlefield: ["battlefield"],
      sims: ["sims"],
      "need for speed": ["need for speed", "nfs"],
    },
  },
  battlenet: {
    cap: 100,
    buckets: {
      overwatch: ["overwatch"],
      diablo: ["diablo"],
      "call of duty": ["call of duty", "cod", "warzone"],
      "world of warcraft": ["world of warcraft", "wow"],
      hearthstone: ["hearthstone"],
      starcraft: ["starcraft"],
    },
  },
  epicgames: {
    cap: 150,
    buckets: {
      fortnite: ["fortnite"],
      gta: ["gta", "grand theft"],
      "rocket league": ["rocket league"],
    },
  },
  genshin: {
    cap: 150,
    buckets: {
      genshin: ["genshin"],
      "star rail": ["star rail", "hsr"],
      honkai: ["honkai impact", "honkai 3"],
      zenless: ["zenless", "zzz"],
    },
  },
  uplay: {
    cap: 100,
    buckets: {
      "rainbow six": ["rainbow", "r6", "siege"],
      "assassin's creed": ["assassin"],
      "far cry": ["far cry"],
      division: ["division"],
    },
  },
};

// Steam is special: bucket by the account's own detected game list (dynamic).
const STEAM_SLUG = "steam";
// Social categories: bucket by country for regional variety.
const COUNTRY_CATEGORIES = new Set(["discord", "telegram", "instagram", "tiktok"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function titleBucket(catSlug: string, title: string): string | null {
  const conf = KEYWORD_BUCKETS[catSlug];
  if (!conf) return null;
  const t = title.toLowerCase();
  for (const [bucket, words] of Object.entries(conf.buckets)) {
    if (words.some((w) => t.includes(w))) return bucket;
  }
  return null;
}

/** Bucket key + cap for a listing in a category. */
function bucketFor(catSlug: string, listing: { title: string; attributes?: Record<string, unknown> | null }): { key: string; cap: number } {
  const at = (listing.attributes ?? {}) as Record<string, unknown>;
  if (catSlug === STEAM_SLUG) {
    const games = Array.isArray(at.games) ? (at.games as string[]) : [];
    const g = games.find((x) => typeof x === "string" && x.trim().length > 1);
    return g ? { key: `game:${g.toLowerCase()}`, cap: GAME_CAP } : { key: "misc", cap: MISC_CAP };
  }
  if (COUNTRY_CATEGORIES.has(catSlug)) {
    const c = typeof at.country === "string" && at.country.trim() ? at.country.trim().toLowerCase() : null;
    return c ? { key: `country:${c}`, cap: COUNTRY_CAP } : { key: "misc", cap: MISC_CAP };
  }
  const kb = titleBucket(catSlug, listing.title);
  if (kb) return { key: `kw:${kb}`, cap: KEYWORD_BUCKETS[catSlug].cap };
  if (KEYWORD_BUCKETS[catSlug]) return { key: "misc", cap: MISC_CAP };
  return { key: "any", cap: Number.MAX_SAFE_INTEGER }; // single-game categories: no bucket limits
}

function indexable(listing: SupplierListing) {
  const at = (listing.attributes ?? {}) as Record<string, unknown>;
  return {
    country: typeof at.country === "string" ? at.country : null,
    emailNative: at.emailNative === true,
    vac: at.vac === true,
    level: typeof at.level === "number" ? at.level : null,
    tags: Array.isArray(at.tags) ? (at.tags as Prisma.InputJsonValue) : undefined,
  };
}

async function fetchPageWithRetry(
  supplier: NonNullable<ReturnType<typeof getSupplier>>,
  supplierCategory: string,
  page: number,
  minPrice: number,
  maxPrice: number,
): Promise<SupplierListing[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await supplier.listItems({ supplierCategory, page, minPrice, maxPrice });
    } catch (err) {
      if (attempt >= 4) throw err;
      const wait = attempt * 20_000;
      console.warn(`  ${supplierCategory} p${page}: ${(err as Error).message} — retry in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

async function main() {
  const supplier = getSupplier("lzt");
  if (!supplier || !supplier.isConfigured()) throw new Error("LZT supplier not configured (LZT_API_TOKEN missing)");

  // "Good price": +20% margin, at least $1 profit, prices ending in .99.
  const global = await prisma.pricingRule.findFirst({ where: { categoryId: null } });
  if (global) {
    await prisma.pricingRule.update({
      where: { id: global.id },
      data: { type: "percent", value: 20, minMargin: 1, rounding: "up_99", enabled: true },
    });
  } else {
    await prisma.pricingRule.create({
      data: { name: "Global markup", type: "percent", value: 20, minMargin: 1, rounding: "up_99", priority: 0 },
    });
  }

  const supplierRow = await prisma.supplier.upsert({
    where: { slug: supplier.slug },
    update: {},
    create: { slug: supplier.slug, name: supplier.name },
  });

  const categories = await prisma.category.findMany({ where: { supplierCategory: { not: null } } });

  // Keep the admin panel's sync rules in line with the curation rules.
  for (const cat of categories) {
    const target = IMPORT_TARGETS[cat.slug] ?? 400;
    const name = `${cat.slug} — bulk import`;
    const existing = await prisma.syncRule.findFirst({ where: { name } });
    const data = {
      name,
      enabled: true,
      categoryId: cat.id,
      supplierCategory: cat.supplierCategory!,
      autoDeliveryOnly: true,
      maxSupplierPrice: MAX_COST,
      maxImport: target,
    };
    if (existing) await prisma.syncRule.update({ where: { id: existing.id }, data });
    else await prisma.syncRule.create({ data });
  }
  console.log(`Sync rules ready for ${categories.length} categories (cost cap $${MAX_COST})`);

  // ── Cleanup pass 1: nothing on sale above $300 ─────────────────────────────
  const over = await prisma.product.updateMany({
    where: { status: "active", price: { gt: MAX_SELL } },
    data: { status: "archived" },
  });
  console.log(`Archived ${over.count} products priced above $${MAX_SELL}`);

  // ── Cleanup pass 2: re-balance existing catalog to the bucket caps ────────
  const bucketCounts = new Map<string, Map<string, number>>(); // catId → bucket → count
  for (const cat of categories) {
    const rows = await prisma.product.findMany({
      where: { categoryId: cat.id, status: "active", supplierId: supplierRow.id },
      select: { id: true, title: true, attributes: true, price: true },
      orderBy: { price: "asc" }, // keep the cheapest listings in each bucket
    });
    const counts = new Map<string, number>();
    const surplus: string[] = [];
    for (const p of rows) {
      const { key, cap } = bucketFor(cat.slug, {
        title: p.title,
        attributes: p.attributes as Record<string, unknown> | null,
      });
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      if (n > cap) surplus.push(p.id);
    }
    if (surplus.length) {
      for (let i = 0; i < surplus.length; i += 200) {
        await prisma.product.updateMany({
          where: { id: { in: surplus.slice(i, i + 200) } },
          data: { status: "archived" },
        });
      }
      console.log(`${cat.slug}: archived ${surplus.length} surplus (variety re-balance)`);
    }
    bucketCounts.set(cat.id, counts);
  }

  // Preload every known supplier item so re-runs don't re-query per item.
  const known = new Map<string, { id: string; cost: number; status: string }>();
  for (const p of await prisma.product.findMany({
    where: { supplierId: supplierRow.id },
    select: { id: true, supplierItemId: true, cost: true, status: true },
  })) {
    if (p.supplierItemId) known.set(p.supplierItemId, { id: p.id, cost: p.cost, status: p.status });
  }

  // Items imported before image support — re-encountering them backfills images.
  const noImages = new Set<string>();
  for (const p of await prisma.product.findMany({
    where: { supplierId: supplierRow.id, images: { equals: Prisma.DbNull } },
    select: { supplierItemId: true },
  })) {
    if (p.supplierItemId) noImages.add(p.supplierItemId);
  }
  console.log(`${noImages.size} products still without images`);

  const activeCounts = new Map<string, number>();
  for (const cat of categories) {
    activeCounts.set(
      cat.id,
      await prisma.product.count({ where: { categoryId: cat.id, status: "active" } }),
    );
  }

  const run = await prisma.syncRun.create({ data: { supplierId: supplierRow.id, status: "running" } });
  let totalImported = 0;
  let totalUpdated = 0;

  try {
    for (const cat of categories) {
      const target = IMPORT_TARGETS[cat.slug] ?? 400;
      let have = activeCounts.get(cat.id) ?? 0;
      if (have >= target) {
        console.log(`${cat.slug}: already at ${have}/${target}, skipping`);
        continue;
      }
      const pricing = await resolveCategoryPricing(cat.id);
      const counts = bucketCounts.get(cat.id) ?? new Map<string, number>();
      const fresh: Prisma.ProductCreateManyInput[] = [];
      let updated = 0;

      for (const [pmin, pmax] of PRICE_BANDS) {
        if (have + fresh.length >= target) break;
        let dryPages = 0;
        for (let page = 1; page <= BAND_MAX_PAGES; page++) {
          if (have + fresh.length >= target) break;
          const batch = await fetchPageWithRetry(supplier, cat.supplierCategory!, page, pmin, pmax);
          await sleep(PAGE_DELAY_MS);
          if (batch.length === 0) break;

          let accepted = 0;
          for (const listing of batch) {
            if (have + fresh.length >= target) break;
            if (listing.cost > MAX_COST || listing.cost <= 0) continue;

            const existing = known.get(listing.supplierItemId);
            if (existing) {
              const needsImages = noImages.has(listing.supplierItemId) && !!listing.images?.length;
              if (existing.status === "active" && (FORCE || existing.cost !== listing.cost || needsImages)) {
                const idx = indexable(listing);
                await prisma.product.update({
                  where: { id: existing.id },
                  data: {
                    price: applyPricing(listing.cost, pricing),
                    cost: listing.cost,
                    ...(needsImages || (FORCE && listing.images?.length)
                      ? { images: listing.images as Prisma.InputJsonValue }
                      : {}),
                    ...(FORCE
                      ? {
                          title: listing.title,
                          description: listing.description,
                          attributes: (listing.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
                          country: idx.country,
                          emailNative: idx.emailNative,
                          vac: idx.vac,
                          level: idx.level,
                          tags: idx.tags,
                        }
                      : {}),
                  },
                });
                if (needsImages) noImages.delete(listing.supplierItemId);
                updated++;
              }
              continue;
            }

            const { key, cap } = bucketFor(cat.slug, listing);
            const n = counts.get(key) ?? 0;
            if (n >= cap) continue;
            counts.set(key, n + 1);

            const idx = indexable(listing);
            fresh.push({
              slug: slugify(`${listing.title}-${listing.supplierItemId}`),
              title: listing.title,
              description: listing.description,
              price: applyPricing(listing.cost, pricing),
              cost: listing.cost,
              currency: listing.currency,
              deliveryType: listing.deliveryType,
              status: "active",
              stock: 1,
              images: listing.images?.length ? (listing.images as Prisma.InputJsonValue) : undefined,
              attributes: (listing.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
              country: idx.country,
              emailNative: idx.emailNative,
              vac: idx.vac,
              level: idx.level,
              tags: idx.tags,
              supplierItemId: listing.supplierItemId,
              supplierId: supplierRow.id,
              categoryId: cat.id,
            });
            known.set(listing.supplierItemId, { id: "pending", cost: listing.cost, status: "active" });
            accepted++;
          }

          // Band exhausted: two consecutive pages added nothing (buckets full).
          dryPages = accepted === 0 ? dryPages + 1 : 0;
          if (dryPages >= 2) break;
        }
      }

      let imported = 0;
      for (let i = 0; i < fresh.length; i += CHUNK) {
        const res = await prisma.product.createMany({ data: fresh.slice(i, i + CHUNK), skipDuplicates: true });
        imported += res.count;
      }
      have += imported;

      totalImported += imported;
      totalUpdated += updated;
      const distinct = [...counts.keys()].filter((k) => k !== "any").length;
      console.log(`${cat.slug}: +${imported} new, ${updated} repriced → ${have}/${target} active (${distinct || "n/a"} buckets)`);
    }

    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "success", imported: totalImported, updated: totalUpdated, finishedAt: new Date() },
    });
    console.log(`DONE: ${totalImported} imported, ${totalUpdated} repriced`);
  } catch (err) {
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        imported: totalImported,
        updated: totalUpdated,
        message: err instanceof Error ? err.message : "Unknown error",
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
