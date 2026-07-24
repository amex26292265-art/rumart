import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/store/ProductCard";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SellerPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await prisma.sellerProfile.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: "active" },
        take: 24,
        include: { category: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!profile || profile.status !== "active") notFound();

  return (
    <Container className="py-12">
      <div className="card p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold text-ink-950">{profile.displayName}</h1>
          <Badge tone={profile.verified ? "accent" : "neutral"}>{profile.badge}</Badge>
          {profile.verified && <Badge tone="success">Verified</Badge>}
        </div>
        {profile.bio && <p className="mt-3 max-w-2xl text-sm text-ink-500">{profile.bio}</p>}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-500">
          <span>{profile.salesCount} sales</span>
          <span>
            {profile.ratingCount > 0 ? `${profile.ratingAvg.toFixed(1)}★ (${profile.ratingCount})` : "No ratings yet"}
          </span>
          <span>{formatMoney(profile.earnings)} lifetime</span>
        </div>
      </div>

      <h2 className="mb-4 mt-10 font-display text-xl font-bold text-ink-950">Listings</h2>
      {profile.products.length === 0 ? (
        <p className="text-sm text-ink-500">No active listings.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {profile.products.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                slug: p.slug,
                title: p.title,
                description: p.description,
                price: p.price,
                currency: p.currency,
                deliveryType: p.deliveryType,
                categoryName: p.category.name,
                categorySlug: p.category.slug,
                accent: p.category.accent,
                attributes: (p.attributes as Record<string, unknown>) ?? null,
                images: (p.images as string[]) ?? null,
              }}
            />
          ))}
        </div>
      )}
      <Link href="/marketplace" className="mt-8 inline-block text-sm font-semibold text-accent-400">
        ← Back to marketplace
      </Link>
    </Container>
  );
}
