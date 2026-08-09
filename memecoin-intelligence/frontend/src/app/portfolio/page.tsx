"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/ui/OpportunityRow";
import { apiGet, fmt } from "@/lib/api";

export default function PortfolioPage() {
  const [data, setData] = useState<{ metrics: Record<string, number | null>; positions: Array<Record<string, unknown>> } | null>(
    null,
  );
  useEffect(() => {
    const load = () => apiGet<typeof data extends infer T ? NonNullable<T> : never>("/portfolio/paper").then(setData);
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);
  const m = data?.metrics || {};
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Portfolio</h1>
      <p className="text-sm text-slate-400">Configurable paper capital starts at $500. No automatic allocation of the full balance.</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <KpiCard label="Cash" value={`$${fmt(m.balance)}`} />
        <KpiCard label="Equity" value={`$${fmt(m.equity)}`} />
        <KpiCard label="Realized" value={`$${fmt(m.realized_pnl)}`} />
        <KpiCard label="Fees" value={`$${fmt(m.fees_paid)}`} />
        <KpiCard label="Open" value={fmt(m.open_positions, 0)} />
      </div>
      <div className="card overflow-x-auto p-3">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase text-slate-500">
            <tr>
              <th className="py-2">Symbol</th>
              <th>Qty</th>
              <th>Entry</th>
              <th>Status</th>
              <th>Realized</th>
            </tr>
          </thead>
          <tbody>
            {(data?.positions || []).map((p) => (
              <tr key={String(p.id)} className="border-t border-[var(--border)]">
                <td className="py-2 font-medium">{String(p.symbol)}</td>
                <td className="font-mono">{fmt(Number(p.qty), 6)}</td>
                <td className="font-mono">{fmt(Number(p.entry_price), 6)}</td>
                <td>{String(p.status)}</td>
                <td className="font-mono">{p.realized_pnl == null ? "—" : fmt(Number(p.realized_pnl))}</td>
              </tr>
            ))}
            {!data?.positions?.length && (
              <tr>
                <td colSpan={5} className="py-6 text-slate-400">
                  No open positions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
