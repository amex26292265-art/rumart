import crypto from "crypto";
import { env, isPaymentsConfigured } from "@/lib/env";

/**
 * NOWPayments crypto payment gateway.
 *
 * Flow: we create a hosted invoice (customer picks the coin — USDT TRC20/BEP20,
 * BTC, ETH, LTC, …), the customer pays, and NOWPayments POSTs an IPN callback
 * to our webhook. We verify the IPN's HMAC-SHA512 signature, then credit the
 * wallet / deliver the order exactly once.
 *
 * Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
 */
const API_BASE = "https://api.nowpayments.io/v1";

/** Recursively sort object keys — NOWPayments signs the sorted-key JSON. */
function sortObject(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObject);
  if (obj && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

export interface CreateInvoiceInput {
  amount: number;
  currency: string; // price currency, e.g. "usd"
  orderId: string; // our Deposit id
  description: string;
  callbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}

export interface NowInvoice {
  id: string; // invoice id
  invoiceUrl: string; // hosted checkout URL
}

/** Raw IPN payload fields we care about (NOWPayments sends more). */
export interface NowIpnPayload {
  payment_id?: number | string;
  invoice_id?: number | string;
  payment_status?: string; // waiting|confirming|confirmed|sending|partially_paid|finished|failed|refunded|expired
  order_id?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  actually_paid?: number;
  pay_currency?: string;
  pay_address?: string;
  outcome_amount?: number;
  payin_hash?: string;
  [k: string]: unknown;
}

export class NowPaymentsService {
  isConfigured(): boolean {
    return isPaymentsConfigured;
  }

  private headers(): Record<string, string> {
    return { "x-api-key": env.NOWPAYMENTS_API_KEY, "Content-Type": "application/json" };
  }

  /** Liveness check for the admin panel. */
  async status(): Promise<{ message?: string }> {
    const res = await fetch(`${API_BASE}/status`, { cache: "no-store" });
    return (await res.json().catch(() => ({}))) as { message?: string };
  }

  /** Create a hosted invoice and return its checkout URL. */
  async createInvoice(input: CreateInvoiceInput): Promise<NowInvoice> {
    if (!this.isConfigured()) throw new Error("NOWPayments is not configured");
    const res = await fetch(`${API_BASE}/invoice`, {
      method: "POST",
      headers: this.headers(),
      cache: "no-store",
      body: JSON.stringify({
        price_amount: Number(input.amount.toFixed(2)),
        price_currency: input.currency.toLowerCase(),
        order_id: input.orderId,
        order_description: input.description,
        ipn_callback_url: input.callbackUrl,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string | number;
      invoice_url?: string;
      message?: string;
      status?: string;
    };
    if (!res.ok || !json.invoice_url || json.id == null) {
      throw new Error(json.message ?? `NOWPayments error (${res.status})`);
    }
    return { id: String(json.id), invoiceUrl: json.invoice_url };
  }

  /** Look up a payment's current status (used for polling / reconciliation). */
  async getPayment(paymentId: string): Promise<NowIpnPayload | null> {
    if (!this.isConfigured()) return null;
    const res = await fetch(`${API_BASE}/payment/${encodeURIComponent(paymentId)}`, {
      headers: this.headers(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as NowIpnPayload | null;
  }

  /**
   * Verify an IPN callback signature. NOWPayments computes
   * HMAC-SHA512(sorted-key JSON body, IPN_SECRET) and sends it in the
   * `x-nowpayments-sig` header. Returns false on any mismatch.
   */
  verifyIpn(rawBody: string, signature: string | null): boolean {
    if (!signature || !env.NOWPAYMENTS_IPN_SECRET) return false;
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return false;
    }
    const sorted = JSON.stringify(sortObject(parsed));
    const expected = crypto.createHmac("sha512", env.NOWPAYMENTS_IPN_SECRET).update(sorted).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

export const nowPayments = new NowPaymentsService();

/** Map NOWPayments statuses onto our internal handling. */
export function classifyStatus(status: string): "paid" | "partial" | "pending" | "failed" {
  switch (status) {
    case "finished":
      return "paid";
    case "partially_paid":
      return "partial";
    case "failed":
    case "refunded":
    case "expired":
      return "failed";
    default: // waiting | confirming | confirmed | sending
      return "pending";
  }
}
