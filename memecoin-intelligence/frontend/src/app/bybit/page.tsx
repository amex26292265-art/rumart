"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OpportunityRow, KpiCard } from "@/components/ui/OpportunityRow";
import { BybitFeature, apiGet, fmt } from "@/lib/api";

export default function BybitScannerPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [movers, setMovers] = useState<BybitFeature[]>([]);
  const [instruments, setInstruments] = useState(0);
  const [heatmap, setHeatmap] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [h, m, inst, heat] = await Promise.all([
        apiGet<Record<string, unknown>>("/bybit/health"),
        apiGet<{ items: BybitFeature[] }>("/bybit/fast-movers?limit=40"),
        apiGet<{ count: number; discovery_source?: string; discovery_error?: string }>("/bybit/instruments"),
        apiGet<{ items: Array<Record<string, unknown>> }>("/bybit/heatmap"),
      ]);
      setHealth(h);
      setMovers(m.items || []);
      setInstruments(inst.count || 0);
      setHeatmap(heat.items || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Bybit Opportunity Scanner</h1>
        <p className="mt-1 text-sm text-slate-400">
          Official Bybit V5 public Spot WebSocket + instruments discovery. No API secret required for market data.
        </p>
      </div>

      {error && <div className="card border-rose-500/40 p-3 text-sm text-rose-200">{error}</div>}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <KpiCard label="WS" value={health?.ws_ok ? "LIVE" : "DOWN"} />
        <KpiCard label="REST" value={health?.rest_ok === true ? "OK" : health?.rest_ok === false ? "BLOCKED" : "—"} />
        <KpiCard label="Instruments" value={fmt(instruments, 0)} sub={String(health?.discovery_source || "")} />
        <KpiCard label="Subscribed" value={fmt(Number(health?.subscribed || 0), 0)} />
        <KpiCard label="Fast Movers" value={fmt(movers.length, 0)} />
      </div>

      {!!health?.discovery_error && (
        <div className="card border-amber-500/30 p-3 text-xs text-amber-200">
          Discovery note: {String(health.discovery_error)}. Fallback discovery source: {String(health.discovery_source)}.
        </div>
      )}

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">⚡ Bybit Fast Movers</h2>
          <Link href="/bybit/new-listings" className="text-xs text-violet-300 hover:underline">
            New Listings →
          </Link>
        </div>
        <div className="space-y-2">
          {movers.map((m, i) => (
            <OpportunityRow key={m.symbol} item={m} rank={i + 1} />
          ))}
          {!movers.length && (
            <div className="text-sm text-slate-400">Waiting for live ticker samples over WebSocket…</div>
          )}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-base font-semibold">Heatmap</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
          {heatmap.slice(0, 48).map((t) => {
            const group = String(t.group || "neutral");
            const bg =
              group === "accelerating"
                ? "bg-emerald-500/25"
                : group === "bullish"
                  ? "bg-emerald-500/15"
                  : group === "overextended"
                    ? "bg-orange-500/20"
                    : group === "weakening"
                      ? "bg-rose-500/20"
                      : group === "insufficient"
                        ? "bg-slate-500/10"
                        : "bg-sky-500/10";
            const size = Math.min(1.4, 0.85 + Math.log10(Number(t.turnover_24h || 1) + 1) / 10);
            return (
              <Link
                key={String(t.symbol)}
                href={`/token/${t.symbol}`}
                className={`rounded-xl border border-[var(--border)] p-2 ${bg} transition hover:scale-[1.02]`}
                style={{ minHeight: `${64 * size}px` }}
              >
                <div className="text-[11px] font-semibold">{String(t.base)}</div>
                <div className="font-mono text-[10px] text-slate-300">
                  {t.change_1m == null ? "—" : `${Number(t.change_1m).toFixed(2)}%`}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
