import Link from "next/link";
import { Shield, Zap, Lock, BadgeCheck, Sparkles, Globe2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Counter } from "@/components/ui/counter";
import { Hero } from "@/components/store/Hero";
import { CategoryBanners } from "@/components/store/CategoryGrid";
import { SectionHeader } from "@/components/store/SectionHeader";
import { HowItWorks } from "@/components/store/HowItWorks";
import { Faq } from "@/components/store/Faq";
import { Newsletter } from "@/components/store/Newsletter";
import { ProductCard } from "@/components/store/ProductCard";
import { getFeaturedCategories, getTrending, getStoreStats, getNewest, getAiProducts } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";

/** Workers build has no Neon — keep runtime-dynamic; warm isolates still hit memo(). */
export const dynamic = "force-dynamic";

const WHY = [
  { icon: Zap, title: "Instant delivery", text: "Auto-fulfillment buys upstream and unlocks credentials in seconds." },
  { icon: Lock, title: "Encrypted vault", text: "AES-256-GCM at rest. Credentials decrypt only for the buyer." },
  { icon: BadgeCheck, title: "Live inventory", text: "No fake listings — stock syncs continuously from verified sources." },
  { icon: Globe2, title: "Crypto wallet", text: "Top up with USDT, BTC, ETH and more. Buy without friction." },
];

const SECURITY = [
  { title: "Wallet isolation", text: "Funds reserved atomically — no double-spend races." },
  { title: "HMAC payment verification", text: "Crypto deposits verified with timing-safe signatures." },
  { title: "Supplier privacy", text: "Upstream sources are never exposed to customers." },
];

export default async function HomePage() {
  const [categories, trending, newest, aiProducts, stats, settings] = await Promise.all([
    getFeaturedCategories(),
    getTrending(8),
    getNewest(8),
    getAiProducts(8),
    getStoreStats(),
    getSiteSettings(),
  ]);

  const bannerCats = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    accent: c.accent,
    count: c._count.products,
    description: c.description,
  }));

  return (
    <>
      <Hero />

      <Container className="py-6">
        <SectionHeader title="Popular categories" subtitle="Cinematic browsing across games and digital goods" href="/categories" />
        <CategoryBanners categories={bannerCats.slice(0, 6)} />
      </Container>

      <Container className="py-14">
        <SectionHeader title="Trending now" subtitle="Most viewed live listings" href="/marketplace" />
        {trending.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No listings yet"
            description="The catalog fills automatically as soon as synchronization imports live inventory. Nothing here is faked."
            action={
              <Link href="/marketplace">
                <Button variant="outline">Explore the marketplace</Button>
              </Link>
            }
          />
        )}
      </Container>

      <Container className="py-6">
        <SectionHeader title="Newest arrivals" subtitle="Fresh inventory just synced" href="/marketplace?sort=newest" />
        {newest.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {newest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState title="Waiting for sync" description="Newest arrivals appear here after the next catalog refresh." />
        )}
      </Container>

      {/* AI marketplace strip */}
      <section className="relative my-10 overflow-hidden border-y border-mist-300 bg-mist-50 py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(139,92,246,0.2),_transparent_50%)]" />
        <Container className="relative">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
                <Sparkles className="h-3.5 w-3.5" /> AI & creative tools
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink-950">AI subscriptions marketplace</h2>
              <p className="mt-1 text-sm text-ink-500">ChatGPT, Claude, Cursor, Midjourney and more — instant access.</p>
            </div>
            <Link href="/marketplace?category=ai">
              <Button variant="outline">View AI catalog</Button>
            </Link>
          </div>
          {aiProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {aiProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="card grid gap-3 p-8 text-center sm:grid-cols-2 lg:grid-cols-4">
              {["ChatGPT Plus", "Claude Pro", "Cursor Pro", "Midjourney"].map((name) => (
                <div key={name} className="rounded-xl border border-mist-300 bg-mist-100/50 p-4">
                  <p className="font-semibold text-ink-950">{name}</p>
                  <p className="mt-1 text-xs text-ink-500">Coming to catalog</p>
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>

      <Container className="py-6">
        <SectionHeader title="How it works" subtitle="From browse to credentials in three steps" />
        <HowItWorks />
      </Container>

      <Container className="py-14">
        <SectionHeader title="Why Rumart" subtitle="Built by Velexis for serious digital commerce" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="card h-full p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-500/15 text-accent-400">
                <w.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-ink-950">{w.title}</h3>
              <p className="mt-1.5 text-sm text-ink-500">{w.text}</p>
            </div>
          ))}
        </div>
      </Container>

      <Container className="py-6">
        <SectionHeader title="Security first" subtitle="Enterprise controls under the hood" />
        <div className="card grid gap-6 p-6 sm:grid-cols-3">
          {SECURITY.map((s) => (
            <div key={s.title} className="flex gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" />
              <div>
                <h3 className="font-semibold text-ink-950">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>

      <Container className="py-14">
        <div className="card grid gap-6 p-8 text-center sm:grid-cols-3">
          <div>
            <Counter value={stats.products} className="font-display text-4xl font-bold text-ink-950" />
            <p className="mt-1 text-sm text-ink-500">Live listings</p>
          </div>
          <div>
            <Counter value={stats.categories} className="font-display text-4xl font-bold text-ink-950" />
            <p className="mt-1 text-sm text-ink-500">Categories</p>
          </div>
          <div>
            <Counter value={stats.completedOrders} className="font-display text-4xl font-bold text-ink-950" />
            <p className="mt-1 text-sm text-ink-500">Orders delivered</p>
          </div>
        </div>
      </Container>

      <Container className="py-6">
        <SectionHeader title="FAQ" subtitle="Straight answers, no marketing fluff" />
        <Faq />
      </Container>

      <Container className="py-16">
        <Newsletter telegramUrl={settings.telegramUrl} />
      </Container>
    </>
  );
}
