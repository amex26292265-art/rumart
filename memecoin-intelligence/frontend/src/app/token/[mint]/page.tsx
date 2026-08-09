"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE, TokenRow, apiGet, copyText, decisionClass, fmt } from "@/lib/api";

type Detail = {
  token: TokenRow;
  axiom: { pulse_url: string; mint_deep_link: string | null; copy_mint: string; note: string };
  explanation: { text: string; evidence_ids: string[] };
  why_now: string[];
  what_would_change_decision: string[];
};

export default function TokenDetailPage() {
  const params = useParams<{ mint: string }>();
  const mint = decodeURIComponent(params.mint);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paperMsg, setPaperMsg] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Detail>(`/tokens/${encodeURIComponent(mint)}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"));
  }, [mint]);

  async function openPaper() {
    setPaperMsg(null);
    const res = await fetch(`${API_BASE}/portfolio/paper/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mint }),
    });
    const body = await res.json();
    if (body.error) setPaperMsg(`${body.error}: ${body.detail || ""}`);
    else setPaperMsg(`Opened paper position ${body.position_id}`);
  }

  if (error) {
    return (
      <main className="shell">
        <p className="muted">{error}</p>
        <Link href="/">← Back</Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="shell">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const t = data.token;
  const a = t.analysis || {};

  return (
    <main className="shell">
      <p>
        <Link href="/">← Dashboard</Link>
      </p>
      <header className="topbar">
        <div>
          <div className="brand">
            {t.symbol} <span className="muted">{t.name}</span>
          </div>
          <p className="sub mono">{t.mint}</p>
        </div>
        <div className="badge-row">
          <span className={`pill ${decisionClass(a.decision) === "good" ? "ok" : decisionClass(a.decision) === "bad" ? "danger" : "warn"}`}>
            {a.decision}
          </span>
          {t.data_source === "mock.scenario" && <span className="pill warn">SCENARIO DATA</span>}
        </div>
      </header>

      <div className="grid">
        <section className="section">
          <h2>Scores</h2>
          <div className="metrics">
            <div className="metric">
              <div className="k">Opportunity</div>
              <div className="v">{fmt(a.opportunity_score, 0)}</div>
            </div>
            <div className="metric">
              <div className="k">Confidence</div>
              <div className="v">{a.confidence != null ? `${fmt(a.confidence, 0)}%` : "—"}</div>
            </div>
            <div className="metric">
              <div className="k">Risk</div>
              <div className="v">{fmt(a.risk_score, 0)}</div>
            </div>
            <div className="metric">
              <div className="k">Entry</div>
              <div className="v">{fmt(a.entry_quality, 0)}</div>
            </div>
          </div>
          <p>
            Entry status: <strong>{a.entry_status || "UNKNOWN"}</strong> · Momentum:{" "}
            <strong>{a.momentum_state || "UNKNOWN"}</strong> · Safety:{" "}
            <strong>{a.safety_class || "UNKNOWN"}</strong>
          </p>
        </section>

        <section className="section">
          <h2>Why Now?</h2>
          <ul>
            {(data.why_now || []).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <h2>What Would Change The Decision?</h2>
          <ul>
            {(data.what_would_change_decision || []).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <h2>Risks</h2>
          <ul>
            {(a.risks || []).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2>AI Explanation</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
            {data.explanation.text}
          </pre>
        </section>

        <section className="section">
          <h2>Actions</h2>
          <button className="btn" type="button" onClick={() => copyText(t.mint)}>
            Copy Contract Address
          </button>{" "}
          <a className="btn ghost" href={data.axiom.pulse_url} target="_blank" rel="noreferrer">
            Open in Axiom (Pulse)
          </a>{" "}
          <button className="btn" type="button" onClick={openPaper}>
            Paper Trade ($5 max)
          </button>
          <p className="muted">{data.axiom.note}</p>
          {paperMsg && <p>{paperMsg}</p>}
        </section>

        <section className="section">
          <h2>Feature Contributions</h2>
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Weight</th>
                  <th>Raw</th>
                  <th>Weighted</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {a.contributions && a.contributions.length > 0 ? (
                  a.contributions.map((c) => (
                    <tr key={c.factor}>
                      <td>{c.factor}</td>
                      <td className="mono">{c.weight == null ? "—" : String(c.weight)}</td>
                      <td className="mono">{String(c.raw)}</td>
                      <td className="mono">{String(c.weighted)}</td>
                      <td className="muted">{c.note || ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="muted">
                      No contributions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
