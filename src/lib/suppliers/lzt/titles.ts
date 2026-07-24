/**
 * Build professional marketplace titles from structured account attributes.
 * Preferred capture style (LZT Market–like):
 *   "Astr | 4 Pickaxes, 1 Dances, 3 Gliders"
 *   "Ascendant | 120 Skins, Email Included"
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
  steam: "Steam",
  fortnite: "Fortnite",
  valorant: "Valorant",
  riot: "Valorant",
  ea: "EA App",
  gta: "GTA Online",
  socialclub: "GTA Online",
  discord: "Discord",
  telegram: "Telegram",
  genshin: "Genshin",
  mihoyo: "miHoYo",
  epicgames: "Epic Games",
  roblox: "Roblox",
  minecraft: "Minecraft",
  supercell: "Supercell",
  battlenet: "Battle.net",
  uplay: "Ubisoft",
  vpn: "VPN",
  instagram: "Instagram",
  tiktok: "TikTok",
  giftcards: "Gift Card",
  gifts: "Gift Card",
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
  midjourney: "Midjourney",
  copilot: "Copilot",
  cursor: "Cursor",
  "notion-ai": "Notion AI",
  ai: "AI",
  software: "Software",
  hosting: "Hosting",
  domains: "Domain",
  netflix: "Netflix",
  spotify: "Spotify",
  disney: "Disney+",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stat(attrs: TitleAttrs, ...labels: string[]): string | null {
  for (const label of labels) {
    const hit = attrs.stats?.find((s) => s.label.toLowerCase() === label.toLowerCase());
    if (hit?.value) return hit.value;
  }
  return null;
}

function numStat(attrs: TitleAttrs, ...labels: string[]): number | null {
  const raw = stat(attrs, ...labels);
  if (!raw) return null;
  const n = parseInt(raw.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse capture counts embedded in titles like "Astr | 4 Pickaxes, 1 Dances, 3 Gliders". */
function captureFromTitle(title?: string): {
  pickaxes: number;
  dances: number;
  gliders: number;
  skins: number;
  followers: number;
  level: number;
} {
  const t = title ?? "";
  const n = (re: RegExp) => {
    const m = re.exec(t);
    return m ? parseInt(m[1], 10) : 0;
  };
  return {
    pickaxes: n(/(\d+)\s*Pickaxes?/i),
    dances: n(/(\d+)\s*Dances?/i) || n(/(\d+)\s*Emotes?/i),
    gliders: n(/(\d+)\s*Gliders?/i),
    skins: n(/(\d+)\+?\s*Skins?/i),
    followers: n(/([\d,]+)\s*Followers?/i),
    level: n(/(\d+)\s*lvl/i) || n(/Lvl\s*(\d+)/i),
  };
}

/** True when the listing has real inventory/capture data worth selling. */
export function hasFullCapture(categorySlug: string, attrs: TitleAttrs, rawTitle?: string): boolean {
  if (rawTitle && isJunkTitle(rawTitle)) return false;

  const fromTitle = captureFromTitle(rawTitle);
  const pickaxes = numStat(attrs, "Pickaxe count", "Pickaxes") ?? fromTitle.pickaxes;
  const dances = numStat(attrs, "Dance count", "Dances", "Emote count", "Emotes") ?? fromTitle.dances;
  const gliders = numStat(attrs, "Glider count", "Gliders") ?? fromTitle.gliders;
  const skins = numStat(attrs, "Skin count", "Skins", "Skins count") ?? fromTitle.skins;
  const rank = stat(attrs, "Rank", "Current rank", "Competitive rank", "Tier");
  const followers = numStat(attrs, "Followers count", "Followers") ?? fromTitle.followers;
  const nitro = stat(attrs, "Nitro", "Premium");
  const games = attrs.games?.length ?? 0;
  const level =
    attrs.level ?? numStat(attrs, "Account level", "Level", "Book level") ?? fromTitle.level;

  const slug = categorySlug.toLowerCase();

  if (slug === "fortnite") {
    // Need real cosmetics — bare 0/0/0 is not capture.
    return pickaxes + dances + gliders > 0 || skins > 0;
  }
  if (slug === "epicgames") {
    // Epic library accounts — games / level / priced capture titles.
    return games > 0 || level > 0 || skins > 0 || /\|/.test(rawTitle ?? "") || meaningfulTitle(rawTitle);
  }
  if (slug === "valorant" || slug === "riot" || slug === "lol") {
    return skins > 0 || Boolean(rank) || meaningfulTitle(rawTitle);
  }
  if (slug === "steam") {
    return games > 0 || level > 0 || skins > 0 || /\|/.test(rawTitle ?? "");
  }
  if (slug === "discord") {
    return Boolean(nitro) || level > 0 || /nitro/i.test(rawTitle ?? "") || meaningfulTitle(rawTitle);
  }
  if (slug === "instagram" || slug === "tiktok" || slug === "telegram") {
    return (
      followers > 0 ||
      attrs.emailNative === true ||
      Boolean(attrs.country) ||
      meaningfulStatsCount(attrs) >= 1 ||
      meaningfulTitle(rawTitle)
    );
  }
  if (slug === "roblox") {
    const robux =
      numStat(attrs, "Robux", "Balance", "Robux balance", "RAP", "Limiteds", "Limited items") ?? 0;
    return (
      robux > 0 ||
      skins > 0 ||
      level > 0 ||
      /headless|korblox|limited|robux/i.test(rawTitle ?? "") ||
      meaningfulTitle(rawTitle)
    );
  }

  // Generic: at least one meaningful non-zero capture signal.
  const meaningfulStats = meaningfulStatsCount(attrs);
  return (
    meaningfulStats >= 2 ||
    games > 0 ||
    skins > 0 ||
    Boolean(rank) ||
    followers > 0 ||
    pickaxes + dances + gliders > 0 ||
    (rawTitle ? /\|\s*\d+/.test(rawTitle) : false) ||
    meaningfulTitle(rawTitle)
  );
}

