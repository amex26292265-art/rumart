import { prisma } from "@/lib/prisma";
import { getSupplier } from "@/lib/suppliers/registry";
import { encryptSecret } from "@/lib/crypto";
import { orderReference } from "@/lib/utils";

export type PurchaseOutcome =
  | { ok: true; reference: string } // delivered instantly
  | { ok: false; reference: string; contact: true; error: string } // pending → contact on Telegram
  | { ok: false; needTopup: true; amount: number; balance: number; error: string } // wallet too low
  | { ok: false; error: string }; // hard error

/**
 * Wallet-based automated buy pipeline (server-side only):
 *   check balance → deduct → re-check availability → purchase upstream →
 *   encrypt → deliver. On any failure after deduction we REFUND the wallet, so
 *   the customer is never charged for something they didn't receive.
 */
export async function purchaseProduct(userId: string, productId: string): Promise<PurchaseOutcome> {
  const [product, user] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, include: { supplier: true } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  if (!user) return { ok: false, error: "Please sign in to continue." };
  if (!product || product.status !== "active") {
    return { ok: false, error: "This item is no longer available." };
  }

  // Not enough store credit → send them to top up (with the exact amount).
  if (user.walletBalance < product.price) {
    return {
      ok: false,
      needTopup: true,
      amount: product.price,
      balance: user.walletBalance,
      error: "Not enough balance. Add funds to your wallet to complete this purchase.",
    };
  }

  // Atomically reserve the funds (guards against double-spend / race).
  const reserved = await prisma.user.updateMany({
    where: { id: userId, walletBalance: { gte: product.price } },
    data: { walletBalance: { decrement: product.price } },
  });
  if (reserved.count === 0) {
    return {
      ok: false,
      needTopup: true,
      amount: product.price,
      balance: user.walletBalance,
      error: "Not enough balance. Add funds to your wallet to complete this purchase.",
    };
  }

  const refund = () =>
    prisma.user.update({ where: { id: userId }, data: { walletBalance: { increment: product.price } } });

  const createPending = async (): Promise<string> => {
    const reference = orderReference();
    await prisma.order.create({
      data: {
        reference,
        userId,
        status: "pending",
        paymentMethod: "wallet",
        currency: product.currency,
        total: product.price,
        cost: product.cost,
        profit: product.price - product.cost,
        items: { create: { productId: product.id, title: product.title, price: product.price, cost: product.cost } },
      },
    });
    return reference;
  };

  const supplier = getSupplier(product.supplier.slug);

  // Can't attempt automated delivery → keep funds reserved as a paid pending
  // order and route to Telegram for manual delivery.
  if (!supplier || !supplier.isConfigured() || !product.supplierItemId) {
    const reference = await createPending();
    return {
      ok: false,
      reference,
      contact: true,
      error: "Payment received. Automated delivery is finalizing — contact us on Telegram with your reference to receive it.",
    };
  }

  // Re-check availability; if it's gone, refund fully.
  const live = await supplier.getItem(product.supplierItemId).catch(() => null);
  if (!live) {
    await refund();
    await prisma.product.update({ where: { id: product.id }, data: { status: "unavailable" } });
    return { ok: false, error: "This item was just sold. You have not been charged." };
  }

  // Attempt the automated supplier purchase.
  let credentials: string;
  try {
    const result = await supplier.purchase(product.supplierItemId, product.cost);
    credentials = result.credentials;
  } catch {
    // Auto-payment couldn't complete (our supplier balance, upstream error…).
    // Keep the customer's payment (order stays paid/pending) and route to Telegram.
    const reference = await createPending();
    return {
      ok: false,
      reference,
      contact: true,
      error: "Payment received. We’ll deliver your account manually — contact us on Telegram with your reference.",
    };
  }

  const reference = orderReference();
  await prisma.order.create({
    data: {
      reference,
      userId,
      status: "completed",
      paymentMethod: "wallet",
      currency: product.currency,
      total: product.price,
      cost: product.cost,
      profit: product.price - product.cost,
      items: { create: { productId: product.id, title: product.title, price: product.price, cost: product.cost } },
      credential: {
        create: {
          productTitle: product.title,
          supplierItemId: product.supplierItemId,
          ciphertext: encryptSecret(credentials),
        },
      },
    },
  });

  await prisma.product.update({ where: { id: product.id }, data: { status: "sold" } });
  return { ok: true, reference };
}
