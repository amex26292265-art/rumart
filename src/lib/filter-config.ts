/**
 * Dynamic, category-aware filter engine. Each storefront category declares
 * which filters it exposes — so Steam shows VAC / level, socials don't. Filters
 * map to real, indexed columns, so everything is server-side and fast.
 *
 * Add a category override here to change its filters; no UI changes needed.
 */
export type FilterKey = "price" | "country" | "delivery" | "emailNative" | "vac" | "level";

export interface FilterDef {
  key: FilterKey;
  label: string;
  type: "range" | "country" | "select" | "bool" | "vac";
}

const DEFS: Record<FilterKey, FilterDef> = {
  price: { key: "price", label: "Price ($)", type: "range" },
  country: { key: "country", label: "Country", type: "country" },
  delivery: { key: "delivery", label: "Delivery", type: "select" },
  emailNative: { key: "emailNative", label: "Native email access", type: "bool" },
  vac: { key: "vac", label: "VAC / game ban", type: "vac" },
  level: { key: "level", label: "Account level", type: "range" },
};

// Every category always gets price + country + delivery; the rest are opt-in.
const BASE: FilterKey[] = ["price", "country", "delivery"];

const OVERRIDES: Record<string, FilterKey[]> = {
  steam: [...BASE, "emailNative", "vac", "level"],
  valorant: [...BASE, "emailNative"],
  fortnite: [...BASE, "emailNative"],
  ea: [...BASE, "emailNative"],
  gta: [...BASE, "emailNative"],
  epicgames: [...BASE, "emailNative"],
  battlenet: [...BASE, "emailNative"],
  uplay: [...BASE, "emailNative"],
  warface: [...BASE, "emailNative"],
  genshin: [...BASE],
  minecraft: [...BASE, "emailNative"],
  roblox: [...BASE],
  supercell: [...BASE],
  discord: [...BASE],
  telegram: [...BASE],
  instagram: [...BASE],
  tiktok: [...BASE],
  giftcards: ["price", "country"],
  vpn: ["price"],
};

/** Filter definitions to render for a given category (or the default set). */
export function filtersForCategory(slug?: string | null): FilterDef[] {
  const keys = (slug && OVERRIDES[slug]) || BASE;
  return keys.map((k) => DEFS[k]);
}