function meaningfulStatsCount(attrs: TitleAttrs): number {
  return (attrs.stats ?? []).filter((s) => {
    const v = s.value.trim().toLowerCase();
    if (!v || v === "0" || v === "no" || v === "n/a" || v === "false") return false;
    return true;
  }).length;
}

/** Non-junk supplier title with enough substance to list. */
function meaningfulTitle(rawTitle?: string): boolean {
  if (!rawTitle) return false;
  if (isJunkTitle(rawTitle)) return false;
  const t = rawTitle.trim();
  return t.length >= 12;
}

/** Test / empty placeholder titles that must never stay in the catalog. */
export function isJunkTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (!t) return true;
  if (/^(valorant|fortnite|steam|discord|roblox|riot)?\s*tests?\b/.test(t)) return true;
  if (/\b(test account|account test|dummy|placeholder)\b/.test(t)) return true;
  if (/^\s*(valorant|fortnite|steam)\s+test\s*$/i.test(title)) return true;
  // Nonsense placeholders
  if (/^(asdf+|qwer+|zxcv+|dasdas|adfgadfg|lorem|xxx+|aaa+|bbb+|test\d*)$/i.test(t)) return true;
  if (t.length <= 6 && !/\d/.test(t) && !/\|/.test(t)) return true;
  // Empty Fortnite capture lines
  if (/0\s*skins/.test(t) && /0\s*vb/.test(t) && !/\d+\s*pickaxes?/.test(t)) return true;
  if (/\| 0 skins \| 0 vb/.test(t)) return true;
  return false;
}

/** Prefer a skin/rarity lead from supplier title: "Astr | 4 Pickaxes…" → "Astr". */
function leadFromRawTitle(raw?: string): string | null {
  if (!raw) return null;
  const m = /^([^|•]{2,40}?)\s*[|•]\s*/.exec(raw.trim());
  if (!m) return null;
  const lead = m[1].trim();
  if (!lead || isJunkTitle(lead)) return null;
  if (/^(fortnite|valorant|steam|discord|roblox|account)\b/i.test(lead) && lead.length < 24) {
    // "Fortnite Account [Serbia]" is not a cosmetic lead.
    if (/account/i.test(lead)) return null;
  }
  return lead.length > 48 ? `${lead.slice(0, 45)}…` : lead;
}

function joinCapture(parts: string[]): string {
  return parts.filter(Boolean).join(", ");
}

/**
 * Produce a capture-style marketplace title.
 * Example: "Astr | 4 Pickaxes, 1 Dances, 3 Gliders"
 */
