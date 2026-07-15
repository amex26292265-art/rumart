import type { LztRawItem } from "./service";

/**
 * Turns a raw LZT item into professional, auto-parsed account info — the
 * "Reliable information (parsed automatically)" concept, rendered in Rumart's
 * own clean style (no images, English). Generic across categories; richest for
 * Steam. Produces:
 *  - `stats`      flat label/value list (detail grid)
 *  - `sections`   grouped rows for the product page (empty rows/sections dropped)
 *  - `games`      list of game names
 *  - `tags`       short feature chips for the card (SDA, Native email, VAC…)
 *  - normalized flags used for filtering (country, emailNative, vac, level…)
 *  - `summary`    one-line English description
 */
export interface AccountStat {
  label: string;
  value: string;
}
export interface AccountSection {
  title: string;
  rows: AccountStat[];
}
export interface AccountInfo {
  stats: AccountStat[];
  sections: AccountSection[];
  games: string[];
  tags: string[];
  warranty: string | null;
  emailNative: boolean;
  vac: boolean;
  personal: boolean;
  sda: boolean;
  level: number | null;
  country: string | null;
  origin: string | null;
  lastActivity: string | null;
  registerDate: string | null;
  summary: string | null;
}

const r = (raw: LztRawItem, key: string): unknown => (raw as Record<string, unknown>)[key];
const numOf = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};
const strOf = (v: unknown): string | null => {
  if (typeof v === "string" && v.trim() && v !== "0") return v.trim();
  if (typeof v === "number" && v > 0) return String(v);
  return null;
};
const boolOf = (v: unknown): boolean =>
  v === true || v === 1 || v === "1" || (typeof v === "string" && v.trim().length > 0 && v !== "0");

function fmtDate(v: unknown): string | null {
  const unix = typeof v === "number" ? v : Number(v);
  if (!unix || unix <= 0) return null;
  return new Date(unix * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Dynamic field walker ────────────────────────────────────────────────────
// LZT prefixes category data (`discord_*`, `riot_*`, `fortnite_*`…). Instead of
// hardcoding fields per category, walk every prefixed scalar in the raw item
// and render it with a humanized label. New API fields appear automatically.

const FIELD_PREFIXES = [
  "steam",
  "fortnite",
  "riot",
  "valorant",
  "lol",
  "epicgames",
  "epic",
  "discord",
  "telegram",
  "supercell",
  "ea",
  "origin",
  "minecraft",
  "roblox",
  "tiktok",
  "instagram",
  "uplay",
  "battlenet",
  "mihoyo",
  "socialclub",
  "warface",
  "vpn",
  "gifts",
  "account",
];

// Housekeeping/commercial keys that are never useful to a buyer.
const SKIP_KEY =
  /^(item_id|item_state|category_id|is_sticky|published_date|update_stat_date|refreshed_date|edit_date|pending_deletion_date|view_count|price|price_currency|rub_price|discount|title|title_en|description|description_en|auto_bump_period|allow_ask_discount|resale_item_origin|extended_guarantee|guarantee_duration|item_origin|email_type|email_provider|item_domain|nsb.*)$/;
// Anything that could leak credentials is reduced to a Yes/No presence flag.
const SENSITIVE = /password|login|token|cookie|secret|jwt|session|phone|email/i;
// Values under these keys are unix timestamps.
const DATE_KEY = /(date|activity|last_seen|expires|birthday|created|last_trans)/;
// Strong boolean keys render "No" too; other falsy values are just omitted.
const BOOLEAN_KEY = /^(has_|is_|can_)|(_enabled|_linkable|_ready|_active|_banned|_premium|_verified|_block)$/;

const ACRONYMS = new Set([
  "vp",
  "rp",
  "id",
  "dc",
  "nft",
  "vac",
  "cs2",
  "tf2",
  "rl",
  "psn",
  "sda",
  "mmr",
  "kd",
  "url",
  "mfa",
  "xp",
  "gta",
]);

function humanizeKey(key: string): string {
  const words = key.split("_").filter(Boolean);
  return words
    .map((w, i) => {
      if (ACRONYMS.has(w)) return w.toUpperCase();
      return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    })
    .join(" ");
}

function formatDynamicValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Yes" : BOOLEAN_KEY.test(key) ? "No" : null;
  if (typeof value === "number") {
    if (DATE_KEY.test(key) && value > 946_684_800 && value < 4_102_444_800) return fmtDate(value);
    if (value === 0) return BOOLEAN_KEY.test(key) ? "No" : null;
    if (value === 1 && BOOLEAN_KEY.test(key)) return "Yes";
    return Math.abs(value) >= 10_000 ? value.toLocaleString("en-US") : String(value);
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t || t === "0") return null;
    if (DATE_KEY.test(key)) {
      const asDate = fmtDate(t);
      if (asDate) return asDate;
    }
    return t.length > 120 ? `${t.slice(0, 117)}…` : t;
  }
  if (Array.isArray(value)) {
    const strings = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (strings.length) return strings.slice(0, 15).join(", ");
    return null; // arrays of objects usually have a *_count sibling
  }
  return null; // nested objects are handled by curated extractors (games, images)
}

