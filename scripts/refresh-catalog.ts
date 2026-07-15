import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client/edge";
import { getSupplier } from "../src/lib/suppliers/registry";
import { applyPricing, resolveCategoryPricing } from "../src/lib/pricing/engine";
import type { PricingRuleInput } from "../src/lib/pricing/engine";

/**
 * Direct per-product refresh via the supplier's getItem() endpoint. Unlike the
 * page-based bulk-sync, this reaches EVERY stored product deterministically
 * (re-paging only refreshes items still on the front listings), so it's how the
 * whole catalog gets the full dynamic attributes + images.
 *
 *   pnpm exec tsx scripts/refresh-catalog.ts          # only stale products
 *   REFRESH_ALL=1 pnpm exec tsx scripts/refresh-catalog.ts   # every product
 *
 * A product whose listing is gone upstream (sold/delisted) is marked
 * unavailable so customers never see dead stock.
 */
const prisma = new PrismaClient();
const PACE_MS = 320; // ~185 req/min, safely under LZT's 300/min
const REFRESH_ALL = process.env.REFRESH_ALL === "1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function indexable(attributes: Record<string, unknown> | undefined) {
  const at = attributes ?? {};
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
  if (!supplier || !supplier.isConfigured()) throw new Error("LZT not configured");

  // Load ids in pages and decide per product whether it already has the full
  // dynamic attributes (cheaper and more reliable than a JSON path filter).
  const targets: { id: string; supplierItemId: string; categoryId: string; hasFull: boolean }[] = [];
  const pageSize = 800;
  let cursor: string | undefined;
  for (;;) {
    const batch = await prisma.product.findMany({
      where: { status: "active", supplierItemId: { not: null } },
      select: { id: true, supplierItemId: true, categoryId: true, attributes: true },
      orderBy: { id: "asc" },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    for (const p of batch) {
      const hasFull = JSON.stringify(p.attributes ?? {}).includes("Full account data");
      targets.push({ id: p.id, supplierItemId: p.supplierItemId!, categoryId: p.categoryId, hasFull });
    }
    cursor = batch[batch.length - 1].id;
    if (batch.length < pageSize) break;
  }

  const todo = REFRESH_ALL ? targets : targets.filter((t) => !t.hasFull);
  console.log(`${targets.length} active products, refreshing ${todo.length}`);

  const pricingCache = new Map<string, PricingRuleInput>();
  const getPricing = async (categoryId: string) => {
    let p = pricingCache.get(categoryId);
    if (!p) {
      p = await resolveCategoryPricing(categoryId);
      pricingCache.set(categoryId, p);
    }
    return p;
  };

  let refreshed = 0;
  let gone = 0;
  let errors = 0;
  for (let i = 0; i < todo.length; i++) {
    const t = todo[i];
    try {
      const listing = await supplier.getItem(t.supplierItemId);
      if (!listing) {
        await prisma.product.update({ where: { id: t.id }, data: { status: "unavailable" } }).catch(() => undefined);
        gone++;
      } else {
        const pricing = await getPricing(t.categoryId);
        const idx = indexable(listing.attributes);
        await prisma.product.update({
          where: { id: t.id },
          data: {
            title: listing.title,
            description: listing.description,
            cost: listing.cost,
            price: applyPricing(listing.cost, pricing),
            attributes: (listing.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
            images: listing.images?.length ? (listing.images as Prisma.InputJsonValue) : undefined,
            country: idx.country,
            emailNative: idx.emailNative,
            vac: idx.vac,
            level: idx.level,
            tags: idx.tags,
          },
        });
        refreshed++;
      }
    } catch (err) {
      errors++;
      if (errors <= 5) console.warn(`  ${t.supplierItemId}: ${(err as Error).message}`);
    }
    if ((i + 1) % 200 === 0) console.log(`  ${i + 1}/${todo.length} — ${refreshed} refreshed, ${gone} gone, ${errors} err`);
    await sleep(PACE_MS);
  }

  console.log(`DONE: ${refreshed} refreshed, ${gone} marked unavailable, ${errors} errors`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
