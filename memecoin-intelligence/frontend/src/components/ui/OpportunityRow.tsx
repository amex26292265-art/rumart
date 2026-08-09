"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";
import { BybitFeature, apiGet, cn, fmt, fmtPct, statusLabel, statusTone } from "@/lib/api";
import { MiniSpark } from "@/components/charts/MiniSpark";

type Explainer = { title: string; summary: string };

export function StatusChip({
  status,
  explainerExtra,
}: {
  status?: string;
  explainerExtra?: { why?: string[]; risks?: string[]; waiting_for?: string[]; invalidation?: string[] };
}) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<Explainer | null>(null);

  async function onOpen() {
    setOpen(true);
    try {
      const data = await apiGet<{ items: Record<string, Explainer> }>("/meta/status-explainers");
      setMeta(data.items[status || ""] || data.items.INSUFFICIENT_DATA);
    } catch {
      setMeta({
        title: statusLabel(status),
        summary: "Could not load explainer. Status is decision-support only.",
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide", statusTone(status))}
        title="Click for explanation"
      >
        {statusLabel(status)}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-violet-200">{meta?.title || statusLabel(status)}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{meta?.summary}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            {!!explainerExtra?.why?.length && (
              <Section title="WHY" items={explainerExtra.why} tone="good" />
            )}
            {!!explainerExtra?.risks?.length && (
              <Section title="RISKS" items={explainerExtra.risks} tone="risk" />
            )}
            {!!explainerExtra?.waiting_for?.length && (
              <Section title="WHAT WE ARE WAITING FOR" items={explainerExtra.waiting_for} tone="wait" />
            )}
            {!!explainerExtra?.invalidation?.length && (
              <Section title="WHAT INVALIDATES THE SIGNAL" items={explainerExtra.invalidation} tone="risk" />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, items, tone }: { title: string; items: string[]; tone: "good" | "risk" | "wait" }) {
  const mark = tone === "good" ? "✓" : tone === "risk" ? "⚠" : "•";
  const color = tone === "good" ? "text-emerald-300" : tone === "risk" ? "text-amber-300" : "text-sky-300";
  return (
    <div className="mb-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <ul className="space-y-1 text-sm text-slate-200">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className={color}>{mark}</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OpportunityRow({ item, rank }: { item: BybitFeature; rank: number }) {
  const c = item.changes || {};
  return (
    <div className="card group grid grid-cols-1 gap-3 p-3 transition hover:border-violet-400/30 xl:grid-cols-[1.2fr_1.4fr_1fr_0.9fr]">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-500/10 px-2 py-1 text-xs font-semibold text-violet-200">#{rank}</div>
        <div>
          <Link href={`/token/${item.symbol}`} className="text-sm font-semibold hover:text-violet-200">
            {item.base} / {item.quote || "USDT"}
          </Link>
          <div className="mt-1 font-mono text-xs text-slate-400">{item.symbol}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="text-slate-300">${fmt(item.price, item.price && item.price < 1 ? 6 : 2)}</span>
            <span className={cn((item.price_24h_pcnt || 0) >= 0 ? "text-emerald-300" : "text-rose-300")}>
              24h {fmtPct(item.price_24h_pcnt)}
            </span>
            <DataAge age={item.data_age_seconds} status={item.data_status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
        <Metric label="10s" value={fmtPct(c["10s"])} />
        <Metric label="1m" value={fmtPct(c["1m"])} />
        <Metric label="5m" value={fmtPct(c["5m"])} />
        <Metric label="15m" value={fmtPct(c["15m"])} />
        <Metric label="Vol Accel" value={fmtPct(item.volume_acceleration, 0)} />
        <Metric label="Imbalance" value={item.orderbook_imbalance == null ? "—" : item.orderbook_imbalance.toFixed(2)} />
      </div>

      <div className="flex items-center gap-3">
        <MiniSpark values={item.sparkline || []} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="Opp" value={fmt(item.opportunity_score, 0)} />
          <Metric label="Entry" value={fmt(item.entry_quality, 0)} />
          <Metric label="Conf" value={item.confidence == null ? "—" : `${fmt(item.confidence, 0)}%`} />
          <Metric label="Chase" value={fmt(item.chase_risk, 0)} />
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-2 xl:items-end">
        <StatusChip
          status={item.status}
          explainerExtra={{
            why: item.why,
            risks: item.risks,
            waiting_for: item.waiting_for,
            invalidation: item.invalidation,
          }}
        />
        <div className="text-[11px] text-slate-400">Phase · {item.phase || "UNKNOWN"}</div>
        <Link href={`/token/${item.symbol}`} className="text-xs text-violet-300 hover:underline">
          Open analysis →
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-black/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-[11px]">{value}</div>
    </div>
  );
}

export function DataAge({ age, status }: { age?: number | null; status?: string }) {
  if (status === "STALE") {
    return <span className="text-amber-300">STALE · {age != null ? `${Math.round(age)}s` : "—"}</span>;
  }
  if (status === "INSUFFICIENT" || age == null) {
    return <span className="text-slate-500">DATA AGE · —</span>;
  }
  return <span className="text-emerald-300">LIVE · {Math.max(0, Math.round(age * 1000))}ms</span>;
}

export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
