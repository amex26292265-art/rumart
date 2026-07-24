import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { BadgeCheck, MessageSquare, Store } from "lucide-react";
import { FollowButton, MessageButton } from "../ProfileActions";
import { ProductCard } from "@/components/store/ProductCard";
import type { ProductCardData } from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";

async function loadUser(username: string) {
  return prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      discord: true,
      telegram: true,
      website: true,
      country: true,
      role: true,
      createdAt: true,
      sellerProfile: true,
      _count: {
        select: {
          followers: true,
          following: true,
          reviews: true,
          forumTopics: true,
        },
      },
    },
  });
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await loadUser(username);
  if (!user) notFound();

  const session = await auth();
  const me = (session?.user as { id?: string } | undefined)?.id;
  const isSelf = me === user.id;

  let isFollowing = false;
  if (me && !isSelf) {
    const f = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: me, followingId: user.id } },
    });
    isFollowing = Boolean(f);
  }

  let products: ProductCardData[] = [];
  if (user.sellerProfile) {
    const rows = await prisma.product.findMany({
      where: { sellerId: user.sellerProfile.id, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { category: { select: { name: true, slug: true, icon: true, accent: true } } },
    });
    products = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      price: p.price,
      currency: p.currency,
      deliveryType: p.deliveryType,
      categoryName: p.category.name,
      categorySlug: p.category.slug,
      categoryIcon: p.category.icon,
      accent: p.category.accent,
      attributes: null,
      images: Array.isArray(p.images) ? (p.images as string[]).slice(0, 2) : null,
    }));
  }

  const handle = user.username || user.name || "member";

  return (
    <div>
      <div
        className="relative h-40 w-full border-b border-mist-300 md:h-52"
        style={{
          background: user.bannerUrl
            ? `center/cover url(${user.bannerUrl})`
            : "radial-gradient(ellipse at top, rgba(124,58,237,0.45), transparent 60%), #0c0c12",
        }}
      />
      <Container className="-mt-12 pb-16">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border-2 border-paper bg-mist-200 font-display text-2xl font-bold text-accent-400 shadow-xl">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              handle.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-ink-950 md:text-3xl">
              {user.name || handle}
              {user.sellerProfile?.verified && (
                <BadgeCheck className="ml-2 inline h-5 w-5 text-accent-400" />
              )}
            </h1>
            <p className="text-sm text-ink-500">
              @{handle}
              {user.country ? ` · ${user.country}` : ""} · joined{" "}
              {user.createdAt.toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isSelf && me && (
              <>
                <FollowButton userId={user.id} initial={isFollowing} />
                <MessageButton recipientId={user.id} />
              </>
            )}
            {isSelf && (
              <Link href="/account/profile">
                <Button variant="outline" size="sm">
                  Edit profile
                </Button>
              </Link>
            )}
            {user.sellerProfile && (
              <Link href={`/seller/${user.sellerProfile.slug}`}>
                <Button variant="outline" size="sm">
                  <Store className="h-4 w-4" /> Seller shop
                </Button>
              </Link>
            )}
          </div>
        </div>

        {user.bio && <p className="mt-6 max-w-2xl text-ink-700">{user.bio}</p>}

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-ink-600">
          <span>
            <strong className="text-ink-950">{user._count.followers}</strong> followers
          </span>
          <span>
            <strong className="text-ink-950">{user._count.following}</strong> following
          </span>
          <span>
            <strong className="text-ink-950">{user._count.reviews}</strong> reviews
          </span>
          <span>
            <strong className="text-ink-950">{user._count.forumTopics}</strong> topics
          </span>
          {user.sellerProfile && (
            <span className="inline-flex items-center gap-1 text-accent-400">
              <BadgeCheck className="h-3.5 w-3.5" />
              {user.sellerProfile.badge} · Lvl {user.sellerProfile.level ?? 1} · rep{" "}
              {user.sellerProfile.reputation ?? 0}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {user.discord && <span className="text-ink-500">Discord · {user.discord}</span>}
          {user.telegram && <span className="text-ink-500">Telegram · {user.telegram}</span>}
          {user.website && (
            <a href={user.website} className="text-accent-400 hover:underline" target="_blank" rel="noreferrer">
              Website
            </a>
          )}
        </div>

        {products.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 font-display text-xl font-semibold text-ink-950">Listings</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <Link href="/community" className="inline-flex items-center gap-2 text-sm text-accent-400 hover:underline">
            <MessageSquare className="h-4 w-4" /> Browse community discussions
          </Link>
        </div>
      </Container>
    </div>
  );
}
