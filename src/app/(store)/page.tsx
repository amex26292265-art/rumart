import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Flame,
  Layers,
  MessageSquare,
  Radio,
  Shield,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/ProductCard";
import {
  getFeaturedCategories,
  getTrending,
  getStoreStats,
  getNewest,
  getRecentlySold,
} from "@/lib/queries";
import { getRecentActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { ensureForumSeeded } from "@/app/actions/forum";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

function ActivityIcon({ type }: { type: string }) {
  if (type.includes("sold")) return <Flame className="h-4 w-4 text-orange-400" />;
  if (type.includes("seller")) return <BadgeCheck className="h-4 w-4 text-accent-400" />;
  if (type.includes("forum")) return <MessageSquare className="h-4 w-4 text-sky-400" />;
  if (type.includes("review")) return <Sparkles className="h-4 w-4 text-amber-300" />;
  return <Radio className="h-4 w-4 text-accent-400" />;
}

function SectionLabel({
  icon: Icon,
  title,
  href,
  hrefLabel = "View all",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink-950 md:text-2xl">
        <Icon className="h-5 w-5 text-accent-400" />
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm text-accent-400 hover:underline">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}

async function EcosystemHero() {
  const stats = await getStoreStats();
  return (
    <section className="relative overflow-hidden border-b border-mist-300/50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.28),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(192,132,252,0.12),_transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
      <div className="ecosystem-aurora pointer-events-none absolute -left-1/4 top-0 h-[420px] w-1/2 rounded-full bg-accent-600/20 blur-3xl" />
      <Container className="relative py-16 md:py-24">
        <p className="hero-enter text-xs font-semibold uppercase tracking-[0.28em] text-accent-400">
          Rumart by Velexis
        </p>
        <h1
          className="hero-enter mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-950 md:text-6xl"
          style={{ animationDelay: "0.08s" }}
        >
          The digital trading <span className="text-gradient">ecosystem</span>
        </h1>
        <p
          className="hero-enter mt-5 max-w-xl text-base text-ink-700 md:text-lg"
          style={{ animationDelay: "0.16s" }}
        >
          Marketplace, community, sellers, and live activity — one platform for accounts, AI, software, and services.
        </p>
        <div className="hero-enter mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.24s" }}>
          <Link href="/marketplace">
            <Button size="lg">
              Enter marketplace <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/community">
            <Button size="lg" variant="outline">
              <Users className="h-4 w-4" /> Join community
            </Button>
          </Link>
        </div>
        <div
          className="hero-enter mt-12 flex flex-wrap gap-6 text-sm text-ink-500"
          style={{ animationDelay: "0.32s" }}
        >
          <span className="inline-flex items-center gap-2">
            <Store className="h-4 w-4 text-accent-400" />
            <strong className="text-ink-900">{stats.activeProducts.toLocaleString()}</strong> live listings
          </span>
          <span className="inline-flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent-400" />
            Instant delivery
          </span>
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent-400" />
            Encrypted vault
          </span>
        </div>
      </Container>
    </section>
  );
}

type FeedItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
};

async function LiveFeed() {
  let activity: FeedItem[] = (await getRecentActivity(18)).map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    body: a.body,
    href: a.href,
  }));

  if (activity.length === 0) {
    const [newest, sold, sellers, topics] = await Promise.all([
      getNewest(6),
      getRecentlySold(4),
      prisma.sellerProfile
        .findMany({
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { displayName: true, slug: true, verified: true },
        })
        .catch(() => []),
      prisma.forumTopic
        .findMany({
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            title: true,
            slug: true,
            category: { select: { slug: true, name: true } },
          },
        })
        .catch(() => []),
    ]);

    activity = [
      ...sellers.map((s) => ({
        id: `s-${s.slug}`,
        type: "seller_joined",
        title: `${s.displayName} joined as a seller`,
        body: s.verified ? "Verified seller" : "New seller",
        href: `/seller/${s.slug}`,
      })),
      ...newest.map((p) => ({
        id: `p-${p.id}`,
        type: "product_added",
        title: `Listed · ${p.title}`,
        body: formatMoney(p.price),
        href: `/product/${p.slug}`,
      })),
      ...sold.map((p) => ({
        id: `sold-${p.id}`,
        type: "product_sold",
        title: `Sold · ${p.title}`,
        body: formatMoney(p.price),
        href: `/product/${p.slug}`,
      })),
      ...topics.map((t) => ({
        id: `t-${t.slug}`,
        type: "forum_topic",
        title: t.title,
        body: t.category.name,
        href: `/community/${t.category.slug}/${t.slug}`,
      })),
    ];
  }

  return (
    <div className="space-y-3">
      {activity.slice(0, 14).map((a) => (
        <Link
          key={a.id}
          href={a.href || "/marketplace"}
          className="group flex items-start gap-3 rounded-2xl border border-mist-300/70 bg-mist-100/80 px-4 py-3 transition-all hover:border-accent-500/40 hover:bg-mist-200/60"
        >
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-mist-200 ring-1 ring-mist-300">
            <ActivityIcon type={a.type} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-950 group-hover:text-accent-400">
              {a.title}
            </span>
            {a.body && <span className="mt-0.5 block truncate text-xs text-ink-500">{a.body}</span>}
          </span>
          <span className="shrink-0 text-[0.65rem] uppercase tracking-wider text-ink-400">live</span>
        </Link>
      ))}
    </div>
  );
}

