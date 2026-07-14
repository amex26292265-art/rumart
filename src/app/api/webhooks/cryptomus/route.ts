import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cryptomus } from "@/lib/payments/cryptomus";

/**
 * Cryptomus payment webhook. Cryptomus confirms the payment on-chain and POSTs
 * here. We verify the signature, then credit the wallet exactly once.
 *
 * Statuses treated as successful: "paid", "paid_over".
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!cryptomus.verifyWebhook(payload)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 403 });
  }

  const depositId = String(payload.order_id ?? "");
  const status = String(payload.status ?? "");
  if (!depositId) return NextResponse.json({ error: "No order_id" }, { status: 400 });

  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
  if (!deposit) return NextResponse.json({ error: "Unknown deposit" }, { status: 404 });

  const paid = status === "paid" || status === "paid_over";

  // Credit the wallet exactly once, atomically.
  if (paid && !deposit.credited) {
    await prisma.$transaction([
      prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: "paid", credited: true },
      }),
      prisma.user.update({
        where: { id: deposit.userId },
        data: { walletBalance: { increment: deposit.amount } },
      }),
    ]);
  } else if (!paid && deposit.status === "pending") {
    await prisma.deposit.update({ where: { id: deposit.id }, data: { status } });
  }

  return NextResponse.json({ ok: true });
}
