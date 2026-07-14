"use server";

import { auth } from "@/auth";
import { purchaseProduct, type PurchaseOutcome } from "@/lib/orders/purchase";

/** Server action bridging the buy button to the automated purchase pipeline. */
export async function checkoutAction(productId: string): Promise<PurchaseOutcome> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Please sign in to complete your purchase." };
  return purchaseProduct(userId, productId);
}
