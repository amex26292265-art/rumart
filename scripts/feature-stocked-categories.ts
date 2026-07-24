import { makePrisma } from "./_db";

/** Unfeature empty manual categories; feature every category that has active stock. */
async function main() {
  const prisma = makePrisma();
  const cats = await prisma.category.findMany({
    include: { _count: { select: { products: { where: { status: "active" } } } } },
  });
  for (const c of cats) {
    const hasStock = c._count.products > 0;
    await prisma.category.update({
      where: { id: c.id },
      data: { featured: hasStock && (c.featured || Boolean(c.supplierCategory)) },
    });
  }
  const featured = await prisma.category.findMany({
    where: { featured: true },
    orderBy: { order: "asc" },
    select: { slug: true, _count: { select: { products: { where: { status: "active" } } } } },
  });
  console.log(
    "featured",
    featured.map((f) => `${f.slug}:${f._count.products}`),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
