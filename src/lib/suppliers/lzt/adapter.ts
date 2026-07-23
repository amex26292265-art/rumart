import type {
  DeliveredField,
  Supplier,
  SupplierListing,
  SupplierPurchaseResult,
  SupplierQuery,
} from "@/lib/suppliers/types";
import { lztMarket, type LztRawItem, type LztPurchaseResponse } from "./service";
import { buildAccountInfo } from "./account-info";
import { buildMarketplaceTitle } from "./titles";

/**
 * The category slugs the LZT Market API actually accepts at /market/{slug}.
 * Verified against the live API — picking anything outside this list yields a
 * 404 ("The requested page could not be found"). Only these are offered in the
 * admin sync form.
 */
export const LZT_CATEGORIES = [
  "steam",
  "fortnite",
  "riot",
  "epicgames",
  "discord",
  "telegram",
  "supercell",
  "ea",
  "minecraft",
  "roblox",
  "tiktok",
  "instagram",
  "uplay",
  "battlenet",
  "mihoyo",
  "socialclub",
  "warface",
  "gifts",
  "vpn",
] as const;

const VALID = new Set<string>(LZT_CATEGORIES);

/** Is this a category the LZT API will accept? */
export function isValidLztCategory(slug: string): boolean {
  return VALID.has(slug);
}

/** Storefront category slug → default LZT supplier slug (aliases resolved). */
export const LZT_CATEGORY_MAP: Record<string, string> = {
  steam: "steam",
  fortnite: "fortnite",
  riot: "riot",
  valorant: "riot",
  epicgames: "epicgames",
  discord: "discord",
  telegram: "telegram",
  supercell: "supercell",
  origin: "ea",
  ea: "ea",
  minecraft: "minecraft",
  roblox: "roblox",
  tiktok: "tiktok",
  instagram: "instagram",
  socials: "instagram",
  uplay: "uplay",
  battlenet: "battlenet",
  mihoyo: "mihoyo",
  genshin: "mihoyo",
  socialclub: "socialclub",
  gifts: "gifts",
  giftcards: "gifts",
  vpn: "vpn",
};

/**
 * Collect displayable images for a listing:
 *  - Steam: public CDN header images of the account's own games (small webp,
 *    safe to hotlink — used on product cards). Ordered by playtime.
 *  - LZT preview collages (fortnite skins, etc.): the API endpoint needs our
 *    Bearer token and returns huge base64 payloads, so these are stored as
 *    /api/supplier-image proxy URLs and only rendered lazily on detail pages.
 */
function extractImages(raw: LztRawItem): string[] | undefined {
  const images: string[] = [];

  const fullGames = raw["steam_full_games"] as
    | { list?: Record<string, { img?: unknown; playtime_forever?: unknown }> }
    | undefined;
  if (fullGames?.list) {
    const headers = Object.values(fullGames.list)
      .filter((g): g is { img: string; playtime_forever?: unknown } => typeof g?.img === "string")
      .sort((a, b) => (Number(b.playtime_forever) || 0) - (Number(a.playtime_forever) || 0))
      .slice(0, 6)
      .map((g) => g.img);
    images.push(...headers);
  }

  const previews = (raw as { imagePreviewLinks?: { download?: Record<string, unknown> } })
    .imagePreviewLinks?.download;
  if (previews) {
    for (const type of Object.keys(previews).slice(0, 4)) {
      if (/^[a-z_]{2,20}$/.test(type)) {
        images.push(`/api/supplier-image/${raw.item_id}?type=${type}`);
      }
    }
  }

  return images.length ? images.slice(0, 8) : undefined;
}

/**
 * Strip any supplier-identifying text from customer-facing strings: the
 * supplier's brand/domains, seller Telegram/contact links, and any leftover
 * marketplace URLs. The customer must never learn where the account came from.
 */
function sanitizeSupplier(text: string): string {
  return text
    .replace(/https?:\/\/(www\.)?(lzt\.market|lolz\.live|lolz\.market|lolzteam\.[a-z]+|zelenka\.[a-z]+)\S*/gi, "")
    .replace(/\b(lzt\.market|lolz\.live|lolzteam|zelenka|lztmarket|lzt|lolz)\b/gi, "")
    .replace(/@?\bt\.me\/\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s|•·,–-]+|[\s|•·,–-]+$/g, "")
    .trim();
}

