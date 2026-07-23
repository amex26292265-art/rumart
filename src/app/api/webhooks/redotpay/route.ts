import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redotPay, classifyRedotStatus, type RedotWebhookPayload } from "@/lib/payments/redotpay";
import { purchaseProduct } from "@/lib/orders/purchase";

/**
 * RedotPay Connect payment webhook.
 * Credits wallet once per deposit when status is paid/success.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  if (!redotPay.verifyWebhook(raw, request.headers)) {
    console.warn("[redotpay] rejected webhook with bad/missing signature");
    return NextResponse.json({ error: "Bad signature" }, { status: 403 });
  }

  let payload: RedotWebhookPayload;
  try {
    payload = JSON.parse(raw) as RedotWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Some payloads nest data
  const data = (payload.data && typeof payload.data === "object"
    ? (payload.data as RedotWebhookPayload)
    : payload) as RedotWebhookPayload;

  const depositId = String(data.outerOrderSn ?? data.outerOrder ?? payload.outerOrderSn ?? "");
  const status = String(data.status ?? data.orderStatus ?? data.paymentStatus ?? "");
  if (!depositId) return NextResponse.json({ error: "Missing outerOrderSn" }, { status: 400 });

  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
  if (!deposit) return NextResponse.json({ error: "Unknown deposit" }, { status: 404 });

  const kind = classifyRedotStatus(status || "PENDING");
  const num = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };

  const detail = {
    paymentId: data.orderSn != null ? String(data.orderSn) : deposit.paymentId,
    payStatus: status || deposit.payStatus,
    payCurrency: typeof data.cryptoCurrency === "string" ? data.cryptoCurrency : deposit.payCurrency,
    payAmount: num(data.cryptoAmount) ?? deposit.payAmount,
    actuallyPaid: num(data.orderAmount ?? data.amount) ?? deposit.actuallyPaid,
    txHash: typeof data.txHash === "string" ? data.txHash : deposit.txHash,
  };

  if (kind === "paid" && !deposit.credited) {
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

    if (deposit.productId) {
      try {
        await purchaseProduct(deposit.userId, deposit.productId);
      } catch (err) {
        console.error(`[redotpay] auto-deliver failed for deposit ${deposit.id}:`, err);
      }
    } else {
      await prisma.notification
        .create({
          data: {
            userId: deposit.userId,
            title: `Wallet topped up +$${deposit.amount.toFixed(2)}`,
            body: "Your RedotPay payment is confirmed and your balance has been updated.",
          },
        })
        .catch(() => undefined);
    }
  } else if (kind === "partial") {
    await prisma.deposit.update({ where: { id: deposit.id }, data: { ...detail, status: "partial" } });
  } else if (kind === "failed") {
    if (deposit.status !== "paid") {
      await prisma.deposit.update({ where: { id: deposit.id }, data: { ...detail, status: "failed" } });
    }
  } else if (!deposit.credited) {
    await prisma.deposit.update({ where: { id: deposit.id }, data: detail });
  }

  return NextResponse.json({ code: "SUCCESS", ok: true });
}
