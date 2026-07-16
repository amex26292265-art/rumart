import "dotenv/config";
import { makePrisma } from "./_db";
const prisma = makePrisma();

async function main() {
  const total = await prisma.product.count({ where: { status: "active" } });
  const imgRows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*)::bigint AS n FROM "Product" WHERE status = 'active' AND images IS NOT NULL`,
  );
  const withImages = Number(imgRows[0]?.n ?? 0);
  const full = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*)::bigint AS n FROM "Product" WHERE status = 'active' AND "attributes"::text LIKE '%Full account data%'`,
  );
  const withFull = Number(full[0]?.n ?? 0);

  const byCat = await prisma.product.groupBy({
    by: ["categoryId"],
    where: { status: "active" },
    _count: true,
  });
  const cats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const slugById = new Map(cats.map((c) => [c.id, c.slug]));

  console.log(`active products: ${total}`);
  console.log(`with full dynamic data: ${withFull} (${((withFull / total) * 100).toFixed(0)}%)`);
  console.log(`with images: ${withImages}`);
  console.log("\nby category:");
  for (const g of byCat.sort((a, b) => b._count - a._count)) {
    console.log(`  ${(slugById.get(g.categoryId) ?? "?").padEnd(12)} ${g._count}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
