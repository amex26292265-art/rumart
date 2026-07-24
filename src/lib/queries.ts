import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ProductCardData } from "@/components/store/ProductCard";
import { memo } from "@/lib/cache";

/** Only fields needed for marketplace/home cards — never pull credentialStock. */
const cardSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  currency: true,
  deliveryType: true,
  images: true,
  attributes: true,
  category: {
    select: { name: true, slug: true, icon: true, accent: true },
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

/** Strip huge attribute blobs (full game libraries, etc.) down to UI fields. */
function slimAttributes(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const games = Array.isArray(a.games) ? (a.games as unknown[]).slice(0, 8) : undefined;
  const stats = Array.isArray(a.stats) ? (a.stats as unknown[]).slice(0, 6) : undefined;
  return {
    country: a.country,
    warranty: a.warranty,
    emailNative: a.emailNative,
    sda: a.sda,
    personal: a.personal,
    vac: a.vac,
    level: a.level,
    registerDate: a.registerDate,
    lastActivity: a.lastActivity,
    ...(games ? { games } : {}),
    ...(stats ? { stats } : {}),
  };
}

function slimImages(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const https = raw.filter((u): u is string => typeof u === "string" && u.startsWith("https://"));
  return https.length ? https.slice(0, 2) : null;
}

function toCard(p: CardRow): ProductCardData {
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
    attributes: slimAttributes(p.attributes),
    images: slimImages(p.images),
  };
}

export async function getFeaturedCategories() {
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
  return memo(`trending-${limit}`, 300_000, async () => {
    const [steam, rest] = await Promise.all([
      prisma.product.findMany({
        where: { status: "active", category: { slug: "steam" } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: cardSelect,
      }),
      prisma.product.findMany({
        where: { status: "active", NOT: { category: { slug: "steam" } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: cardSelect,
      }),
    ]);
    if (steam.length >= limit) return steam.map(toCard);
    return [...steam, ...rest].slice(0, limit).map(toCard);
  });
}

export async function getRecent(limit = 8): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export async function getNewest(limit = 8): Promise<ProductCardData[]> {
  return memo(`newest-${limit}`, 180_000, () => getRecent(limit));
}

const AI_SLUGS = [
  "ai",
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
  "midjourney",
  "copilot",
  "cursor",
  "notion-ai",
  "software",
];

export async function getAiProducts(limit = 8): Promise<ProductCardData[]> {
  return memo(`ai-products-${limit}`, 300_000, async () => {
    // Category slug filter only — avoid expensive ILIKE title scans on Neon.
    const rows = await prisma.product.findMany({
      where: {
        status: "active",
        category: { slug: { in: AI_SLUGS } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: cardSelect,
    });
    return rows.map(toCard);
  });
}

export interface MarketplaceFilters {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  country?: string;
  delivery?: string;
  emailNative?: boolean;
  vac?: string;
  levelMin?: number;
  levelMax?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function buildProductWhere(filters: MarketplaceFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "active" };
  if (filters.q) {
    // Search title + description so capture lines like "4 Pickaxes" match.
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }
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
      select: cardSelect,
    }),
  ]);

  return { total, page, pageSize, products: rows.map(toCard) };
}

/** Distinct countries currently in the catalog (for the country filter). */
export async function getAvailableCountries(): Promise<string[]> {
  return memo("countries-active", 600_000, async () => {
    const rows = await prisma.product.findMany({
      where: { status: "active", country: { not: null } },
      distinct: ["country"],
      select: { country: true },
      orderBy: { country: "asc" },
    });
    return rows.map((r) => r.country!).filter(Boolean);
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      reviews: {
        where: { status: "published" },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      seller: true,
    },
  });
}

/** Real headline stats — counts from the DB, never fabricated. */
export async function getStoreStats() {
  return memo("store-stats", 300_000, async () => {
    const [products, categories, completedOrders] = await Promise.all([
      prisma.product.count({ where: { status: "active" } }),
      prisma.category.count(),
      prisma.order.count({ where: { status: "completed" } }),
    ]);
    return { products, categories, completedOrders };
  });
}