function mapItem(raw: LztRawItem, supplierCategory: string): SupplierListing {
  const info = buildAccountInfo(raw);
  const rawTitle = raw.title_en || raw.title || `${supplierCategory} account #${raw.item_id}`;
  const sanitizedFallback = sanitizeSupplier(rawTitle);
  const title = buildMarketplaceTitle(
    supplierCategory,
    {
      level: info.level,
      emailNative: info.emailNative,
      vac: info.vac,
      personal: info.personal,
      sda: info.sda,
      warranty: info.warranty,
      country: info.country,
      games: info.games,
      tags: info.tags,
      stats: info.stats,
      origin: info.origin,
    },
    sanitizedFallback,
  );
  return {
    images: extractImages(raw),
    supplierItemId: String(raw.item_id),
    title,
    // Clean, English, auto-generated summary (never a raw foreign-language blob).
    description: info.summary ? sanitizeSupplier(info.summary) || undefined : undefined,
    // We request prices in USD (currency=usd), so `price` is already USD.
    cost: Number(raw.price) || 0,
    currency: (raw.price_currency || "USD").toUpperCase(),
    supplierCategory,
    // Rumart delivers via the fast-buy API on order, so delivery is effectively
    // instant for the customer regardless of LZT's own auto-issue flag.
    deliveryType: "auto",
    attributes: {
      stats: info.stats,
      sections: info.sections,
      games: info.games,
      tags: info.tags,
      warranty: info.warranty,
      emailNative: info.emailNative,
      vac: info.vac,
      personal: info.personal,
      sda: info.sda,
      level: info.level,
      country: info.country,
      origin: info.origin,
      lastActivity: info.lastActivity,
      registerDate: info.registerDate,
      itemState: raw.item_state ?? null,
      views: (raw["view_count"] as number) ?? null,
    },
  };
}

/**
 * Extract ONLY customer-facing credential fields from a purchase response.
 *
 * SECURITY: this is a strict allow-list. It never returns the raw response,
 * seller/buyer objects, system_info, internal ids, or any market metadata —
 * the customer must never learn the supplier. Anything not explicitly matched
 * below is dropped.
 */
const CRED_RULES: { re: RegExp; label: string; secret: boolean }[] = [
  { re: /^(email[_-]?login[_-]?data)$/i, label: "Email access", secret: true },
  { re: /^(login|username|account[_-]?login|user)$/i, label: "Login", secret: false },
  { re: /^(password|pass|account[_-]?password|pwd)$/i, label: "Password", secret: true },
  { re: /^(email|mail|email[_-]?address)$/i, label: "Email", secret: false },
  { re: /^(email[_-]?password|mail[_-]?password)$/i, label: "Email password", secret: true },
  { re: /^(cookies?|cookie[_-]?data|cookie[_-]?string)$/i, label: "Cookies", secret: true },
  { re: /^(secret[_-]?answer|recovery|reserve|backup[_-]?codes?|recovery[_-]?codes?)$/i, label: "Recovery", secret: true },
  { re: /^(two[_-]?factor|2fa|mafile|ma[_-]?file|totp|otp[_-]?secret|shared[_-]?secret)$/i, label: "2FA / .maFile", secret: true },
  { re: /^(token|auth[_-]?token|access[_-]?token|session)$/i, label: "Token", secret: true },
  { re: /^(phone|phone[_-]?number|number)$/i, label: "Phone", secret: true },
];

function scanCredentials(obj: unknown, out: Map<string, DeliveredField>): void {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const str = String(value).trim();
    if (!str) continue;
    const rule = CRED_RULES.find((r) => r.re.test(key));
    if (rule && !out.has(rule.label)) out.set(rule.label, { label: rule.label, value: str, secret: rule.secret });
  }
}

function extractCredentials(res: LztPurchaseResponse): DeliveredField[] {
  const item = res.item;
  const out = new Map<string, DeliveredField>();
  // Only look at the credential-bearing sub-objects, never the whole response.
  scanCredentials(item?.loginData, out);
  scanCredentials(item, out);
  const known = ["Email access", "Login", "Password", "Email", "Email password", "Cookies", "Recovery", "2FA / .maFile", "Token", "Phone"];
  return [...out.values()].sort((a, b) => known.indexOf(a.label) - known.indexOf(b.label));
}

/** LZT implementation of the Supplier interface. */
export class LztSupplier implements Supplier {
  readonly slug = "lzt";
  readonly name = "LZT Market";

  isConfigured(): boolean {
    return lztMarket.isConfigured();
  }

  async listCategories(): Promise<{ slug: string; name: string }[]> {
    return Object.keys(LZT_CATEGORY_MAP).map((slug) => ({ slug, name: slug }));
  }

  async listItems(query: SupplierQuery): Promise<SupplierListing[]> {
    const raw = await lztMarket.listCategory(query.supplierCategory, {
      pmin: query.minPrice,
      pmax: query.maxPrice,
      page: query.page ?? 1,
      currency: "usd", // return `price` in USD to match SITE_CURRENCY
    });
    return raw
      .map((item) => mapItem(item, query.supplierCategory))
      .filter((listing) => {
        // Only sell items that are actually active on the supplier.
        if (listing.attributes?.itemState && listing.attributes.itemState !== "active") return false;
        if (query.country && listing.attributes?.country !== query.country) return false;
        return true;
      });
  }

  async getItem(supplierItemId: string): Promise<SupplierListing | null> {
    const raw = await lztMarket.getItem(supplierItemId);
    if (!raw) return null;
    return mapItem(raw, "");
  }

  async purchase(supplierItemId: string, expectedCost: number): Promise<SupplierPurchaseResult> {
    const res = await lztMarket.fastBuy(supplierItemId, expectedCost);
    const fields = extractCredentials(res);
    if (fields.length === 0) {
      // We purchased successfully but couldn't recognise any credential field.
      // Never dump the raw response — fall back to manual delivery instead.
      throw new Error("purchased but no recognizable credentials in response");
    }
    return { supplierItemId, fields };
  }

  async getBalance(): Promise<number | null> {
    return lztMarket.balanceUsd();
  }
}