export function buildMarketplaceTitle(
  categorySlug: string,
  attrs: TitleAttrs,
  fallbackRawTitle?: string,
): string {
  const slug = categorySlug.toLowerCase();
  const base = CATEGORY_LABEL[slug] ?? capitalize(slug || "Digital");

  const pickaxes = numStat(attrs, "Pickaxe count", "Pickaxes");
  const dances = numStat(attrs, "Dance count", "Dances", "Emote count", "Emotes");
  const gliders = numStat(attrs, "Glider count", "Gliders");
  const skins = numStat(attrs, "Skin count", "Skins", "Skins count");
  const rank = stat(attrs, "Rank", "Current rank", "Competitive rank", "Tier");
  const vbucks = stat(attrs, "V-Bucks", "Vbucks", "Balance");
  const followers = numStat(attrs, "Followers count", "Followers");
  const nitro = stat(attrs, "Nitro", "Premium");
  const level =
    attrs.level ??
    (stat(attrs, "Account level", "Level", "Book level")
      ? Number(stat(attrs, "Account level", "Level", "Book level"))
      : null);

  // If supplier already gave a proper capture title, keep it (after junk check).
  if (
    fallbackRawTitle &&
    !isJunkTitle(fallbackRawTitle) &&
    /\|\s*\d+\s*(Pickaxes?|Dances?|Gliders?|Skins?)/i.test(fallbackRawTitle)
  ) {
    const cleaned = fallbackRawTitle.replace(/\s{2,}/g, " ").trim();
    return cleaned.length > 140 ? `${cleaned.slice(0, 137)}…` : cleaned;
  }

  // Fortnite cosmetic capture
  if (slug === "fortnite" || slug === "epicgames") {
    const bits: string[] = [];
    if (pickaxes && pickaxes > 0) bits.push(`${pickaxes} Pickaxes`);
    if (dances && dances > 0) bits.push(`${dances} Dances`);
    if (gliders && gliders > 0) bits.push(`${gliders} Gliders`);
    if (bits.length === 0 && skins && skins > 0) bits.push(`${skins} Skins`);
    if (vbucks && /\d/.test(vbucks) && !/^0\b/.test(vbucks.trim())) bits.push(`${vbucks} V-Bucks`);
    if (bits.length) {
      const lead = leadFromRawTitle(fallbackRawTitle) ?? rank ?? base;
      return `${lead} | ${joinCapture(bits)}`.slice(0, 140);
    }
  }

  // Valorant / Riot
  if (slug === "valorant" || slug === "riot" || slug === "lol") {
    const bits: string[] = [];
    if (skins && skins > 0) bits.push(`${skins} Skins`);
    if (attrs.emailNative) bits.push("Email Included");
    if (level && level > 0) bits.push(`Lvl ${level}`);
    if (bits.length || rank) {
      const lead = leadFromRawTitle(fallbackRawTitle) ?? rank ?? base;
      const right = bits.length ? joinCapture(bits) : "Full Access";
      return `${lead} | ${right}`.slice(0, 140);
    }
  }

  // Steam — lead with games
  if (slug === "steam") {
    const bits: string[] = [];
    if (attrs.games?.length) bits.push(attrs.games.slice(0, 3).join(" + "));
    if (level && level > 0) bits.push(`${level} lvl`);
    if (skins && skins > 0) bits.push(`${skins} Skins`);
    const inv = stat(attrs, "Inventory value", "Inventory");
    if (inv) bits.push(`Inv ${inv}`);
    if (attrs.sda) bits.push("SDA");
    if (bits.length) {
      const lead = leadFromRawTitle(fallbackRawTitle) ?? "Steam";
      return `${lead} | ${joinCapture(bits)}`.slice(0, 140);
    }
  }

  // Social
  if (slug === "instagram" || slug === "tiktok" || slug === "telegram") {
    const bits: string[] = [];
    if (followers && followers > 0) bits.push(`${followers.toLocaleString("en-US")} Followers`);
    if (attrs.emailNative) bits.push("Email Included");
    if (bits.length) return `${base} | ${joinCapture(bits)}`.slice(0, 140);
  }

  if (slug === "discord" && (nitro || (level && level > 0))) {
    const bits: string[] = [];
    if (nitro) bits.push(nitro);
    if (level && level > 0) bits.push(`Lvl ${level}`);
    return `${base} | ${joinCapture(bits) || "Full Access"}`.slice(0, 140);
  }

  // Generic structured fallback
  const parts: string[] = [];
  if (rank) parts.push(rank);
  if (skins && skins > 0) parts.push(`${skins} Skins`);
  if (vbucks && /\d/.test(vbucks) && !/^0\b/.test(vbucks.trim())) parts.push(vbucks);
  if (level && level > 0) parts.push(`Lvl ${level}`);
  if (followers && followers > 0) parts.push(`${followers} Followers`);
  if (attrs.games?.length) parts.push(attrs.games.slice(0, 2).join(" + "));
  if (attrs.emailNative) parts.push("Email Included");
  if (attrs.personal) parts.push("Personal");
  if (attrs.sda) parts.push("SDA");

  if (parts.length) {
    const lead = leadFromRawTitle(fallbackRawTitle) ?? base;
    return `${lead} | ${joinCapture(parts.slice(0, 4))}`.slice(0, 140);
  }

  if (fallbackRawTitle && !isJunkTitle(fallbackRawTitle)) {
    const cleaned = fallbackRawTitle
      .replace(/\b(lzt|lolz|zelenka)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (cleaned) return cleaned.length > 140 ? `${cleaned.slice(0, 137)}…` : cleaned;
  }

  return `${base} | Full Access`;
}
