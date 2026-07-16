import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ProductCardData } from "@/components/store/ProductCard";
import { memo } from "@/lib/cache";

/** Shape a Product row (with its category) into card data for the UI. */
function toCard(
  p: Prisma.ProductGetPayload<{ include: { category: true } }>,
): ProductCardData {
  return {
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
    attributes: (p.attributes as Record<string, unknown> | null) ?? null,
    images: (p.images as string[] | null) ?? null,
  };
}

export async function getFeaturedCategories() {
  // Cached ~5 min — the homepage category grid is the same for everyone.
  return memo("cat-featured", 300_000, () =>
    prisma.category.findMany({
      where: { featured: true },
      orderBy: { order: "asc" },
      include: { _count: { select: { products: { where: { status: "active" } } } } },
    }),
  );
}

export async function getAllCategories() {
  return memo("cat-all", 300_000, () =>
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { products: { where: { status: "active" } } } } },
    }),
  );
}

export async function getTrending(limit = 8): Promise<ProductCardData[]> {
  // Cached ~5 min — homepage "Trending now" is identical for all visitors.
  return memo(`trending-${limit}`, 300_000, async () => {
    // Lead with Steam accounts (flagship, and they carry game-cover images).
    const steam = await prisma.product.findMany({
      where: { status: "active", category: { slug: "steam" } },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      include: { category: true },
    });
    if (steam.length >= limit) return steam.map(toCard);
    const rest = await prisma.product.findMany({
      where: { status: "active", NOT: { category: { slug: "steam" } } },
      orderBy: { createdAt: "desc" },
      take: limit - steam.length,
      include: { category: true },
    });
    return [...steam, ...rest].map(toCard);
  });
}

export async function getRecent(limit = 8): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { category: true },
  });
  return rows.map(toCard);
}

export interface MarketplaceFilters {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  country?: string;
  delivery?: string; // auto | manual
  emailNative?: boolean;
  vac?: string; // "no" (exclude) | "yes" (only)
  levelMin?: number;
  levelMax?: number;
  sort?: string; // newest | priceAsc | priceDesc
  page?: number;
  pageSize?: number;
}

export function buildProductWhere(filters: MarketplaceFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "active" };
  if (filters.q) where.title = { contains: filters.q, mode: "insensitive" };
  if (filters.category) where.category = { slug: filters.category };
  if (filters.min != null || filters.max != null) where.price = { gte: filters.min, lte: filters.max };
  if (filters.country) where.country = filters.country;
  if (filters.delivery === "auto" || filters.delivery === "manual") where.deliveryType = filters.delivery;
  if (filters.emailNative) where.emailNative = true;
  if (filters.vac === "no") where.vac = false;
  if (filters.vac === "yes") where.vac = true;
  if (filters.levelMin != null || filters.levelMax != null) {
    where.level = { gte: filters.levelMin, lte: filters.levelMax };
  }
  return where;
}

export async function getMarketplace(filters: MarketplaceFilters) {
  const pageSize = filters.pageSize ?? 24;
  const page = Math.max(1, filters.page ?? 1);
  const where = buildProductWhere(filters);

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "priceAsc"
      ? { price: "asc" }
      : filters.sort === "priceDesc"
        ? { price: "desc" }
        : { createdAt: "desc" };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true },
    }),
  ]);

  return { total, page, pageSize, products: rows.map(toCard) };
}

/** Distinct countries currently in the catalog (for the country filter). */
export async function getAvailableCountries(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { status: "active", country: { not: null } },
    distinct: ["country"],
    select: { country: true },
    orderBy: { country: "asc" },
  });
  return rows.map((r) => r.country!).filter(Boolean);
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { category: true, reviews: { include: { user: true }, orderBy: { createdAt: "desc" } } },
  });
}

/** Real headline stats — counts from the DB, never fabricated. */
export async function getStoreStats() {
  const [products, categories, completedOrders] = await Promise.all([
    prisma.product.count({ where: { status: "active" } }),
    prisma.category.count(),
    prisma.order.count({ where: { status: "completed" } }),
  ]);
  return { products, categories, completedOrders };
}
