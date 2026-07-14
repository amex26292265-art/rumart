import type {
  Supplier,
  SupplierListing,
  SupplierPurchaseResult,
  SupplierQuery,
} from "@/lib/suppliers/types";
import { lztMarket, type LztRawItem, type LztPurchaseResponse } from "./service";
import { buildAccountInfo } from "./account-info";

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

function mapItem(raw: LztRawItem, supplierCategory: string): SupplierListing {
  const info = buildAccountInfo(raw);
  return {
    supplierItemId: String(raw.item_id),
    title: raw.title_en || raw.title || `${supplierCategory} account #${raw.item_id}`,
    // Clean, English, auto-generated summary (never a raw foreign-language blob).
    description: info.summary ?? undefined,
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

/** Extract a readable credential block from a purchase response. */
function extractCredentials(res: LztPurchaseResponse): string {
  const item = res.item;
  const login = item?.loginData?.login ?? item?.login;
  const password = item?.loginData?.password ?? item?.password;
  const lines: string[] = [];
  if (login) lines.push(`Login: ${login}`);
  if (password) lines.push(`Password: ${password}`);
  if (item?.email_login_data) lines.push(`Email access: ${item.email_login_data}`);
  if (lines.length === 0) {
    // Deliver the raw payload rather than fabricate anything.
    return JSON.stringify(res, null, 2);
  }
  return lines.join("\n");
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
    return {
      supplierItemId,
      credentials: extractCredentials(res),
      raw: res,
    };
  }
}
