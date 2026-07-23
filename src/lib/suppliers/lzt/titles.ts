/**
 * Build professional marketplace titles from structured account attributes.
 * Prefer attrs over raw supplier titles so listings never look like
 * "Steam Account" / "Valorant Account".
 */

export type TitleAttrs = {
  level?: number | null;
  emailNative?: boolean;
  vac?: boolean;
  personal?: boolean;
  sda?: boolean;
  warranty?: string | null;
  country?: string | null;
  games?: string[];
  tags?: string[];
  stats?: { label: string; value: string }[];
  origin?: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  steam: "Steam Account",
  fortnite: "Fortnite Account",
  valorant: "Valorant Account",
  riot: "Valorant Account",
  ea: "EA App Account",
  gta: "GTA Online Account",
  socialclub: "GTA Online Account",
  discord: "Discord Account",
  telegram: "Telegram Account",
  genshin: "Genshin Impact Account",
  mihoyo: "miHoYo Account",
  epicgames: "Epic Games Account",
  roblox: "Roblox Account",
  minecraft: "Minecraft Account",
  supercell: "Supercell Account",
  battlenet: "Battle.net Account",
  uplay: "Ubisoft Account",
  vpn: "VPN Subscription",
  instagram: "Instagram Account",
  tiktok: "TikTok Account",
  giftcards: "Gift Card",
  gifts: "Gift Card",
  chatgpt: "ChatGPT Plus",
  claude: "Claude Pro",
  gemini: "Gemini Advanced",
  perplexity: "Perplexity Pro",
  midjourney: "Midjourney",
  copilot: "GitHub Copilot",
  cursor: "Cursor Pro",
  "notion-ai": "Notion AI",
  ai: "AI Subscription",
  software: "Software License",
  hosting: "Hosting Plan",
  domains: "Domain",
  netflix: "Netflix",
  spotify: "Spotify Premium",
  disney: "Disney+",
};

function stat(attrs: TitleAttrs, ...labels: string[]): string | null {
  for (const label of labels) {
    const hit = attrs.stats?.find((s) => s.label.toLowerCase() === label.toLowerCase());
    if (hit?.value) return hit.value;
  }
  return null;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Produce an SEO-friendly marketplace title.
 * Example: "Valorant Ascendant Account • Prime • 120+ Skins • Full Access"
 */
export function buildMarketplaceTitle(
  categorySlug: string,
  attrs: TitleAttrs,
  fallbackRawTitle?: string,
): string {
  const base = CATEGORY_LABEL[categorySlug] ?? `${capitalize(categorySlug || "Digital")} Account`;
  const parts: string[] = [];

  // Rank / level / premium signals
  const rank = stat(attrs, "Rank", "Current rank", "Competitive rank", "Tier");
  if (rank) parts.push(rank);

  const skins = stat(attrs, "Skin count", "Skins", "Skins count");
  if (skins) {
    const n = parseInt(skins.replace(/\D/g, ""), 10);
    parts.push(Number.isFinite(n) && n > 0 ? `${n}+ Skins` : `${skins} Skins`);
  }

  const balance = stat(attrs, "Balance", "Wallet", "V-Bucks", "Robux");
  if (balance) parts.push(balance.includes("$") || /\d/.test(balance) ? balance : `Balance ${balance}`);

  const inv = stat(attrs, "Inventory value", "Inventory");
  if (inv && !balance) parts.push(`Inv ${inv}`);

  const level = attrs.level ?? (stat(attrs, "Account level", "Level") ? Number(stat(attrs, "Account level", "Level")) : null);
  if (level != null && Number.isFinite(level) && level > 0) parts.push(`Lvl ${level}`);

  const nitro = stat(attrs, "Nitro", "Premium");
  if (nitro) parts.push(nitro);

  const followers = stat(attrs, "Followers count", "Followers");
  if (followers) parts.push(`${followers} Followers`);

  // Top games for Steam-like catalogs
  if (attrs.games?.length) {
    const top = attrs.games.slice(0, 3).join(" + ");
    if (top && categorySlug === "steam") parts.unshift(top);
    else if (top && parts.length < 2) parts.push(top);
  }

  if (attrs.emailNative) parts.push("Email Included");
  if (attrs.personal) parts.push("Personal");
  if (attrs.sda) parts.push("SDA");
  if (attrs.tags?.includes("Prime") || attrs.tags?.some((t) => /prime/i.test(t))) parts.push("Prime");

  // Always end with access signal when we have structured data
  const hasStructure = parts.length > 0 || attrs.emailNative || (attrs.games?.length ?? 0) > 0;
  if (hasStructure) parts.push("Full Access");

  // If we have almost nothing useful, try cleaning the raw title
  if (parts.length === 0 && fallbackRawTitle) {
    const cleaned = fallbackRawTitle
      .replace(/\b(lzt|lolz|zelenka)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (cleaned && !/^(valorant|steam|fortnite|discord|roblox)\s+account$/i.test(cleaned)) {
      return cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned;
    }
  }

  const title = parts.length ? `${base} • ${parts.slice(0, 5).join(" • ")}` : `${base} • Full Access`;
  return title.length > 140 ? `${title.slice(0, 137)}…` : title;
}
