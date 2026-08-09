"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusChip, DataAge } from "@/components/ui/OpportunityRow";
import { API_BASE, BybitFeature, apiGet, apiSend, fmt, fmtPct, cn } from "@/lib/api";

type Detail = {
  kind?: string;
  token?: BybitFeature;
  status_explainer?: { title: string; summary: string };
  explanation?: { text: string };
  why_now?: string[];
  what_would_change_decision?: string[];
  waiting_for?: string[];
  bybit_trade_url?: string;
  error?: string;
};

export default function TokenPage() {
  const params = useParams<{ mint: string }>();
  const symbol = decodeURIComponent(params.mint).toUpperCase();
  const [data, setData] = useState<Detail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = () => apiGet<Detail>(`/tokens/${encodeURIComponent(symbol)}`).then(setData);
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [symbol]);

  const t = data?.token;
  const radar = useMemo(() => {
    if (!t) return [];
    const c = t.changes || {};
    return [
      { k: "Momentum", v: scale(c["1m"], -2, 6) },
      { k: "Volume", v: scale(t.volume_acceleration, -50, 100) },
      { k: "Order Flow", v: scale((t.orderbook_imbalance || 0) * 100, -50, 50) },
      { k: "Liquidity", v: t.spread_bps == null ? 40 : Math.max(5, 100 - Math.min(100, t.spread_bps)) },
      { k: "Social", v: 0 },
      { k: "News", v: 0 },
      { k: "Narrative", v: 0 },
      { k: "Risk", v: Math.max(0, 100 - (t.chase_risk || 0)) },
      { k: "Entry", v: t.entry_quality || 0 },
    ];
  }, [t]);

  const chart = useMemo(
    () => (t?.sparkline || []).map((v, i) => ({ i, v })),
    [t?.sparkline],
  );

  async function paperTrade() {
    const res = await apiSend<{ ok?: boolean; error?: string; detail?: string; position_id?: string }>(
      "/portfolio/paper/open",
      "POST",
      { mint: symbol },
    );
    setMsg(res.error ? `${res.error}: ${res.detail || ""}` : `Opened paper position ${res.position_id}`);
  }

  async function watch() {
    await apiSend("/watchlist", "POST", { symbol });
    setMsg(`Added ${symbol} to watchlist`);
  }

  if (data?.error) {
    return (
      <div className="card p-4">
        <p className="text-rose-200">INSUFFICIENT DATA for {symbol}</p>
        <Link href="/bybit" className="text-sm text-violet-300">
          ← Back to scanner
        </Link>
      </div>
    );
  }

  if (!t) return <div className="skeleton h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/bybit" className="text-xs text-slate-400 hover:text-violet-300">
            ← Scanner
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {t.base} <span className="text-slate-400">/ {t.quote || "USDT"}</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-mono">${fmt(t.price, t.price && t.price < 1 ? 6 : 2)}</span>
            <span className={cn((t.price_24h_pcnt || 0) >= 0 ? "text-emerald-300" : "text-rose-300")}>
              24h {fmtPct(t.price_24h_pcnt)}
            </span>
            <DataAge age={t.data_age_seconds} status={t.data_status} />
          </div>
        </div>
        <StatusChip
          status={t.status}
          explainerExtra={{
            why: t.why,
            risks: t.risks,
            waiting_for: t.waiting_for,
            invalidation: t.invalidation,
          }}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr_1fr]">
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Price</h2>
            <div className="flex gap-1 text-[10px] text-slate-500">
              {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
                <span key={tf} className="rounded border border-[var(--border)] px-1.5 py-0.5">
                  {tf}
                </span>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <XAxis dataKey="i" hide />
                <YAxis domain={["auto", "auto"]} stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} width={50} />
                <Tooltip
                  contentStyle={{ background: "#0e1520", border: "1px solid rgba(148,163,184,0.2)" }}
                  labelStyle={{ display: "none" }}
                />
                <Line type="monotone" dataKey="v" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Sparkline from live Bybit ticker samples. Full OHLCV candles require additional market endpoints.
          </p>
        </section>

        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Opportunity Radar</h2>
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke="rgba(148,163,184,0.2)" />
                <PolarAngleAxis dataKey="k" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Radar dataKey="v" stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-full border border-violet-400/40 bg-[#0e1520]/80 px-3 py-2 text-center">
                <div className="text-[10px] text-slate-400">SCORE</div>
                <div className="font-mono text-xl text-violet-200">{fmt(t.opportunity_score, 0)}</div>
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <Pill label="Opportunity" value={fmt(t.opportunity_score, 0)} />
            <Pill label="Entry" value={fmt(t.entry_quality, 0)} />
            <Pill label="Confidence" value={t.confidence == null ? "—" : `${fmt(t.confidence, 0)}%`} />
            <Pill label="Chase Risk" value={fmt(t.chase_risk, 0)} />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Social/News/Narrative show 0 until those providers are enabled — not invented.</p>
        </section>

        <section className="card p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-violet-300">AI Verdict</div>
          <div className="text-lg font-semibold">{data?.status_explainer?.title || t.status}</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{data?.status_explainer?.summary}</p>
          <h3 className="mt-4 text-xs font-semibold uppercase text-slate-400">Why Now?</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {(data?.why_now || t.why || []).map((w) => (
              <li key={w} className="flex gap-2">
                <span className="text-emerald-300">✓</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-xs font-semibold uppercase text-slate-400">Risks</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {(t.risks || ["No elevated risks flagged in available data"]).map((w) => (
              <li key={w} className="flex gap-2">
                <span className="text-amber-300">⚠</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-xs font-semibold uppercase text-slate-400">Waiting For</h3>
          <ul className="mt-1 space-y-1 text-sm text-slate-300">
            {(data?.waiting_for || t.waiting_for || ["—"]).map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
          <h3 className="mt-4 text-xs font-semibold uppercase text-slate-400">Invalidation</h3>
          <ul className="mt-1 space-y-1 text-sm text-slate-300">
            {(data?.what_would_change_decision || t.invalidation || []).map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>

          <div className="mt-5 grid gap-2">
            <button type="button" onClick={watch} className="rounded-xl border border-emerald-400/40 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10">
              ADD TO WATCHLIST
            </button>
            <a
              href={data?.bybit_trade_url || `https://www.bybit.com/trade/spot/${t.base}/USDT`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-violet-500/90 px-3 py-2 text-center text-sm font-medium text-white hover:bg-violet-400"
            >
              OPEN IN BYBIT
            </a>
            <button type="button" onClick={paperTrade} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-white/5">
              PAPER TRADE
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(symbol)}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-white/5"
            >
              COPY SYMBOL
            </button>
          </div>
          {msg && <p className="mt-2 text-xs text-slate-400">{msg}</p>}
          {data?.explanation?.text && (
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-black/30 p-3 font-mono text-[11px] text-slate-300">
              {data.explanation.text}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-black/20 px-2 py-1.5">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function scale(v: number | null | undefined, min: number, max: number): number {
  if (v == null || Number.isNaN(v)) return 0;
  const n = ((v - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, n));
}
