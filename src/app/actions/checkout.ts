"use server";

import { auth } from "@/auth";
import { purchaseProduct, type PurchaseOutcome } from "@/lib/orders/purchase";
import { validatePromo } from "@/lib/promo";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

/** Server action bridging the buy button to the automated purchase pipeline. */
export async function checkoutAction(productId: string, promoCode?: string): Promise<PurchaseOutcome> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Please sign in to complete your purchase." };
  const limited = rateLimit(`checkout:${userId}`, 10, 60_000);
  if (!limited.ok) return { ok: false, error: `Too many checkout attempts. Retry in ${limited.retryAfterSec}s.` };
  return purchaseProduct(userId, productId, promoCode);
}

export type PromoPreview =
  | { ok: true; discount: number; finalPrice: number; code: string }
  | { ok: false; error: string };

/** Validate a promo code against a product for live price preview in the UI. */
export async function previewPromo(productId: string, code: string): Promise<PromoPreview> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Please sign in first." };
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { price: true, status: true },
  });
  if (!product || product.status !== "active") return { ok: false, error: "Item unavailable." };
  const res = await validatePromo(code, userId, product.price);
  if (!res.ok) return res;
  return { ok: true, discount: res.discount, finalPrice: res.finalPrice, code: res.code };
}
