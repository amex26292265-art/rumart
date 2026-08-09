# MEMECOIN INTELLIGENCE — Roadmap

Build incrementally. After every phase: run tests, fix errors, document config, commit.

---

## PHASE 1 — Architecture + database + backend + frontend ✅ (this delivery)

- Architecture / data sources / scoring / risk docs
- `.env.example` + folder structure
- FastAPI + PostgreSQL + Redis scaffold
- Provider interfaces + mocks
- Deterministic scoring / risk / decision engines
- Next.js dark dashboard shell + WebSocket
- Docker Compose
- Unit tests (scoring, risk, paper, look-ahead)

## PHASE 2 — Live Solana token discovery + market data

- PumpPortal new-token WS
- DexScreener hydration
- Jupiter prices
- Helius metadata
- Event-driven refresh + staleness

## PHASE 3 — Risk / safety engine (live)

- Authority / extension checks
- Concentration / liquidity disappearance
- Bundle heuristics from real trade streams
- Reject feed wired to live classifications

## PHASE 4 — Wallet intelligence

- Buyer/seller graphs
- Historical PnL proxies from available APIs
- Smart Money Confidence
- Deployer linkage

## PHASE 5 — Momentum / opportunity scoring (live features)

- Velocity/acceleration time series
- Cross-signal confirmation
- Contribution breakdowns on live tokens

## PHASE 6 — Paper trading ($40 challenge)

- $40 starting equity, $5 default max position
- Fees / slippage / impact model
- Exit engine + strategy presets
- Portfolio metrics (Sharpe-like, drawdown, expectancy)

## PHASE 7 — News + narratives

- GDELT / RSS / CryptoPanic ingestion
- Dedup + original source preference
- Narrative scores + token semantic matching

## PHASE 8 — X / social intelligence

- Official X API only
- Bot/spam/coordination metrics
- Organic vs manufactured classification

## PHASE 9 — LLM explanation layer

- Structured evidence → explanations
- Prompt-injection isolation
- No numeric invention

## PHASE 10 — Alerts

- Desktop notifications
- Adapters: Telegram / Discord / email
- State-change only (anti-spam)

## PHASE 11 — Historical evaluation / ML

- Forward performance jobs
- Baseline classifiers
- Calibration + PnL-centric evaluation

## PHASE 12 — Optimization & reliability

- Circuit breakers tuning
- Provider failover
- Weight learning from paper dataset
- Performance / observability hardening

---

## Explicitly out of scope until separate enablement

- Real-money trade execution
- Private key / seed handling
- Undocumented Axiom API usage
