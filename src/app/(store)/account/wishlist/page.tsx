import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/store/ProductCard";
import { toggleWishlist } from "@/app/actions/account";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/account/wishlist");

  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: { include: { category: true } } },
  });

  return (
    <Container className="py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Wishlist</h1>
          <p className="mt-1 text-sm text-ink-500">Saved listings across devices</p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-accent-400">
          ← Account
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-950">Your wishlist is empty</p>
          <Link href="/marketplace" className="mt-3 inline-block text-sm font-semibold text-accent-400">
            Browse marketplace →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((item) => {
            const p = item.product;
            return (
              <div key={item.id} className="relative">
                <ProductCard
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
                    categoryIcon: p.category.icon,
                    accent: p.category.accent,
                    attributes: (p.attributes as Record<string, unknown>) ?? null,
                    images: (p.images as string[]) ?? null,
                  }}
                />
                <form
                  className="mt-2"
                  action={async () => {
                    "use server";
                    await toggleWishlist(p.id);
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm" className="w-full">
                    Remove
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}
