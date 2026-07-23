import crypto from "crypto";
import { env, isRedotPayConfigured } from "@/lib/env";

/**
 * RedotPay Connect — stablecoin / crypto checkout (Paylink flow).
 *
 * Docs: https://redotpay.readme.io
 * Create order → redirect to webUrl/h5Url → webhook credits wallet.
 *
 * Production requires SHA256withRSA request signing. Sandbox skips signature
 * verification on their side; we still sign when a private key is present.
 */

const PROD_BASE = "https://acquirer.redotpay.com";
const SANDBOX_BASE = "https://acquirersandbox.rp-2023app.com";

const PROD_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzMn4r06M/cp2amkbCxIs
PSr030JoCFeymwjTZrBnI8kW4mtL6JtUPYpJTFgCB8ZQoV75lEmUw8gSLbN770Cc
5EOi1dF4ekmLQ7Ez0SFUbQgJa7Vg5wBdSKcbUmkKGviJt+iZRJ0tZsPpXMPqIo9Y
OWJagfPbDhEwT2t1ANP4ou98sCqLqELI80iYm8+W4B9IvBW4lc+H5BAPtXpYMtlZ
6stCnvHXd1EjvlTak25v5xJ8AInEeAy8/D2glunmz/VfPyoB5OHPgnYVU66HyeQc
O1ZY/jzB5d6I/zX4JENG1xrP8ThPZ9qMWtmputJ0XYKymiZgZP6vh0L+G6P/Z98v
lQIDAQAB
-----END PUBLIC KEY-----`;

const SANDBOX_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuctrVK3eP8hpoJf7FMet
lcR77FYcj9HtrkySyGDRt5HHwdwgM8jK0kfE4ag/zI8goe8M0iJ2o7n3VCfTzn8O
yfU0bu6KzDti1WOJV9fv4XtSmhm9W4WKjIc8uDQViR7E8trzcrbKFVbKVGng1+z0
KobQBDtWhjUeXKktUq1lpiejTS+XjXej26ANPfwbqbY+/6kBB3sWbt9BLDI/WhPY
XnFV9oJWod9I/dYUgUUA/b/+bI1wlobNntBDxiNmX0kbqpGZbzO6l9wWFXZiFCD2
5QtBOZlMbn9noH4KW3DnKGc2nKNz/f2FEM9DJKn3P7NGFVy6O/Q5NzcbFs+DI6nT
ywIDAQAB
-----END PUBLIC KEY-----`;

export interface RedotCreateOrderInput {
  amount: number;
  currency: string;
  outerOrderSn: string; // our Deposit id
  description: string;
  redirectUrl: string;
  notifyUrl?: string;
  outerUid?: string;
}

export interface RedotOrder {
  orderSn: string;
  checkoutUrl: string;
}

export interface RedotWebhookPayload {
  outerOrderSn?: string;
  outerOrder?: string;
  orderSn?: string;
  status?: string;
  orderStatus?: string;
  paymentStatus?: string;
  orderAmount?: string | number;
  amount?: string | number;
  cryptoCurrency?: string;
  cryptoAmount?: string | number;
  txHash?: string;
  [k: string]: unknown;
}

