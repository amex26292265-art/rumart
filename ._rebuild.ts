import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import { runAllRules } from "./src/lib/sync/sync-service";
async function main() {
  console.log("Deleting ALL existing products…");
  await prisma.orderItem.updateMany({ data: { productId: null } });
  const del = await prisma.product.deleteMany({});
  console.log("deleted products:", del.count);

  // Enable every rule with a solid import cap for the rebuild.
  await prisma.syncRule.updateMany({ data: { enabled: true, maxImport: 100 } });

  console.log("Re-importing from the Market API (all categories)…");
  const t0 = Date.now();
  const res = await runAllRules();
  console.log("rebuild result:", res, `in ${((Date.now()-t0)/1000).toFixed(0)}s`);

  const total = await prisma.product.count({ where: { status: "active" } });
  const byCat = await prisma.category.findMany({ include: { _count: { select: { products: { where: { status: "active" } } } } }, orderBy: { order: "asc" } });
  console.log("active products:", total);
  console.log("per category:", byCat.map(c => `${c.name}:${c._count.products}`).join(", "));
  const countries = await prisma.product.findMany({ where: { status:"active", country: { not: null } }, distinct:["country"], select:{country:true} });
  console.log("distinct countries:", countries.length);
}
main().catch(e=>{console.error("ERR:",e.message);process.exit(1)}).finally(()=>prisma.$disconnect());
