export type TokenRow = {
  mint: string;
  symbol?: string | null;
  name?: string | null;
  age_minutes?: number | null;
  price_usd?: number | null;
  market_cap_usd?: number | null;
  liquidity_usd?: number | null;
  volume_5m?: number | null;
  buys?: number | null;
  sells?: number | null;
  unique_buyers?: number | null;
  momentum_label?: string | null;
  social_label?: string | null;
  wallet_label?: string | null;
  data_source?: string;
  bucket?: string;
  analysis?: {
    opportunity_score?: number | null;
    confidence?: number | null;
    risk_score?: number | null;
    entry_quality?: number | null;
    entry_status?: string;
    momentum_state?: string;
    safety_class?: string;
    decision?: string;
    why?: string[];
    risks?: string[];
    data_quality?: string;
    contributions?: Array<{
      factor: string;
      weight?: number | null;
      raw: number;
      weighted: number;
      note?: string | null;
    }>;
  };
};

export type Health = {
  status: string;
  trading_mode: string;
  live_execution_enabled: boolean;
  database: string;
  redis: string;
  websocket_clients: number;
  tokens_monitored: number;
  analysis_quality_warning?: boolean;
  degraded_components?: string[];
};

export type PaperPortfolio = {
  metrics: Record<string, number | null>;
  positions: Array<Record<string, unknown>>;
};

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(digits);
}

export function decisionClass(d?: string): string {
  if (!d) return "neutral";
  if (d.includes("CONSIDER") || d.includes("HOLD")) return "good";
  if (d.includes("WAIT") || d.includes("WATCH") || d.includes("TAKE") || d.includes("REDUCE")) return "wait";
  if (d.includes("REJECT") || d.includes("EXIT")) return "bad";
  if (d.includes("INSUFFICIENT")) return "neutral";
  return "neutral";
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}
