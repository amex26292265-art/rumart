import "dotenv/config";
import { Prisma } from "@prisma/client";
import { makePrisma } from "./_db";
import { getSupplier } from "../src/lib/suppliers/registry";
import { applyPricing, resolveCategoryPricing } from "../src/lib/pricing/engine";

/**
 * Re-refresh social categories via getItem so the newly-extracted country
 * field (telegram/instagram/tiktok) lands on every stored product — enabling
 * the country filter and country display for them.
 */
const prisma = makePrisma();
const PACE_MS = 320;
const SLUGS = ["telegram", "instagram", "tiktok", "discord"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const supplier = getSupplier("lzt");
  if (!supplier || !supplier.isConfigured()) throw new Error("LZT not configured");

  const cats = await prisma.category.findMany({ where: { slug: { in: SLUGS } }, select: { id: true, slug: true } });
  const products: { id: string; supplierItemId: string; categoryId: string }[] = [];
  for (const cat of cats) {
    const rows = await prisma.product.findMany({
      where: { status: "active", categoryId: cat.id, supplierItemId: { not: null } },
      select: { id: true, supplierItemId: true, categoryId: true },
    });
    for (const p of rows) products.push({ id: p.id, supplierItemId: p.supplierItemId!, categoryId: p.categoryId });
  }
  console.log(`refreshing ${products.length} social products`);

  const pricing = new Map<string, Awaited<ReturnType<typeof resolveCategoryPricing>>>();
  let done = 0, gone = 0, err = 0;
  for (let i = 0; i < products.length; i++) {
    const t = products[i];
    try {
      const listing = await supplier.getItem(t.supplierItemId);
      if (!listing) {
        await prisma.product.update({ where: { id: t.id }, data: { status: "unavailable" } }).catch(() => undefined);
        gone++;
      } else {
        let p = pricing.get(t.categoryId);
        if (!p) { p = await resolveCategoryPricing(t.categoryId); pricing.set(t.categoryId, p); }
        const at = (listing.attributes ?? {}) as Record<string, unknown>;
        await prisma.product.update({
          where: { id: t.id },
          data: {
            attributes: (listing.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
            country: typeof at.country === "string" ? at.country : null,
            price: applyPricing(listing.cost, p),
            cost: listing.cost,
          },
        });
        done++;
      }
    } catch { err++; }
    if ((i + 1) % 200 === 0) console.log(`  ${i + 1}/${products.length} — ${done} done, ${gone} gone, ${err} err`);
    await sleep(PACE_MS);
  }
  console.log(`DONE: ${done} refreshed, ${gone} gone, ${err} err`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
