import { env } from "@/lib/env";

/**
 * LztMarketService — the single gateway for every LZT Market API request.
 *
 * NOTE ON THE SPEC: the file supplied (marketapi.json) is the Lolzteam *Forum*
 * API and does not contain Market endpoints. These methods are modeled on the
 * official Market API (https://lzt-market.readme.io), base `prod-api.lolz.live`.
 * If your account's contract differs, this is the ONLY file to adjust — nothing
 * else in the app calls the API directly.
 *
 * Auth: Bearer token with `market` scope. Rate limit: 300 req/min.
 */

export interface LztRawItem {
  item_id: number;
  title?: string;
  title_en?: string;
  price: number;
  price_currency?: string;
  category_id?: number;
  item_state?: string; // "active" | "sold" | ...
  seller?: { username?: string; sold_items_count?: number; restore_percents?: number };
  account_country?: string;
  extended_guarantee?: number;
  guarantee?: { durationPhrase?: string };
  auto_gift_status?: number; // 1 => auto delivery
  [key: string]: unknown;
}

interface LztListResponse {
  items?: LztRawItem[];
  totalItems?: number;
  totalItemsPrice?: number;
  perPage?: number;
}

export interface LztPurchaseResponse {
  status?: string;
  item?: LztRawItem & {
    loginData?: { login?: string; password?: string; [k: string]: unknown };
    login?: string;
    password?: string;
    email_login_data?: string;
  };
  [key: string]: unknown;
}

export class LztApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "LztApiError";
  }
}

export class LztMarketService {
  private readonly base: string;
  private readonly token: string;

  constructor(base = env.LZT_API_BASE, token = env.LZT_API_TOKEN) {
    this.base = base.replace(/\/$/, "");
    this.token = token;
  }

  isConfigured(): boolean {
    return this.token.length > 0;
  }

  /** Core request. All LZT traffic funnels through here (auth, errors, JSON). */
  private async request<T>(
    path: string,
    init: { method?: string; query?: Record<string, unknown>; body?: Record<string, unknown> } = {},
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new LztApiError("LZT token not configured", 401);
    }
    const url = new URL(`${this.base}${path}`);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      // Never cache supplier data — stock changes constantly.
      cache: "no-store",
    });

    const text = await res.text();
    const json = text ? safeJson(text) : null;
    if (!res.ok) {
      const msg =
        (json as { errors?: string[]; error_description?: string })?.errors?.[0] ??
        (json as { error_description?: string })?.error_description ??
        `LZT request failed (${res.status})`;
      throw new LztApiError(msg, res.status, json);
    }
    return json as T;
  }

  /** Category listing, e.g. category "steam" with price/quality filters. */
  async listCategory(
    category: string,
    params: {
      pmin?: number;
      pmax?: number;
      title?: string;
      order_by?: string;
      page?: number;
      auto_gift?: 0 | 1;
      [k: string]: unknown;
    } = {},
  ): Promise<LztRawItem[]> {
    const data = await this.request<LztListResponse>(`/market/${encodeURIComponent(category)}`, {
      query: params,
    });
    return data.items ?? [];
  }

  /** Single item details (used for availability / re-price checks). */
  async getItem(itemId: string | number): Promise<LztRawItem | null> {
    try {
      const data = await this.request<{ item?: LztRawItem }>(`/market/${itemId}`);
      return data.item ?? null;
    } catch (err) {
      if (err instanceof LztApiError && err.status === 404) return null;
      throw err;
    }
  }

  /**
   * Fast buy: purchase with a price guard so we never overpay if the supplier
   * price moved between listing and checkout.
   */
  async fastBuy(
    itemId: string | number,
    expectedPrice: number,
    currency = "usd",
  ): Promise<LztPurchaseResponse> {
    return this.request<LztPurchaseResponse>(`/market/${itemId}/fast-buy`, {
      method: "POST",
      body: { price: expectedPrice, currency },
    });
  }

  /** Account balance / profile — useful for admin "API status" panel. */
  async me(): Promise<unknown> {
    return this.request<unknown>(`/market/me`);
  }

  /**
   * Total spendable balance in USD for buying accounts. LZT keeps a main
   * `balance` PLUS separate sub-balances in `balances[]` — notably the
   * dedicated "Balance for buying accounts", which fast-buy also spends from.
   * We sum them so a purchase we can actually afford is never pre-emptively
   * rejected. `convertedBalance` is a conversion into another unit and must NOT
   * be used. Returns null only when nothing usable is found.
   */
  async balanceUsd(): Promise<number | null> {
    const res = (await this.me()) as { user?: Record<string, unknown> } | Record<string, unknown>;
    const u = ((res as { user?: Record<string, unknown> }).user ?? res) as Record<string, unknown>;
    const toNum = (v: unknown): number =>
      typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;

    let total = 0;
    let found = false;
    const main = toNum(u.balance);
    if (Number.isFinite(main)) {
      total += main;
      found = true;
    }
    if (Array.isArray(u.balances)) {
      for (const b of u.balances as Record<string, unknown>[]) {
        const v = toNum(b.balance);
        if (Number.isFinite(v)) {
          total += v;
          found = true;
        }
      }
    }
    return found ? total : null;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/** Shared singleton. */
export const lztMarket = new LztMarketService();
