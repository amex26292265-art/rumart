import "dotenv/config";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { getSupplier } from "../src/lib/suppliers/registry";
import { applyPricing, resolveCategoryPricing } from "../src/lib/pricing/engine";
import { slugify } from "../src/lib/utils";
import type { SupplierListing } from "../src/lib/suppliers/types";

/**
 * Bulk catalog import — run with `pnpm exec tsx scripts/bulk-sync.ts`.
 *
 * Same sources and pricing as the in-app sync service, but built for large
 * imports: it preloads existing supplier item ids once, inserts new products
 * with createMany in chunks (instead of one query pair per item), and paces
 * LZT page requests so long runs never hit the API rate limit. Safe to re-run:
 * existing products get a price/status refresh, new ones are imported.
 */

// Storefront category slug → how many products to keep in it.
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

const PAGE_DELAY_MS = 3200; // LZT pacing: well under the documented 300 req/min
const MAX_PAGES = 60; // hard stop per category
const CHUNK = 100; // createMany batch size

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPageWithRetry(
  supplier: NonNullable<ReturnType<typeof getSupplier>>,
  supplierCategory: string,
  page: number,
): Promise<SupplierListing[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await supplier.listItems({ supplierCategory, page });
    } catch (err) {
      if (attempt >= 4) throw err;
      const wait = attempt * 20_000;
      console.warn(`  ${supplierCategory} p${page}: ${(err as Error).message} — retry in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
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
  console.log("Pricing: global +20%, min $1 margin, .99 rounding");

  const supplierRow = await prisma.supplier.upsert({
    where: { slug: supplier.slug },
    update: {},
    create: { slug: supplier.slug, name: supplier.name },
  });

  const categories = await prisma.category.findMany({ where: { supplierCategory: { not: null } } });

  // One enabled sync rule per category so the admin panel reflects reality and
  // future in-app syncs use the same targets.
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
      maxImport: target,
    };
    if (existing) await prisma.syncRule.update({ where: { id: existing.id }, data });
    else await prisma.syncRule.create({ data });
  }
  console.log(`Sync rules ready for ${categories.length} categories`);

  // Preload every known supplier item so re-runs don't re-query per item.
  const known = new Map<string, { id: string; cost: number; status: string }>();
  for (const p of await prisma.product.findMany({
    where: { supplierId: supplierRow.id },
    select: { id: true, supplierItemId: true, cost: true, status: true },
  })) {
    known.set(p.supplierItemId, { id: p.id, cost: p.cost, status: p.status });
  }
  console.log(`${known.size} products already in catalog`);

  const run = await prisma.syncRun.create({ data: { supplierId: supplierRow.id, status: "running" } });
  let totalImported = 0;
  let totalUpdated = 0;

  try {
    for (const cat of categories) {
      const target = IMPORT_TARGETS[cat.slug] ?? 400;
      const pricing = await resolveCategoryPricing(cat.id);
      const collected: SupplierListing[] = [];
      const seen = new Set<string>();

      for (let page = 1; page <= MAX_PAGES && collected.length < target; page++) {
        const batch = await fetchPageWithRetry(supplier, cat.supplierCategory!, page);
        if (batch.length === 0) break;
        for (const item of batch) {
          if (!seen.has(item.supplierItemId)) {
            seen.add(item.supplierItemId);
            collected.push(item);
          }
        }
        if (page % 10 === 0) console.log(`  ${cat.slug}: page ${page}, ${collected.length}/${target}`);
        await sleep(PAGE_DELAY_MS);
      }
      const listings = collected.slice(0, target);

      // Split into brand-new rows and refreshes of existing ones.
      const fresh: Prisma.ProductCreateManyInput[] = [];
      let updated = 0;
      for (const listing of listings) {
        const price = applyPricing(listing.cost, pricing);
        const idx = indexable(listing);
        const existing = known.get(listing.supplierItemId);
        if (existing) {
          if (existing.cost !== listing.cost || existing.status !== "active") {
            await prisma.product.update({
              where: { id: existing.id },
              data: { price, cost: listing.cost, status: "active" },
            });
            updated++;
          }
          continue;
        }
        fresh.push({
          slug: slugify(`${listing.title}-${listing.supplierItemId}`),
          title: listing.title,
          description: listing.description,
          price,
          cost: listing.cost,
          currency: listing.currency,
          deliveryType: listing.deliveryType,
          status: "active",
          stock: 1,
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
      }

      let imported = 0;
      for (let i = 0; i < fresh.length; i += CHUNK) {
        const chunk = fresh.slice(i, i + CHUNK);
        const res = await prisma.product.createMany({ data: chunk, skipDuplicates: true });
        imported += res.count;
      }

      totalImported += imported;
      totalUpdated += updated;
      console.log(`${cat.slug}: +${imported} new, ${updated} refreshed (${listings.length} listed)`);
    }

    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "success", imported: totalImported, updated: totalUpdated, finishedAt: new Date() },
    });
    console.log(`DONE: ${totalImported} imported, ${totalUpdated} refreshed`);
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
