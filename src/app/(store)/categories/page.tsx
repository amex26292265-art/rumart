import { Container } from "@/components/ui/container";
import { CategoryGrid } from "@/components/store/CategoryGrid";
import { SectionHeader } from "@/components/store/SectionHeader";
import { getAllCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await getAllCategories();
  return (
    <Container className="py-12">
      <SectionHeader title="All categories" subtitle="Every product line on Rumart" />
      <CategoryGrid
        categories={categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          icon: c.icon,
          accent: c.accent,
          count: c._count.products,
        }))}
      />
    </Container>
  );
}
