import { NextResponse } from "next/server";
import { env, isPaymentsConfigured } from "@/lib/env";
import { nowPayments } from "@/lib/payments/nowpayments";

// TEMPORARY diagnostic — guarded by the (already public) NOWPayments public key.
// Reports config presence and the raw invoice-creation result WITHOUT exposing
// secret values. Delete after debugging.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("k") !== env.NOWPAYMENTS_PUBLIC_KEY || !env.NOWPAYMENTS_PUBLIC_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const info: Record<string, unknown> = {
    isPaymentsConfigured,
    apiKeyLen: env.NOWPAYMENTS_API_KEY.length,
    apiKeyTrimmedLen: env.NOWPAYMENTS_API_KEY.trim().length,
    ipnSecretLen: env.NOWPAYMENTS_IPN_SECRET.length,
    publicKeyLen: env.NOWPAYMENTS_PUBLIC_KEY.length,
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
  };

  try {
    const invoice = await nowPayments.createInvoice({
      amount: 10,
      currency: env.SITE_CURRENCY,
      orderId: `debug-${Date.now()}`,
      description: "debug",
      callbackUrl: `${env.NEXT_PUBLIC_SITE_URL}/api/webhooks/nowpayments`,
      successUrl: `${env.NEXT_PUBLIC_SITE_URL}/wallet?paid=1`,
      cancelUrl: `${env.NEXT_PUBLIC_SITE_URL}/wallet`,
    });
    info.invoiceOk = true;
    info.invoiceUrl = invoice.invoiceUrl;
  } catch (err) {
    info.invoiceOk = false;
    info.invoiceError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(info);
}
