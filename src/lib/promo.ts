import { prisma } from "@/lib/prisma";

export interface PromoResult {
  ok: true;
  codeId: string;
  code: string;
  discount: number; // amount off, in site currency
  finalPrice: number; // subtotal - discount, never below 0
}
export interface PromoError {
  ok: false;
  error: string;
}

/**
 * Validate a promo code for a given subtotal + user. Pure read + checks; the
 * caller records the redemption inside the purchase transaction so usage limits
 * can't be raced. Codes are matched case-insensitively.
 */
export async function validatePromo(
  rawCode: string,
  userId: string,
  subtotal: number,
): Promise<PromoResult | PromoError> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) return { ok: false, error: "This code isn’t valid." };
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return { ok: false, error: "This code has expired." };
  if (promo.maxUses != null && promo.uses >= promo.maxUses) return { ok: false, error: "This code has been fully redeemed." };
  if (promo.minOrder != null && subtotal < promo.minOrder) {
    return { ok: false, error: `Minimum order for this code is $${promo.minOrder.toFixed(2)}.` };
  }

  const usedByUser = await prisma.promoRedemption.count({ where: { codeId: promo.id, userId } });
  if (usedByUser >= promo.perUser) return { ok: false, error: "You’ve already used this code." };

  let discount = promo.type === "flat" ? promo.value : (subtotal * promo.value) / 100;
  if (promo.maxDiscount != null) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.min(discount, subtotal); // never below $0
  discount = Math.round(discount * 100) / 100;

  return {
    ok: true,
    codeId: promo.id,
    code,
    discount,
    finalPrice: Math.round((subtotal - discount) * 100) / 100,
  };
}