/** Every useful prefixed field in the raw item, as ready-to-render rows. */
function buildDynamicRows(raw: LztRawItem): AccountStat[] {
  const rows: AccountStat[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (rows.length >= 60) break;
    if (SKIP_KEY.test(key)) continue;
    const m = /^([a-z0-9]+)_(.+)$/.exec(key);
    if (!m || !FIELD_PREFIXES.includes(m[1])) continue;
    const rest = m[2];
    if (rest.endsWith("_id") || rest === "id") continue;

    if (SENSITIVE.test(rest)) {
      // Presence only — never render values that look credential-adjacent.
      const present =
        value === true || value === 1 || (typeof value === "string" && value.trim().length > 0 && value !== "0");
      if (present) rows.push({ label: humanizeKey(rest), value: "Included" });
      continue;
    }

    const formatted = formatDynamicValue(rest, value);
    if (formatted !== null) rows.push({ label: humanizeKey(rest), value: formatted });
  }
  return rows;
}

function extractGames(raw: LztRawItem): string[] {
  const fg = r(raw, "steam_full_games");
  if (!fg || typeof fg !== "object") return [];
  const container = (fg as Record<string, unknown>).list ?? fg;
  const arr = Array.isArray(container) ? container : Object.values(container as Record<string, unknown>);
  const names: string[] = [];
  for (const g of arr) {
    if (typeof g === "string") names.push(g);
    else if (g && typeof g === "object") {
      const o = g as Record<string, unknown>;
      const name = o.title ?? o.name ?? o.abbr;
      if (typeof name === "string") names.push(name);
    }
    if (names.length >= 40) break;
  }
  return names;
}

