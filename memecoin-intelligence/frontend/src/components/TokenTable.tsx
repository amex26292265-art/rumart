"use client";

import Link from "next/link";
import { TokenRow, copyText, decisionClass, fmt } from "@/lib/api";

export function TokenTable({
  rows,
  showRank = false,
}: {
  rows: TokenRow[];
  showRank?: boolean;
}) {
  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            {showRank && <th>Rank</th>}
            <th>Token</th>
            <th>Age</th>
            <th>Price</th>
            <th>MCap</th>
            <th>Liq</th>
            <th>5m Vol</th>
            <th>Buy/Sell</th>
            <th>Uniq Buy</th>
            <th>Mom</th>
            <th>Social</th>
            <th>Wallet</th>
            <th>Risk</th>
            <th>Opp</th>
            <th>Conf</th>
            <th>Entry</th>
            <th>Status</th>
            <th>Axiom</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showRank ? 18 : 17} className="muted">
                No tokens in this feed yet.
              </td>
            </tr>
          ) : (
            rows.map((t, i) => {
              const a = t.analysis || {};
              return (
                <tr key={t.mint}>
                  {showRank && <td>{i + 1}</td>}
                  <td>
                    <Link href={`/token/${t.mint}`}>
                      <strong>{t.symbol || "???"}</strong>
                      <div className="muted mono">{t.name}</div>
                    </Link>
                    {t.data_source === "mock.scenario" && (
                      <div className="muted" style={{ fontSize: "0.7rem" }}>
                        SCENARIO
                      </div>
                    )}
                  </td>
                  <td>{t.age_minutes != null ? `${fmt(t.age_minutes, 0)}m` : "—"}</td>
                  <td className="mono">{fmt(t.price_usd, 6)}</td>
                  <td className="mono">{fmt(t.market_cap_usd, 0)}</td>
                  <td className="mono">{fmt(t.liquidity_usd, 0)}</td>
                  <td className="mono">{fmt(t.volume_5m, 0)}</td>
                  <td className="mono">
                    {t.buys != null && t.sells != null ? `${t.buys}/${t.sells}` : "—"}
                  </td>
                  <td className="mono">{t.unique_buyers ?? "—"}</td>
                  <td>{a.momentum_state || t.momentum_label || "—"}</td>
                  <td>{t.social_label || "—"}</td>
                  <td>{t.wallet_label || "—"}</td>
                  <td className="mono">{fmt(a.risk_score, 0)}</td>
                  <td className="mono">{fmt(a.opportunity_score, 0)}</td>
                  <td className="mono">{a.confidence != null ? `${fmt(a.confidence, 0)}%` : "—"}</td>
                  <td className="mono">{fmt(a.entry_quality, 0)}</td>
                  <td className={`status ${decisionClass(a.decision)}`}>{a.decision || "—"}</td>
                  <td>
                    <button className="btn" type="button" onClick={() => copyText(t.mint)}>
                      Copy CA
                    </button>{" "}
                    <a className="btn ghost" href="https://axiom.trade/pulse" target="_blank" rel="noreferrer">
                      Open Pulse
                    </a>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
