import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowPayments, classifyStatus, type NowIpnPayload } from "@/lib/payments/nowpayments";
import { purchaseProduct } from "@/lib/orders/purchase";

/**
 * NOWPayments IPN (Instant Payment Notification) webhook.
 *
 * Security:
 *  - every callback's HMAC-SHA512 signature is verified against the raw body;
 *    invalid signatures are rejected (403)
 *  - the wallet is credited at most once per deposit (the `credited` flag),
 *    so duplicate/replayed IPNs are harmless
 *  - all payment fields (id, status, amounts, address, tx hash) are stored
 *
 * Statuses: finished → credit; partially_paid → flagged, not credited;
 * failed/refunded/expired → marked failed; the rest stay pending.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-nowpayments-sig");

  if (!nowPayments.verifyIpn(raw, signature)) {
    console.warn("[nowpayments] rejected IPN with bad/missing signature");
    return NextResponse.json({ error: "Bad signature" }, { status: 403 });
  }

  let payload: NowIpnPayload;
  try {
    payload = JSON.parse(raw) as NowIpnPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const depositId = String(payload.order_id ?? "");
  const status = String(payload.payment_status ?? "");
  if (!depositId || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
  if (!deposit) return NextResponse.json({ error: "Unknown deposit" }, { status: 404 });

  const kind = classifyStatus(status);
  const num = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };

  // Always record the latest payment detail (idempotent).
  const detail = {
    paymentId: payload.payment_id != null ? String(payload.payment_id) : deposit.paymentId,
    payStatus: status,
    payCurrency: typeof payload.pay_currency === "string" ? payload.pay_currency : deposit.payCurrency,
    payAmount: num(payload.pay_amount) ?? deposit.payAmount,
    actuallyPaid: num(payload.actually_paid) ?? deposit.actuallyPaid,
    payAddress: typeof payload.pay_address === "string" ? payload.pay_address : deposit.payAddress,
    txHash: typeof payload.payin_hash === "string" ? payload.payin_hash : deposit.txHash,
  };

  if (kind === "paid" && !deposit.credited) {
    // Credit the wallet exactly once, atomically.
    await prisma.$transaction([
      prisma.deposit.update({
        where: { id: deposit.id },
        data: { ...detail, status: "paid", credited: true },
      }),
      prisma.user.update({
        where: { id: deposit.userId },
        data: { walletBalance: { increment: deposit.amount } },
      }),
    ]);

    // Seamless buy → pay → deliver: if this payment was for a specific product,
    // purchase & deliver it now (funded by the wallet we just credited).
    if (deposit.productId) {
      try {
        await purchaseProduct(deposit.userId, deposit.productId);
      } catch (err) {
        console.error(`[nowpayments] auto-deliver failed for deposit ${deposit.id}:`, err);
      }
    } else {
      await prisma.notification
        .create({
          data: {
            userId: deposit.userId,
            title: `Wallet topped up +$${deposit.amount.toFixed(2)}`,
            body: "Your payment is confirmed and your balance has been updated.",
          },
        })
        .catch(() => undefined);
    }
  } else if (kind === "partial") {
    await prisma.deposit.update({ where: { id: deposit.id }, data: { ...detail, status: "partial" } });
    await prisma.notification
      .create({
        data: {
          userId: deposit.userId,
          title: `Payment underpaid`,
          body: `We received a partial payment for order ${deposit.id}. Contact support to resolve it.`,
        },
      })
      .catch(() => undefined);
  } else if (kind === "failed") {
    if (deposit.status !== "paid") {
      await prisma.deposit.update({ where: { id: deposit.id }, data: { ...detail, status: "failed" } });
    }
  } else {
    // pending / confirming — just record progress.
    if (!deposit.credited) {
      await prisma.deposit.update({ where: { id: deposit.id }, data: detail });
    }
  }

  return NextResponse.json({ ok: true });
}
