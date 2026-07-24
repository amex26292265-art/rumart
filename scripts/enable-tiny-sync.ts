import { makePrisma } from "./_db";

async function main() {
  const prisma = makePrisma();
  const rules = await prisma.syncRule.findMany();
  console.log(
    rules.map((r) => ({
      id: r.id,
      name: r.name,
      enabled: r.enabled,
      maxImport: r.maxImport,
      cat: r.supplierCategory,
    })),
  );
  // Enable a tiny steam sync so marketplace has something after cutover.
  for (const r of rules) {
    await prisma.syncRule.update({
      where: { id: r.id },
      data: {
        enabled: r.supplierCategory === "steam",
        maxImport: 15,
        autoDeliveryOnly: true,
        maxSupplierPrice: 25,
      },
    });
  }
  console.log(
    "updated",
    await prisma.syncRule.findMany({
      select: { name: true, enabled: true, maxImport: true, maxSupplierPrice: true },
    }),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
