export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000/ws";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiSend<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<T>;
}

export function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(digits);
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type BybitFeature = {
  symbol: string;
  base: string;
  quote?: string;
  price?: number | null;
  price_24h_pcnt?: number | null;
  changes?: Record<string, number | null>;
  volume_24h?: number | null;
  turnover_24h?: number | null;
  volume_acceleration?: number | null;
  price_velocity?: number | null;
  price_acceleration?: number | null;
  orderbook_imbalance?: number | null;
  spread_bps?: number | null;
  phase?: string;
  chase_risk?: number;
  opportunity_score?: number | null;
  entry_quality?: number | null;
  confidence?: number | null;
  status?: string;
  why?: string[];
  risks?: string[];
  waiting_for?: string[];
  invalidation?: string[];
  data_age_seconds?: number | null;
  data_status?: string;
  sparkline?: number[];
  listing_age_hours?: number | null;
  discovery_source?: string;
};

export function statusTone(status?: string): string {
  if (!status) return "text-slate-300 bg-slate-500/10 border-slate-500/30";
  if (["CONSIDER_ENTRY", "STRONG_SETUP"].includes(status))
    return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
  if (["WAIT_FOR_PULLBACK", "WATCH", "DO_NOT_CHASE"].includes(status))
    return "status-wait text-amber-300 bg-amber-500/10 border-amber-500/30";
  if (["EXIT", "REJECT", "AVOID"].includes(status)) return "text-rose-300 bg-rose-500/10 border-rose-500/30";
  if (status === "TAKE_PROFIT") return "text-orange-300 bg-orange-500/10 border-orange-500/30";
  return "text-slate-300 bg-slate-500/10 border-slate-500/30";
}

export function statusLabel(status?: string): string {
  switch (status) {
    case "CONSIDER_ENTRY":
      return "CONSIDER ENTRY";
    case "STRONG_SETUP":
      return "STRONG SETUP";
    case "WAIT_FOR_PULLBACK":
      return "WAIT FOR PULLBACK";
    case "DO_NOT_CHASE":
      return "DO NOT CHASE";
    case "INSUFFICIENT_DATA":
      return "INSUFFICIENT DATA";
    case "TAKE_PROFIT":
      return "TAKE PROFIT";
    default:
      return status || "UNKNOWN";
  }
}
