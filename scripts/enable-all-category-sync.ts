/**
 * Ensure every LZT-backed storefront category has an enabled sync rule,
 * then leave cron/API to run imports. Prefer affordable listings.
 */
import { makePrisma } from "./_db";
import { LZT_CATEGORIES } from "../src/lib/suppliers/lzt/adapter";

async function main() {
  const prisma = makePrisma();
  const cats = await prisma.category.findMany({
    where: { supplierCategory: { not: null } },
  });

  const valid = new Set<string>(LZT_CATEGORIES as readonly string[]);
  let created = 0;
  let updated = 0;

  for (const cat of cats) {
    const supplierCategory = cat.supplierCategory!;
    if (!valid.has(supplierCategory)) {
      console.log("skip non-LZT", cat.slug, supplierCategory);
      continue;
    }

    const name = `${cat.slug} — ecosystem import`;
    const existing = await prisma.syncRule.findFirst({
      where: { categoryId: cat.id, supplierCategory },
    });

    const data = {
      name,
      enabled: true,
      categoryId: cat.id,
      supplierCategory,
      maxImport: 30,
      maxSupplierPrice: 40,
      minSellerRating: 0,
      autoDeliveryOnly: true,
    };

    if (existing) {
      await prisma.syncRule.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.syncRule.create({ data });
      created++;
    }
  }

  // Disable legacy sample rule names if they duplicate
  const rules = await prisma.syncRule.findMany({
    select: {
      id: true,
      name: true,
      enabled: true,
      maxImport: true,
      supplierCategory: true,
      maxSupplierPrice: true,
    },
    orderBy: { name: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        created,
        updated,
        enabled: rules.filter((r) => r.enabled).length,
        rules,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
