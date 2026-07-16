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

  // Paid order awaiting manual delivery: keep the customer's payment, notify
  // them (with the Telegram contact) and alert every admin.
  const createPending = async (reason: string): Promise<string> => {
    const reference = orderReference();
    // Always log the real reason server-side (visible in `wrangler tail`).
    console.error(`[orders] ${reference} pending manual fulfillment: ${reason}`);
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
    try {
      const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
      // Customer-facing notification (only if the buyer is not themselves an admin).
      const data = [] as { userId: string; title: string; body: string }[];
      const buyerIsAdmin = admins.some((a) => a.id === userId);
      if (!buyerIsAdmin) {
        data.push({
          userId,
          title: `Order ${reference} — pending manual delivery`,
          body: "Your payment is confirmed. Contact us on Telegram with your order reference and we’ll deliver it right away.",
        });
      }
      // Admin reason — sent to EVERY admin (including the buyer if they are one,
      // so a solo admin-run store still sees exactly why it pended).
      for (const a of admins) {
        data.push({
          userId: a.id,
          title: `⚠ Manual fulfillment needed: ${reference}`,
          body: `${product.title} — ${reason}. Deliver manually and mark the order completed.`,
        });
      }
      await prisma.notification.createMany({ data });
    } catch (err) {
      console.error(`[orders] failed to create notifications for ${reference}:`, err);
    }
    return reference;
  };

  const supplier = getSupplier(product.supplier.slug);

  // Can't attempt automated delivery → keep funds reserved as a paid pending
  // order and route to Telegram for manual delivery.
  if (!supplier || !supplier.isConfigured() || !product.supplierItemId) {
    const reference = await createPending("supplier not configured for automated delivery");
    return {
      ok: false,
      reference,
      contact: true,
      error: "Payment received. Automated delivery is finalizing — contact us on Telegram with your reference to receive it.",
    };
  }

  // Never fire a supplier purchase we can't afford: if our supplier wallet is
  // short, keep the customer's paid order as pending-manual instead.
  const supplierBalance = await supplier.getBalance?.().catch(() => null);
  if (supplierBalance != null && supplierBalance < product.cost) {
    const reference = await createPending(
      `insufficient LZT balance ($${supplierBalance.toFixed(2)} < $${product.cost.toFixed(2)}) — top up LZT wallet`,
    );
    return {
      ok: false,
      reference,
      contact: true,
      error: "Payment received. We’ll deliver your account shortly — contact us on Telegram with your reference for instant manual delivery.",
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
    // Store ONLY the sanitized fields (JSON), encrypted. Never the raw response.
    credentials = JSON.stringify(result.fields);
  } catch (err) {
    // Auto-payment couldn't complete (our supplier balance, upstream error…).
    // Keep the customer's payment (order stays paid/pending) and route to Telegram.
    const reference = await createPending(
      `supplier purchase failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
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
