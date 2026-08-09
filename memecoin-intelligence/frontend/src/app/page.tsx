"use client";

import { useCallback, useEffect, useState } from "react";
import { TokenTable } from "@/components/TokenTable";
import { useLiveSocket } from "@/hooks/useLiveSocket";
import {
  API_BASE,
  Health,
  PaperPortfolio,
  TokenRow,
  apiGet,
  fmt,
} from "@/lib/api";

type Narrative = {
  id: string;
  title: string;
  narrative_score: number;
  summary: string;
  link_class: string;
  source: string;
};

export default function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [opps, setOpps] = useState<TokenRow[]>([]);
  const [news, setNews] = useState<TokenRow[]>([]);
  const [rejected, setRejected] = useState<TokenRow[]>([]);
  const [smart, setSmart] = useState<Array<Record<string, string>>>([]);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [paper, setPaper] = useState<PaperPortfolio | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [h, o, n, r, s, nar, p] = await Promise.all([
        apiGet<Health>("/health"),
        apiGet<{ items: TokenRow[] }>("/tokens/opportunities"),
        apiGet<{ items: TokenRow[] }>("/tokens/new"),
        apiGet<{ items: TokenRow[] }>("/tokens/rejected"),
        apiGet<{ items: Array<Record<string, string>> }>("/smart-money"),
        apiGet<{ items: Narrative[] }>("/narratives/breaking"),
        apiGet<PaperPortfolio>("/portfolio/paper"),
      ]);
      setHealth(h);
      setOpps(o.items);
      setNews(n.items);
      setRejected(r.items);
      setSmart(s.items);
      setNarratives(nar.items);
      setPaper(p);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load API");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const { connected } = useLiveSocket(() => {
    // refresh on meaningful events
    void refresh();
  });

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">Memecoin Intelligence</div>
          <p className="sub">
            Local decision-support for fresh Solana memecoins. Paper trading only. Evidence required —
            missing data shows as INSUFFICIENT, never invented.
          </p>
        </div>
        <div className="badge-row">
          <span className="pill ok">PAPER MODE</span>
          <span className={`pill ${connected ? "ok" : "warn"}`}>
            WS {connected ? "LIVE" : "RECONNECTING"}
          </span>
          <span className={`pill ${health?.status === "ok" ? "ok" : "warn"}`}>
            API {health?.status?.toUpperCase() || "…"}
          </span>
          {health?.analysis_quality_warning && (
            <span className="pill warn">ANALYSIS DEGRADED</span>
          )}
        </div>
      </header>

      {error && (
        <section className="section" style={{ borderColor: "rgba(226,92,92,0.5)" }}>
          <h2>API unreachable</h2>
          <p className="muted">
            {error}. Expected backend at <span className="mono">{API_BASE}</span>
          </p>
        </section>
      )}

      <div className="grid">
        <section className="section">
          <h2>Breaking Narratives</h2>
          {narratives.length === 0 ? (
            <p className="muted">No narratives yet.</p>
          ) : (
            narratives.map((n) => (
              <div key={n.id} style={{ marginBottom: "0.8rem" }}>
                <strong>{n.title}</strong>
                <div className="muted">
                  Score {n.narrative_score} · {n.link_class} · source {n.source}
                </div>
                <div>{n.summary}</div>
              </div>
            ))
          )}
        </section>

        <section className="section">
          <h2>Top Opportunities Now</h2>
          <TokenTable rows={opps} showRank />
        </section>

        <section className="section">
          <h2>New Tokens</h2>
          <TokenTable rows={news} />
        </section>

        <section className="section">
          <h2>Smart Money Activity</h2>
          {smart.length === 0 ? (
            <p className="muted">No smart-money labels available.</p>
          ) : (
            <ul>
              {smart.map((s) => (
                <li key={s.mint}>
                  <strong>{s.symbol}</strong> — {s.label}
                  <div className="muted">{s.note}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section">
          <h2>Danger / Rejected</h2>
          <TokenTable rows={rejected} />
        </section>

        <section className="section">
          <h2>Paper Portfolio</h2>
          {paper ? (
            <>
              <div className="metrics">
                <div className="metric">
                  <div className="k">Balance</div>
                  <div className="v">${fmt(paper.metrics.balance)}</div>
                </div>
                <div className="metric">
                  <div className="k">Equity</div>
                  <div className="v">${fmt(paper.metrics.equity)}</div>
                </div>
                <div className="metric">
                  <div className="k">Realized</div>
                  <div className="v">${fmt(paper.metrics.realized_pnl)}</div>
                </div>
                <div className="metric">
                  <div className="k">Fees</div>
                  <div className="v">${fmt(paper.metrics.fees_paid)}</div>
                </div>
                <div className="metric">
                  <div className="k">Open</div>
                  <div className="v">{paper.metrics.open_positions ?? 0}</div>
                </div>
                <div className="metric">
                  <div className="k">Win rate</div>
                  <div className="v">
                    {paper.metrics.win_rate == null ? "—" : `${fmt((paper.metrics.win_rate || 0) * 100, 0)}%`}
                  </div>
                </div>
              </div>
              <p className="muted">
                Starting $40 challenge simulation. Max position ${fmt(5, 0)}. No live execution.
              </p>
            </>
          ) : (
            <p className="muted">Portfolio unavailable.</p>
          )}
        </section>

        <section className="section">
          <h2>Health</h2>
          <div className="metrics">
            <div className="metric">
              <div className="k">Database</div>
              <div className="v">{health?.database || "—"}</div>
            </div>
            <div className="metric">
              <div className="k">Redis</div>
              <div className="v">{health?.redis || "—"}</div>
            </div>
            <div className="metric">
              <div className="k">WS clients</div>
              <div className="v">{health?.websocket_clients ?? "—"}</div>
            </div>
            <div className="metric">
              <div className="k">Tokens</div>
              <div className="v">{health?.tokens_monitored ?? "—"}</div>
            </div>
          </div>
          {!!health?.degraded_components?.length && (
            <p className="muted">Degraded: {health.degraded_components.join(", ")}</p>
          )}
        </section>
      </div>

      <p className="disclaimer">
        Scenario rows are explicitly labeled <span className="mono">mock.scenario</span> and are not live
        chain data. Axiom has no documented public developer API as of research; use Copy CA + Pulse.
        Never share seed phrases. Not financial advice.
      </p>
    </main>
  );
}
