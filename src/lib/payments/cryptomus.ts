import crypto from "crypto";
import { env, isPaymentsConfigured } from "@/lib/env";

/**
 * Cryptomus payment gateway client. Cryptomus watches the blockchain and
 * confirms payments for us, then calls our webhook — so Rumart never has to do
 * raw on-chain verification itself.
 *
 * Signature scheme: sign = md5( base64(json_body) + PAYMENT_KEY ).
 * Docs: https://doc.cryptomus.com/
 */
const API_BASE = "https://api.cryptomus.com/v1";

function sign(bodyJson: string): string {
  return crypto
    .createHash("md5")
    .update(Buffer.from(bodyJson).toString("base64") + env.CRYPTOMUS_PAYMENT_KEY)
    .digest("hex");
}

export interface CreateInvoiceInput {
  amount: number;
  currency: string;
  orderId: string; // our Deposit id
  callbackUrl: string;
  returnUrl: string;
  successUrl: string;
}

export interface CryptomusInvoice {
  uuid: string;
  url: string;
}

export class CryptomusService {
  isConfigured(): boolean {
    return isPaymentsConfigured;
  }

  /** Create a hosted crypto checkout and return its payment URL. */
  async createInvoice(input: CreateInvoiceInput): Promise<CryptomusInvoice> {
    if (!this.isConfigured()) throw new Error("Cryptomus is not configured");
    const body = JSON.stringify({
      amount: input.amount.toFixed(2),
      currency: input.currency,
      order_id: input.orderId,
      url_callback: input.callbackUrl,
      url_return: input.returnUrl,
      url_success: input.successUrl,
      lifetime: 3600,
    });

    const res = await fetch(`${API_BASE}/payment`, {
      method: "POST",
      headers: {
        merchant: env.CRYPTOMUS_MERCHANT_ID,
        sign: sign(body),
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });

    const json = (await res.json()) as {
      state?: number;
      result?: { uuid: string; url: string };
      message?: string;
    };
    if (!res.ok || json.state !== 0 || !json.result) {
      throw new Error(json.message ?? `Cryptomus error (${res.status})`);
    }
    return { uuid: json.result.uuid, url: json.result.url };
  }

  /**
   * Verify a webhook payload's signature. Cryptomus signs the JSON body (with
   * the `sign` field removed) using the same md5(base64(json)+key) scheme.
   */
  verifyWebhook(payload: Record<string, unknown>): boolean {
    if (!this.isConfigured()) return false;
    const provided = String(payload.sign ?? "");
    if (!provided) return false;
    const clone: Record<string, unknown> = { ...payload };
    delete clone.sign;
    const expected = sign(JSON.stringify(clone));
    // Constant-time compare.
    return (
      provided.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    );
  }
}

export const cryptomus = new CryptomusService();
