import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { SellerListingForm } from "./SellerListingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seller dashboard" };

export default async function SellerDashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/seller");

  const profile = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (!profile) redirect("/sell");

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { sellerId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <Container className="py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold text-ink-950">{profile.displayName}</h1>
            <Badge tone={profile.verified ? "accent" : "neutral"}>{profile.badge}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {profile.salesCount} sales · {formatMoney(profile.earnings)} earned ·{" "}
            <Link href={`/seller/${profile.slug}`} className="text-accent-400">
              Public profile
            </Link>
          </p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-accent-400">
          ← Account
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-4 font-display text-xl font-bold text-ink-950">Your listings</h2>
          {products.length === 0 ? (
            <div className="card p-8 text-sm text-ink-500">No listings yet — create one on the right.</div>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li key={p.id} className="card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link href={`/product/${p.slug}`} className="truncate font-medium text-ink-950 hover:text-accent-400">
                      {p.title}
                    </Link>
                    <p className="text-xs text-ink-500">
                      {p.category.name} · {p.status}
                    </p>
                  </div>
                  <span className="font-semibold text-ink-950">{formatMoney(p.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-4 font-display text-xl font-bold text-ink-950">New listing</h2>
          <SellerListingForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>
    </Container>
  );
}
