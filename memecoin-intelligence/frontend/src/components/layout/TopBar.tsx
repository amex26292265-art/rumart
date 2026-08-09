"use client";

import { Bell, Settings, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { API_BASE, apiGet, cn } from "@/lib/api";

type Health = {
  status: string;
  bybit?: { ws_ok?: boolean; rest_ok?: boolean; status?: string };
  providers?: Record<string, { status?: string }>;
};

function LivePill({ label, ok, unknown }: { label: string; ok?: boolean; unknown?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        unknown
          ? "border-slate-500/30 text-slate-300"
          : ok
            ? "border-emerald-500/30 text-emerald-300"
            : "border-amber-500/30 text-amber-300",
      )}
    >
      <span className={cn("live-dot", !ok && !unknown && "bg-amber-400", unknown && "bg-slate-400")} />
      {label}
    </span>
  );
}

export function TopBar() {
  const [health, setHealth] = useState<Health | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = () => apiGet<Health>("/health").then(setHealth).catch(() => setHealth(null));
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const bybitLive = !!health?.bybit?.ws_ok;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[#070b12]/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight">Real-time Solana Memecoin Intelligence & Paper Trading</div>
          <form
            className="mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!q.trim()) return;
              window.location.href = `/token/${encodeURIComponent(q.trim().toUpperCase())}`;
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search token / ticker / contract / narrative..."
              className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[#0e1520] px-3 py-2 text-sm outline-none ring-violet-400/30 placeholder:text-slate-500 focus:ring-2"
            />
          </form>
        </div>
        <div className="hidden flex-wrap items-center justify-end gap-2 lg:flex">
          <LivePill label="MARKET LIVE" ok={health?.status === "ok" || bybitLive} unknown={!health} />
          <LivePill label="BYBIT LIVE" ok={bybitLive} unknown={!health} />
          <LivePill label="SOCIAL LIVE" ok={false} unknown />
          <LivePill label="AI ACTIVE" ok />
        </div>
        <button className="rounded-lg border border-[var(--border)] p-2 text-slate-300 hover:bg-white/5" title="Notifications">
          <Bell size={16} />
        </button>
        <a
          href={`${API_BASE}/health`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[var(--border)] p-2 text-slate-300 hover:bg-white/5"
          title="System health"
        >
          <Activity size={16} />
        </a>
        <a href="/settings" className="rounded-lg border border-[var(--border)] p-2 text-slate-300 hover:bg-white/5" title="Settings">
          <Settings size={16} />
        </a>
      </div>
    </header>
  );
}
