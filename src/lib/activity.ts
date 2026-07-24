import { prisma } from "@/lib/prisma";

export type ActivityType =
  | "product_added"
  | "product_sold"
  | "seller_joined"
  | "review"
  | "forum_topic"
  | "announcement"
  | "flash_sale"
  | "user_joined"
  | "listing_updated";

export async function recordActivity(input: {
  type: ActivityType;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Record<string, unknown> | null;
  userId?: string | null;
}) {
  try {
    await prisma.activityEvent.create({
      data: {
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : null,
        userId: input.userId ?? null,
      },
    });
  } catch {
    // Activity is best-effort — never break checkout/sync.
  }
}

export async function getRecentActivity(limit = 24) {
  try {
    return await prisma.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
    });
  } catch {
    return [];
  }
}
