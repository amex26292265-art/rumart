/**
 * Country name → ISO-3166 alpha-2 mapping + flag emoji. LZT returns country
 * names in mixed case ("KAZAKHSTAN", "VIET NAM", "Türkiye"), so we normalize
 * before lookup. Unknown countries render without a flag (name only).
 */
const NAME_TO_ISO: Record<string, string> = {
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  germany: "DE",
  france: "FR",
  spain: "ES",
  italy: "IT",
  netherlands: "NL",
  belgium: "BE",
  portugal: "PT",
  poland: "PL",
  ukraine: "UA",
  russia: "RU",
  "russian federation": "RU",
  turkey: "TR",
  turkiye: "TR",
  türkiye: "TR",
  kazakhstan: "KZ",
  argentina: "AR",
  brazil: "BR",
  mexico: "MX",
  canada: "CA",
  india: "IN",
  pakistan: "PK",
  indonesia: "ID",
  "viet nam": "VN",
  vietnam: "VN",
  thailand: "TH",
  philippines: "PH",
  china: "CN",
  japan: "JP",
  "south korea": "KR",
  korea: "KR",
  "saudi arabia": "SA",
  "united arab emirates": "AE",
  uae: "AE",
  qatar: "QA",
  kuwait: "KW",
  egypt: "EG",
  tunisia: "TN",
  algeria: "DZ",
  morocco: "MA",
  "south africa": "ZA",
  nigeria: "NG",
  australia: "AU",
  "new zealand": "NZ",
  panama: "PA",
  chile: "CL",
  colombia: "CO",
  peru: "PE",
  romania: "RO",
  bulgaria: "BG",
  greece: "GR",
  hungary: "HU",
  czechia: "CZ",
  "czech republic": "CZ",
  sweden: "SE",
  norway: "NO",
  finland: "FI",
  denmark: "DK",
  ireland: "IE",
  switzerland: "CH",
  austria: "AT",
  israel: "IL",
  iran: "IR",
  iraq: "IQ",
  belarus: "BY",
  serbia: "RS",
  croatia: "HR",
  bangladesh: "BD",
  malaysia: "MY",
  singapore: "SG",
  "hong kong": "HK",
  taiwan: "TW",
  venezuela: "VE",
  ecuador: "EC",
  bolivia: "BO",
  paraguay: "PY",
  uruguay: "UY",
};

export function isoForCountry(name?: string | null): string | null {
  if (!name) return null;
  return NAME_TO_ISO[name.trim().toLowerCase()] ?? null;
}

/** Flag emoji from an ISO alpha-2 code (regional indicator symbols). */
export function flagEmoji(iso: string): string {
  const code = iso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Title-case a possibly SHOUTING country name for display. */
export function prettyCountry(name?: string | null): string | null {
  if (!name) return null;
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convenience: "🇸🇦 Saudi Arabia" (flag omitted if unknown). */
export function countryLabel(name?: string | null): string | null {
  const pretty = prettyCountry(name);
  if (!pretty) return null;
  const iso = isoForCountry(name);
  return iso ? `${flagEmoji(iso)} ${pretty}` : pretty;
}