function normalizePem(raw: string): string {
  const trimmed = raw.trim().replace(/\\n/g, "\n");
  if (trimmed.includes("BEGIN")) return trimmed;
  // bare base64 → wrap as PKCS8 private key
  const body = trimmed.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

function signRequest(method: string, uri: string, appKey: string, timestamp: string, body: string): string | null {
  const pem = env.REDOTPAY_PRIVATE_KEY;
  if (!pem) return null;
  try {
    const stringToSign = `${method} ${uri}\n${appKey}.${timestamp}.${body}`;
    const key = crypto.createPrivateKey(normalizePem(pem));
    const sig = crypto.sign("RSA-SHA256", Buffer.from(stringToSign), key);
    return encodeURIComponent(sig.toString("base64"));
  } catch (err) {
    console.error("[redotpay] sign failed:", err);
    return null;
  }
}

export class RedotPayService {
  isConfigured(): boolean {
    return isRedotPayConfigured;
  }

  private base(): string {
    return env.REDOTPAY_ENV === "production" ? PROD_BASE : SANDBOX_BASE;
  }

  private platformPublicKey(): string {
    return env.REDOTPAY_ENV === "production" ? PROD_PUBLIC_KEY : SANDBOX_PUBLIC_KEY;
  }

  async createOrder(input: RedotCreateOrderInput): Promise<RedotOrder> {
    if (!this.isConfigured()) throw new Error("RedotPay is not configured");

    const uri = "/openapi/v2/order/create";
    const bodyObj = {
      outerOrderSn: input.outerOrderSn,
      outerUid: input.outerUid ?? input.outerOrderSn,
      orderAmount: Number(input.amount.toFixed(2)).toString(),
      orderCurrency: input.currency.toUpperCase(),
      orderDesc: input.description,
      goods: [{ name: input.description, quantity: 1, price: Number(input.amount.toFixed(2)).toString() }],
      env: "WEB",
      redirectUrl: input.redirectUrl,
      ...(input.notifyUrl ? { notifyUrl: input.notifyUrl } : {}),
    };
    const body = JSON.stringify(bodyObj);
    const timestamp = String(Date.now());
    const signature = signRequest("POST", uri, env.REDOTPAY_APP_KEY, timestamp, body);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-R-AK": env.REDOTPAY_APP_KEY,
      "X-Merchant-Ak": env.REDOTPAY_APP_KEY,
      "X-R-TS": timestamp,
      "X-R-KEY-VERSION": env.REDOTPAY_KEY_VERSION,
      "X-R-Key-Version": env.REDOTPAY_KEY_VERSION,
    };
    if (signature) headers["X-R-Signature"] = signature;

    const res = await fetch(`${this.base()}${uri}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      code?: string;
      msg?: string;
      message?: string;
      data?: {
        orderSn?: string;
        webUrl?: string;
        h5Url?: string;
        appUrl?: string;
      };
    };

    const checkoutUrl = json.data?.webUrl || json.data?.h5Url || json.data?.appUrl;
    if (!res.ok || !checkoutUrl || !json.data?.orderSn) {
      throw new Error(json.msg || json.message || `RedotPay error (${res.status})`);
    }
    return { orderSn: json.data.orderSn, checkoutUrl };
  }

  /**
   * Verify webhook signature: string = `{appKey}.{timestamp}.{body}`
   * signed by RedotPay platform key (SHA256withRSA).
   */
  verifyWebhook(rawBody: string, headers: Headers): boolean {
    // Sandbox: signature optional for easier integration testing
    const sigHeader = headers.get("x-r-signature") || headers.get("X-R-Signature");
    const ts = headers.get("x-r-ts") || headers.get("X-R-Ts");
    if (!sigHeader || !ts) {
      return env.REDOTPAY_ENV !== "production";
    }
    try {
      const decoded = decodeURIComponent(sigHeader);
      const stringToVerify = `${env.REDOTPAY_APP_KEY}.${ts}.${rawBody}`;
      const key = crypto.createPublicKey(this.platformPublicKey());
      return crypto.verify("RSA-SHA256", Buffer.from(stringToVerify), key, Buffer.from(decoded, "base64"));
    } catch (err) {
      console.error("[redotpay] webhook verify failed:", err);
      return false;
    }
  }
}

export const redotPay = new RedotPayService();

/** Map RedotPay status strings onto our deposit handling. */
export function classifyRedotStatus(status: string): "paid" | "partial" | "pending" | "failed" {
  const s = status.toUpperCase();
  if (["SUCCESS", "PAID", "COMPLETED", "FINISHED", "SETTLED"].includes(s)) return "paid";
  if (["PARTIAL", "PARTIALLY_PAID"].includes(s)) return "partial";
  if (["FAILED", "CANCELLED", "CANCELED", "EXPIRED", "CLOSED", "REFUND"].includes(s)) return "failed";
  return "pending";
}
