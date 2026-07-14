"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { cryptomus } from "@/lib/payments/cryptomus";

export type DepositResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Start a crypto wallet top-up: create a pending Deposit and a Cryptomus
 * invoice, returning the hosted checkout URL for the browser to open.
 */
export async function createDeposit(amount: number): Promise<DepositResult> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Please sign in first." };

  if (!cryptomus.isConfigured()) {
    return { ok: false, error: "Crypto payments aren’t enabled yet. Please try again later." };
  }
  const value = Math.round(amount * 100) / 100;
  if (!Number.isFinite(value) || value < 1) return { ok: false, error: "Minimum top-up is $1." };
  if (value > 10000) return { ok: false, error: "Maximum top-up is $10,000." };

  const deposit = await prisma.deposit.create({
    data: { userId, amount: value, currency: env.SITE_CURRENCY, status: "pending" },
  });

  try {
    const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    const invoice = await cryptomus.createInvoice({
      amount: value,
      currency: env.SITE_CURRENCY,
      orderId: deposit.id,
      callbackUrl: `${base}/api/webhooks/cryptomus`,
      returnUrl: `${base}/wallet`,
      successUrl: `${base}/wallet?paid=1`,
    });
    await prisma.deposit.update({ where: { id: deposit.id }, data: { providerId: invoice.uuid } });
    return { ok: true, url: invoice.url };
  } catch (err) {
    await prisma.deposit.update({ where: { id: deposit.id }, data: { status: "failed" } });
    return { ok: false, error: err instanceof Error ? err.message : "Could not start payment." };
  }
}
