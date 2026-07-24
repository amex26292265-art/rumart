/**
 * Refresh marketplace titles for existing products using stored attributes.
 * Usage: pnpm exec tsx scripts/refresh-titles.ts
 */
import "dotenv/config";
import { makePrisma } from "./_db";
import { buildMarketplaceTitle, type TitleAttrs } from "../src/lib/suppliers/lzt/titles";

const prisma = makePrisma();

async function main() {
  const products = await prisma.product.findMany({
    where: { status: { in: ["active", "hidden"] } },
    include: { category: true },
  });
  let updated = 0;
  for (const p of products) {
    const a = (p.attributes as TitleAttrs | null) ?? {};
    const title = buildMarketplaceTitle(p.category.slug, a, p.title);
    if (title !== p.title) {
      await prisma.product.update({ where: { id: p.id }, data: { title } });
      updated++;
    }
  }
  console.log(`Titles refreshed: ${updated}/${products.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