export function buildAccountInfo(raw: LztRawItem): AccountInfo {
  const country =
    strOf(r(raw, "steam_country")) ??
    strOf(r(raw, "account_country")) ??
    strOf(r(raw, "riot_valorant_region")) ??
    null;
  const origin = strOf(r(raw, "itemOriginPhrase")) ?? strOf(r(raw, "item_origin")) ?? null;
  const registerDate = fmtDate(r(raw, "steam_register_date")) ?? fmtDate(r(raw, "register_date"));
  const lastActivity =
    fmtDate(r(raw, "steam_last_activity")) ??
    fmtDate(r(raw, "account_last_activity")) ??
    fmtDate(r(raw, "last_seen"));
  const lastTransaction = fmtDate(r(raw, "steam_last_transaction_date"));

  // Steam wallet balance in the account's own currency; only if non-zero.
  const balanceRaw = strOf(r(raw, "steam_balance"));
  const balance = balanceRaw && parseFloat(balanceRaw.replace(/[^0-9.]/g, "")) > 0 ? balanceRaw : null;
  const invRaw = numOf(r(raw, "steam_inv_value")) ?? numOf(r(raw, "steam_cs2_inv_value"));
  const inventoryValue = invRaw !== null ? `$${invRaw.toFixed(2)}` : null;

  const level = numOf(r(raw, "steam_level"));
  const points = numOf(r(raw, "steam_points"));
  const friends = numOf(r(raw, "steam_friend_count"));
  const totalGames = numOf(r(raw, "steam_game_count")) ?? numOf(r(raw, "totalGameCount"));
  const relevantGames = numOf(r(raw, "steamRelevantGameCount")) ?? numOf(r(raw, "steam_relevant_game_count"));
  const hours = strOf(r(raw, "steam_hours_played_recently"));
  const played2w = hours && parseFloat(hours) > 0 ? `${hours} h` : null;

  const emailType = strOf(r(raw, "email_type"));
  const emailNative = emailType ? emailType.toLowerCase().includes("native") : false;
  const mailProvider = strOf(r(raw, "email_provider"));
  const emailDomain = strOf(r(raw, "item_domain"));

  const vac =
    boolOf(r(raw, "steam_bans")) ||
    (numOf(r(raw, "steam_community_ban")) ?? 0) > 0 ||
    (numOf(r(raw, "steam_cs2_ban_type")) ?? 0) > 0 ||
    boolOf(r(raw, "steamLifetimeTradeBan"));
  const sda = boolOf(r(raw, "steam_mfa"));
  const personal = r(raw, "isPersonalAccount") === true;
  const limited = (numOf(r(raw, "steam_is_limited")) ?? 0) > 0;

  const keys = r(raw, "steam_has_activated_keys");
  const activatedKeys = typeof keys === "number" ? (keys > 0 ? "Yes" : "No") : null;

  // Flat stats (detail grid / summary source).
  const stats: AccountStat[] = [];
  const s = (label: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== "") stats.push({ label, value: String(value) });
  };
  s("Balance", balance);
  s("Inventory value", inventoryValue);
  s("Points", points);
  s("Account level", level);
  s("Friends", friends);
  s("Total games", totalGames);
  s("Relevant games", relevantGames);
  s("Played (2 weeks)", played2w);
  s("Register date", registerDate);
  s("Last activity", lastActivity);
  s("Last transaction", lastTransaction);
  s("Country", country);
  s("Account origin", origin);
  s("Email access", emailNative ? "Native" : emailType ? emailType : null);
  s("Mail provider", mailProvider);
  s("Activated keys", activatedKeys);

  // Grouped sections for the product page (empty rows dropped).
  const rowsAccount: AccountStat[] = [];
  const add = (bucket: AccountStat[], label: string, value: string | number | null) => {
    if (value !== null && value !== undefined && value !== "") bucket.push({ label, value: String(value) });
  };
  add(rowsAccount, "Level", level);
  add(rowsAccount, "Points", points);
  add(rowsAccount, "Friends", friends);
  add(rowsAccount, "Total games", totalGames);
  add(rowsAccount, "Relevant games", relevantGames);
  add(rowsAccount, "Balance", balance);
  add(rowsAccount, "Inventory value", inventoryValue);
  add(rowsAccount, "Limited", limited ? "Yes" : null);
  add(rowsAccount, "VAC / ban", vac ? "Yes" : "No");

  const rowsEmail: AccountStat[] = [];
  add(rowsEmail, "Email access", emailNative ? "Native (full access)" : emailType ?? "No");
  add(rowsEmail, "Mail provider", mailProvider);
  add(rowsEmail, "Email domain", emailDomain);
  add(rowsEmail, "Steam Guard (.maFile)", sda ? "Included" : null);

  const rowsActivity: AccountStat[] = [];
  add(rowsActivity, "Registration date", registerDate);
  add(rowsActivity, "Last activity", lastActivity);
  add(rowsActivity, "Played (2 weeks)", played2w);
  add(rowsActivity, "Last transaction", lastTransaction);

  // Everything else the API returned for this category, minus rows the curated
  // sections already cover — so no useful field is ever hidden.
  const curatedLabels = new Set(
    [...rowsAccount, ...rowsEmail, ...rowsActivity, ...stats].map((row) => row.label.toLowerCase()),
  );
  const curatedValues = new Set([...rowsAccount, ...rowsEmail, ...rowsActivity].map((row) => row.value));
  const dynamicRows = buildDynamicRows(raw).filter(
    (row) => !curatedLabels.has(row.label.toLowerCase()) && !(curatedValues.has(row.value) && row.value.length > 8),
  );

  // Non-steam categories have few curated stats — promote dynamic rows so
  // cards and summaries always have real data to show.
  if (stats.length < 4) {
    const statLabels = new Set(stats.map((row) => row.label.toLowerCase()));
    for (const row of dynamicRows) {
      if (stats.length >= 8) break;
      if (!statLabels.has(row.label.toLowerCase())) {
        stats.push(row);
        statLabels.add(row.label.toLowerCase());
      }
    }
  }

  const sections: AccountSection[] = [
    { title: "Account details", rows: rowsAccount },
    { title: "Email & recovery", rows: rowsEmail },
    { title: "Activity", rows: rowsActivity },
    { title: "Full account data", rows: dynamicRows },
  ].filter((sec) => sec.rows.length > 0);

  // Short feature chips for the card.
  const tags: string[] = [];
  if (sda) tags.push("SDA");
  if (emailNative) tags.push("Native email");
  if (personal) tags.push("Personal");
  if (limited) tags.push("Limited");
  if (vac) tags.push("VAC");

  const games = extractGames(raw);
  const warranty = raw.guarantee?.durationPhrase ?? null;

  const bits: string[] = [];
  if (country) bits.push(country);
  if (registerDate) bits.push(`registered ${registerDate}`);
  if (totalGames) bits.push(`${totalGames} games`);
  if (balance) bits.push(`${balance} balance`);
  if (emailNative) bits.push("native email");
  if (warranty) bits.push(`${warranty} warranty`);
  const summary = bits.length ? bits.join(" · ") : null;

  return {
    stats,
    sections,
    games,
    tags,
    warranty,
    emailNative,
    vac,
    personal,
    sda,
    level,
    country,
    origin,
    lastActivity,
    registerDate,
    summary,
  };
}