async function TrustedSellers() {
  const sellers = await prisma.sellerProfile
    .findMany({
      where: { status: "active" },
      orderBy: [{ verified: "desc" }, { salesCount: "desc" }, { ratingAvg: "desc" }],
      take: 6,
      select: {
        slug: true,
        displayName: true,
        verified: true,
        badge: true,
        level: true,
        ratingAvg: true,
        salesCount: true,
        reputation: true,
      },
    })
    .catch(() => []);

  if (!sellers.length) {
    return (
      <p className="text-sm text-ink-500">
        Seller marketplace is open —{" "}
        <Link href="/sell" className="text-accent-400 hover:underline">
          apply to sell
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sellers.map((s) => (
        <Link
          key={s.slug}
          href={`/seller/${s.slug}`}
          className="rounded-2xl border border-mist-300/70 bg-mist-100 p-4 transition-all hover:-translate-y-0.5 hover:border-accent-500/40"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-600/20 font-display text-sm font-bold text-accent-400">
              {s.displayName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-950">
                {s.displayName}
                {s.verified && <BadgeCheck className="ml-1 inline h-3.5 w-3.5 text-accent-400" />}
              </p>
              <p className="text-xs text-ink-500">
                Lvl {s.level ?? 1} · {s.salesCount} sales · {(s.ratingAvg || 0).toFixed(1)}★
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function LatestForum() {
  await ensureForumSeeded().catch(() => {});
  const topics = await prisma.forumTopic
    .findMany({
      orderBy: [{ pinned: "desc" }, { lastReplyAt: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: {
        category: { select: { slug: true, name: true } },
        author: { select: { name: true, username: true } },
      },
    })
    .catch(() => []);

  if (!topics.length) {
    return (
      <p className="text-sm text-ink-500">
        Be the first to start a discussion in{" "}
        <Link href="/community" className="text-accent-400 hover:underline">
          Community
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {topics.map((t) => (
        <li key={t.id}>
          <Link
            href={`/community/${t.category.slug}/${t.slug}`}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-mist-200/70"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink-950">{t.title}</span>
              <span className="text-xs text-ink-500">
                {t.category.name} · @{t.author.username || t.author.name || "member"} · {t.replyCount}{" "}
                replies
              </span>
            </span>
            <MessageSquare className="h-4 w-4 shrink-0 text-ink-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function HomeTrending() {
  const trending = await getTrending(8);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {trending.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

async function CategoryRail() {
  const cats = await getFeaturedCategories();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {cats.map((c) => (
        <Link
          key={c.id}
          href={`/marketplace?category=${c.slug}`}
          className="shrink-0 rounded-full border border-mist-300 bg-mist-100 px-4 py-2 text-sm text-ink-800 transition-colors hover:border-accent-500/50 hover:text-accent-400"
        >
          {c.name}
          <span className="ml-2 text-ink-400">{c._count.products}</span>
        </Link>
      ))}
      <Link
        href="/categories"
        className="shrink-0 rounded-full border border-accent-500/40 bg-accent-600/10 px-4 py-2 text-sm text-accent-400"
      >
        All categories →
      </Link>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="border-b border-mist-300/50 py-24">
            <Container>
              <div className="skeleton h-10 w-48" />
              <div className="skeleton mt-4 h-16 w-full max-w-xl" />
            </Container>
          </div>
        }
      >
        <EcosystemHero />
      </Suspense>

      <Container className="py-10 md:py-14">
        <SectionLabel icon={Layers} title="Browse the catalog" href="/categories" />
        <Suspense fallback={<div className="skeleton h-10 w-full" />}>
          <CategoryRail />
        </Suspense>
      </Container>

      <Container className="pb-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionLabel icon={Radio} title="Marketplace activity" href="/marketplace" hrefLabel="Shop" />
            <Suspense
              fallback={
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton h-14" />
                  ))}
                </div>
              }
            >
              <LiveFeed />
            </Suspense>
          </div>
          <div className="space-y-10 lg:col-span-7">
            <div>
              <SectionLabel icon={MessageSquare} title="Latest discussions" href="/community" />
              <div className="rounded-2xl border border-mist-300/70 bg-mist-100/50 p-2">
                <Suspense fallback={<div className="skeleton h-40" />}>
                  <LatestForum />
                </Suspense>
              </div>
            </div>
            <div>
              <SectionLabel icon={BadgeCheck} title="Trusted sellers" href="/sell" hrefLabel="Become a seller" />
              <Suspense fallback={<div className="skeleton h-24" />}>
                <TrustedSellers />
              </Suspense>
            </div>
          </div>
        </div>
      </Container>

      <section className="border-y border-mist-300/50 bg-mist-50/40 py-14">
        <Container>
          <SectionLabel icon={TrendingUp} title="Trending listings" href="/marketplace" />
          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-[4/5]" />
                ))}
              </div>
            }
          >
            <HomeTrending />
          </Suspense>
        </Container>
      </section>

      <Container className="py-16">
        <div className="relative overflow-hidden rounded-3xl border border-accent-500/30 bg-gradient-to-br from-accent-700/30 via-mist-100 to-mist-50 p-8 md:p-12">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent-500/30 blur-3xl" />
          <h2 className="relative font-display text-2xl font-bold text-ink-950 md:text-3xl">
            Sell inside the ecosystem
          </h2>
          <p className="relative mt-3 max-w-lg text-ink-700">
            Multi-step seller application, reputation levels, verification badges, and a dashboard for
            orders, ratings, and followers.
          </p>
          <Link href="/sell" className="relative mt-6 inline-block">
            <Button size="lg">
              Apply to sell <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Container>
    </>
  );
}
