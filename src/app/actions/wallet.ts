"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { nowPayments } from "@/lib/payments/nowpayments";

export type DepositResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Start a crypto payment via NOWPayments: create a pending Deposit and a hosted
 * invoice, returning the checkout URL for the browser to open. Optionally links
 * the deposit to a product so it is delivered automatically once the payment
 * confirms (seamless buy → pay → deliver).
 */
export async function createDeposit(amount: number, productId?: string): Promise<DepositResult> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Please sign in first." };

  const { rateLimit } = await import("@/lib/rate-limit");
  const limited = rateLimit(`deposit:${userId}`, 8, 60_000);
  if (!limited.ok) return { ok: false, error: `Too many deposit attempts. Retry in ${limited.retryAfterSec}s.` };

  if (!nowPayments.isConfigured()) {
    return { ok: false, error: "Crypto payments aren’t enabled yet. Please try again later." };
  }
  const value = Math.round(amount * 100) / 100;
  if (!Number.isFinite(value) || value < 1) return { ok: false, error: "Minimum top-up is $1." };
  if (value > 10000) return { ok: false, error: "Maximum top-up is $10,000." };

  // Only accept a real, active product link.
  let linkedProductId: string | null = null;
  if (productId) {
    const product = await prisma.product.findFirst({ where: { id: productId, status: "active" }, select: { id: true } });
    linkedProductId = product?.id ?? null;
  }

  const deposit = await prisma.deposit.create({
    data: {
      userId,
      amount: value,
      currency: env.SITE_CURRENCY,
      provider: "nowpayments",
      status: "pending",
      productId: linkedProductId,
    },
  });

  try {
    const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    const invoice = await nowPayments.createInvoice({
      amount: value,
      currency: env.SITE_CURRENCY,
      orderId: deposit.id,
      description: linkedProductId ? `Rumart order` : `Rumart wallet top-up`,
      callbackUrl: `${base}/api/webhooks/nowpayments`,
      successUrl: `${base}/wallet?paid=1`,
      cancelUrl: `${base}/wallet`,
    });
    await prisma.deposit.update({ where: { id: deposit.id }, data: { providerId: invoice.id } });
    return { ok: true, url: invoice.invoiceUrl };
  } catch (err) {
    await prisma.deposit.update({ where: { id: deposit.id }, data: { status: "failed" } });
    const raw = err instanceof Error ? err.message : "Could not start payment.";
    const friendly = /api key|unauthor|forbidden|invalid/i.test(raw)
      ? "Payment gateway configuration issue — our team has been notified. Please try again later."
      : raw;
    console.error(`[nowpayments] deposit ${deposit.id} failed: ${raw}`);
    return { ok: false, error: friendly };
  }
}
