"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OpportunityRow, KpiCard } from "@/components/ui/OpportunityRow";
import { BybitFeature, apiGet, fmt, fmtPct } from "@/lib/api";

type Kpis = {
  portfolio?: number | null;
  today_pnl?: number | null;
  open_positions?: number | null;
  ai_signals_today?: number | null;
  win_rate?: number | null;
  profit_factor?: number | null;
  max_drawdown?: number | null;
  best_signal_today?: { symbol?: string; opportunity_score?: number; status?: string } | null;
  starting_balance?: number;
  note?: string;
};

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [opps, setOpps] = useState<BybitFeature[]>([]);
  const [movers, setMovers] = useState<BybitFeature[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");

  const refresh = useCallback(async () => {
    try {
      const [k, o, m] = await Promise.all([
        apiGet<Kpis>("/dashboard/kpis"),
        apiGet<{ items: BybitFeature[]; source?: string }>("/tokens/opportunities"),
        apiGet<{ items: BybitFeature[] }>("/bybit/fast-movers?limit=12"),
      ]);
      setKpis(k);
      setOpps(o.items || []);
      setSource(o.source || "");
      setMovers(m.items || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "API unreachable");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="card border-rose-500/40 p-3 text-sm text-rose-200">
          API unreachable: {error}. Start backend on :8000.
        </div>
      )}

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="Portfolio" value={`$${fmt(kpis?.portfolio ?? kpis?.starting_balance ?? null)}`} sub="Paper capital" />
        <KpiCard label="Today PnL" value={`$${fmt(kpis?.today_pnl)}`} />
        <KpiCard label="Open Positions" value={fmt(kpis?.open_positions, 0)} />
        <KpiCard label="AI Signals Today" value={fmt(kpis?.ai_signals_today, 0)} />
        <KpiCard
          label="Win Rate"
          value={kpis?.win_rate == null ? "—" : `${fmt((kpis.win_rate || 0) * 100, 0)}%`}
        />
        <KpiCard label="Profit Factor" value={fmt(kpis?.profit_factor)} />
        <KpiCard label="Max Drawdown" value={kpis?.max_drawdown == null ? "—" : fmtPct(kpis.max_drawdown)} sub={kpis?.note} />
        <KpiCard
          label="Best Signal Today"
          value={kpis?.best_signal_today?.symbol || "—"}
          sub={
            kpis?.best_signal_today
              ? `Opp ${fmt(kpis.best_signal_today.opportunity_score, 0)} · ${kpis.best_signal_today.status}`
              : "No signal yet"
          }
        />
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">🔥 AI Opportunities Now</h2>
            <p className="mt-1 text-sm text-slate-400">
              What should I look at now? Ranked by opportunity with separate entry quality. Source: {source || "—"}
            </p>
          </div>
          <Link href="/bybit" className="text-xs text-violet-300 hover:underline">
            Open Bybit Scanner →
          </Link>
        </div>
        <div className="space-y-2">
          {opps.length === 0 ? (
            <EmptyLive note="Waiting for live Bybit WebSocket samples. No mock tokens shown in production." />
          ) : (
            opps.slice(0, 8).map((item, idx) => <OpportunityRow key={item.symbol} item={item} rank={idx + 1} />)
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 text-base font-semibold">⚡ Bybit Fast Movers</h2>
          <p className="mb-3 text-xs text-slate-400">Acceleration now — not 24h gainer leaderboard.</p>
          <div className="space-y-2">
            {movers.length === 0 ? (
              <EmptyLive note="Collecting short-horizon samples…" />
            ) : (
              movers.slice(0, 6).map((m, i) => <OpportunityRow key={m.symbol} item={m} rank={i + 1} />)
            )}
          </div>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 text-base font-semibold">Market Regime</h2>
          <p className="text-sm text-slate-400">
            Regime model uses BTC/ETH/SOL breadth when samples exist. Until calibrated:{" "}
            <span className="text-slate-200">UNKNOWN</span> (not fabricated).
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {["BTCUSDT", "ETHUSDT", "SOLUSDT"].map((sym) => {
              const row = movers.find((m) => m.symbol === sym) || opps.find((m) => m.symbol === sym);
              return (
                <div key={sym} className="rounded-xl border border-[var(--border)] bg-black/20 p-3">
                  <div className="text-xs text-slate-500">{sym}</div>
                  <div className="mt-1 font-mono text-sm">${fmt(row?.price, 2)}</div>
                  <div className="text-xs text-slate-400">1m {fmtPct(row?.changes?.["1m"])}</div>
                </div>
              );
            })}
            <div className="rounded-xl border border-[var(--border)] bg-black/20 p-3">
              <div className="text-xs text-slate-500">Tracked</div>
              <div className="mt-1 font-mono text-sm">{movers.length || 0}</div>
              <div className="text-xs text-slate-400">fast-mover rows</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyLive({ note }: { note: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-slate-400">
      {note}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="skeleton h-16" />
        <div className="skeleton h-16" />
        <div className="skeleton h-16" />
      </div>
    </div>
  );
}
