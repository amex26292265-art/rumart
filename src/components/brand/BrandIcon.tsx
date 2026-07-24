/**
 * Category / product brand mark.
 * Prefers `/brands/{slug}.svg` (colored, recognizable marks), falls back to
 * geometric glyphs for unknown slugs.
 */
type Props = { slug?: string | null; className?: string; logoUrl?: string | null };

const ALIAS: Record<string, string> = {
  riot: "valorant",
  socialclub: "gta",
  mihoyo: "genshin",
  "notion-ai": "ai",
  gemini: "ai",
  perplexity: "ai",
  midjourney: "ai",
  copilot: "ai",
  software: "ai",
};

const KNOWN = new Set([
  "fortnite",
  "valorant",
  "steam",
  "discord",
  "telegram",
  "roblox",
  "minecraft",
  "ea",
  "instagram",
  "tiktok",
  "chatgpt",
  "claude",
  "cursor",
  "epicgames",
  "gta",
  "genshin",
  "ai",
]);

export function brandLogoSrc(slug?: string | null, logoUrl?: string | null): string | null {
  if (logoUrl) return logoUrl;
  if (!slug) return null;
  const key = ALIAS[slug] ?? slug;
  if (KNOWN.has(key)) return `/brands/${key}.svg`;
  return null;
}

export function BrandIcon({ slug, className, logoUrl }: Props) {
  const src = brandLogoSrc(slug, logoUrl);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={className} width={48} height={48} loading="lazy" decoding="async" />;
  }

  // Neutral fallback mark
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 3 20 7.5v9L12 21 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}
