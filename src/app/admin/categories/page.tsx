import { prisma } from "@/lib/prisma";
import { CategoryBrandingManager } from "./CategoryBrandingManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Category banners" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { products: { where: { status: "active" } } } } },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-950">Category logos & banners</h1>
      <p className="mt-1 text-sm text-ink-500">
        Set real brand marks and wide banners for Fortnite, Valorant, Steam, and more.
      </p>
      <div className="mt-8">
        <CategoryBrandingManager
          categories={categories.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            accent: c.accent,
            featured: c.featured,
            logoUrl: (c as { logoUrl?: string | null }).logoUrl ?? null,
            bannerUrl: (c as { bannerUrl?: string | null }).bannerUrl ?? null,
            count: c._count.products,
          }))}
        />
      </div>
    </div>
  );
}
