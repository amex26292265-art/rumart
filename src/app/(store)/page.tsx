import Link from "next/link";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Counter } from "@/components/ui/counter";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { Hero } from "@/components/store/Hero";
import { CategoryGrid } from "@/components/store/CategoryGrid";
import { SectionHeader } from "@/components/store/SectionHeader";
import { HowItWorks } from "@/components/store/HowItWorks";
import { Faq } from "@/components/store/Faq";
import { Newsletter } from "@/components/store/Newsletter";
import { ProductCard } from "@/components/store/ProductCard";
import { getFeaturedCategories, getTrending, getStoreStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, trending, stats] = await Promise.all([
    getFeaturedCategories(),
    getTrending(8),
    getStoreStats(),
  ]);

  return (
    <>
      <Hero />

      {/* Categories */}
      <Container className="py-4">
        <SectionHeader title="Browse categories" subtitle="Jump straight to what you need" href="/categories" />
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

      {/* Trending / recently added — honest empty state until sync imports real data */}
      <Container className="py-14">
        <SectionHeader
          title="Trending now"
          subtitle="Freshly added, verified listings"
          href="/marketplace"
        />
        {trending.length > 0 ? (
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4" stagger={0.05}>
            {trending.map((p) => (
              <StaggerItem key={p.id}>
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState
            title="No listings yet"
            description="The catalog fills automatically as soon as synchronization imports live inventory from the supplier. Nothing here is faked — real stock only."
            action={
              <Link href="/marketplace">
                <Button variant="outline">Explore the marketplace</Button>
              </Link>
            }
          />
        )}
      </Container>

      {/* How it works */}
      <Container className="py-6">
        <SectionHeader title="How it works" subtitle="From click to credentials in seconds" />
        <HowItWorks />
      </Container>

      {/* Real stats */}
      <Container className="py-16">
        <Reveal>
          <div className="card grid gap-6 p-8 text-center sm:grid-cols-3">
            <div>
              <Counter value={stats.products} className="text-4xl font-semibold text-ink-950" />
              <p className="mt-1 text-sm text-ink-500">Live listings</p>
            </div>
            <div>
              <Counter value={stats.categories} className="text-4xl font-semibold text-ink-950" />
              <p className="mt-1 text-sm text-ink-500">Categories</p>
            </div>
            <div>
              <Counter value={stats.completedOrders} className="text-4xl font-semibold text-ink-950" />
              <p className="mt-1 text-sm text-ink-500">Orders delivered</p>
            </div>
          </div>
        </Reveal>
      </Container>

      {/* FAQ */}
      <Container className="py-6">
        <SectionHeader title="Frequently asked" subtitle="Everything you need to know" />
        <Faq />
      </Container>

      {/* Newsletter */}
      <Container className="py-16">
        <Newsletter />
      </Container>
    </>
  );
}
