"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUser() {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function markNotificationRead(id: string) {
  const userId = await requireUser();
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  revalidatePath("/account/notifications");
  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  const userId = await requireUser();
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  revalidatePath("/account/notifications");
  revalidatePath("/");
}

export async function toggleWishlist(productId: string): Promise<{ ok: boolean; added?: boolean; error?: string }> {
  const userId = await requireUser();
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/account/wishlist");
    return { ok: true, added: false };
  }
  await prisma.wishlistItem.create({ data: { userId, productId } });
  revalidatePath("/account/wishlist");
  return { ok: true, added: true };
}

export async function submitReview(input: {
  productId: string;
  rating: number;
  comment?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUser();
  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) return { ok: false, error: "Rating must be 1–5." };

  const purchased = await prisma.orderItem.findFirst({
    where: {
      productId: input.productId,
      order: { userId, status: "completed" },
    },
  });
  if (!purchased) return { ok: false, error: "Only verified buyers can leave a review." };

  await prisma.review.upsert({
    where: { userId_productId: { userId, productId: input.productId } },
    create: {
      userId,
      productId: input.productId,
      rating,
      comment: input.comment?.trim() || null,
      verified: true,
      status: "published",
    },
    update: {
      rating,
      comment: input.comment?.trim() || null,
      verified: true,
      status: "published",
    },
  });
  revalidatePath(`/product`);
  return { ok: true };
}

export async function markReviewHelpful(reviewId: string) {
  await requireUser();
  await prisma.review.update({ where: { id: reviewId }, data: { helpful: { increment: 1 } } });
  revalidatePath("/product");
}
