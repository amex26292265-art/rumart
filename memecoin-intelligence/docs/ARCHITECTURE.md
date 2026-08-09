# MEMECOIN INTELLIGENCE — Architecture

**Status:** Phase 1 foundation  
**Mode:** PAPER TRADING ONLY (live execution is a future, explicitly gated module)  
**Principle:** Decision support with evidence. Never invent data. Never claim certainty.

---

## 1. Purpose

A local intelligence system that continuously discovers very new Solana memecoins, analyzes market/on-chain/wallet/social/news/risk signals, ranks opportunities, explains decisions, and paper-trades qualified signals for strategy evaluation.

This is **not** a guaranteed-profit machine.

---

## 2. High-Level Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Frontend | Next.js 15 + TypeScript | Typed UI, App Router, fast local DX |
| Backend | Python FastAPI | Strong for async ingestion, ML later, WS fan-out |
| Primary DB | PostgreSQL 16 | Immutable signal snapshots, relational analytics |
| Cache / pub-sub | Redis 7 | Hot token state, WS fan-out, rate-limit counters |
| Realtime | FastAPI WebSockets → frontend | Live dashboard updates |
| Containers | Docker Compose | One-command local bring-up |

**Stack deviation note:** None for Phase 1. If a component changes later, document the reason here before changing.

---

## 3. Repository Layout

```
memecoin-intelligence/
├── docs/                      # Architecture, data sources, scoring, risk, roadmap
├── backend/                   # FastAPI application
│   ├── app/
│   │   ├── api/               # REST + WebSocket routes
│   │   ├── core/              # Config, logging, resilience primitives
│   │   ├── db/                # SQLAlchemy models, session, migrations
│   │   ├── domain/            # Pure domain types (scores, decisions, provenance)
│   │   ├── engines/           # Momentum, risk, scoring, decision, paper trading
│   │   ├── providers/         # Abstract adapters + concrete implementations
│   │   ├── services/          # Orchestration (discovery, analysis, alerts)
│   │   └── workers/           # Background ingestion loops
│   ├── tests/
│   └── alembic/
├── frontend/                  # Next.js dashboard
│   ├── src/app/
│   ├── src/components/
│   ├── src/lib/
│   └── src/hooks/
├── scripts/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Core Design Principles

### 4.1 Evidence over vibes
Every numeric claim and every decision must be backed by stored evidence with:
- `source`
- `source_timestamp`
- `ingestion_timestamp`
- `age_seconds`
- `reliability`
- `mint` (when applicable)

If critical data is missing/stale → **DATA INSUFFICIENT** / **STALE** / **UNKNOWN**. Never guess.

### 4.2 Separation of concerns
| Concern | Owner |
| --- | --- |
| Market numbers | Deterministic providers + engines |
| Narrative/semantics | LLM (structured inputs only) |
| Risk gates | Risk engine (hard vetoes) |
| Opportunity score | Scoring engine (configurable weights) |
| Confidence | Separate confidence engine |
| Paper fills | Paper trading engine (fees + slippage) |
| Live execution | **Not present.** Future `execution/` module, disabled by default |

### 4.3 No look-ahead bias
At time `T`, only information available at `T` may be used. Signal snapshots are immutable. Forward performance is computed later against subsequent market observations.

### 4.4 Provider abstraction
All external systems hide behind interfaces:
- `MarketDataProvider`
- `OnChainProvider`
- `TokenDiscoveryProvider`
- `SocialProvider`
- `NewsProvider`
- `WalletIntelligenceProvider`
- `LLMProvider`

Concrete vendors are swappable. API keys live only in `.env`.

### 4.5 Axiom policy
As of research date (2026-08-09):
- **Official Axiom product docs** exist at https://docs.axiom.trade (trader UX docs).
- **No official public developer API** is documented by Axiom for third-party market data ingestion.
- Community SDKs that scrape browser cookies / automate login are **out of scope and forbidden**.
- Dashboard provides **COPY CONTRACT ADDRESS** and a link to the documented Axiom Pulse page (`https://axiom.trade/pulse`). If Axiom later documents a mint deep-link format, add an adapter then.

Equivalent market/on-chain data comes from DexScreener, Helius, Jupiter, PumpPortal (public data WS), Solana RPC, Birdeye (optional paid), etc.

---

## 5. Runtime Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  Breaking Narratives | Opportunities | New Tokens | Smart Money │
│  Danger/Rejected | Paper Portfolio | Health | Token Detail      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST + WebSocket
┌───────────────────────────────▼─────────────────────────────────┐
│                         FastAPI API LAYER                        │
│  /api/v1/*  /ws  /health                                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  PostgreSQL   │     │      Redis      │     │ Ingestion Workers│
│  tokens       │     │  hot state      │     │ discovery        │
│  snapshots    │     │  pub/sub        │     │ market refresh   │
│  signals      │     │  rate limits    │     │ social/news      │
│  paper trades │     │  circuit break  │     │ wallet analysis  │
└───────────────┘     └─────────────────┘     └────────┬────────┘
                                                       │
                              ┌────────────────────────┴────────────┐
                              ▼                                     ▼
                    Provider Interfaces                    Engines
                    (DexScreener, Helius, …)     (risk, score, decide, paper)
```

---

## 6. Data Flow (happy path)

1. **Discovery worker** receives a new mint (PumpPortal WS / DexScreener profiles / Helius).
2. Persist token shell + provenance; publish `token.new` to Redis.
3. **Market refresh** hydrates liquidity, volume, txns, holders (with timestamps).
4. **Risk engine** runs hard safety checks → PASS / CAUTION / HIGH RISK / REJECT.
5. **Momentum + wallet + social + narrative** engines compute features (may be UNKNOWN).
6. **Opportunity + confidence + entry quality** computed; decision emitted.
7. Immutable **signal snapshot** stored.
8. If decision qualifies and paper mode allows → **paper trade** opened with fees/slippage.
9. Dashboard receives live WS events; alerts fire only on meaningful state transitions.

---

## 7. Decision Outputs

| Status | Meaning |
| --- | --- |
| REJECT | Failed critical safety / manipulation filters |
| INSUFFICIENT DATA | Missing/stale critical evidence |
| WATCH | Interesting but not actionable |
| WAIT | Token interesting; entry not ready |
| CONSIDER ENTRY | Multi-signal setup + acceptable risk + entry quality |
| HOLD / MONITOR | Open paper position; thesis intact |
| TAKE PARTIAL PROFIT | Exit engine recommends trimming |
| REDUCE EXPOSURE | Risk rising; reduce size |
| EXIT SIGNAL | Thesis invalidated |

Never emit BUY GUARANTEED / WILL PUMP / 100% confidence.

---

## 8. Security

- Never request seed phrases / private keys.
- Paper trading needs no wallet secrets.
- Secrets only in `.env` (never committed).
- Sanitize token metadata / social / news before UI and before LLM prompts.
- Prompt-injection isolation: untrusted text is data, never instructions.
- Live trading module must be separately enabled and architecturally isolated.

---

## 9. Resilience

- Exponential backoff retries
- Circuit breakers per provider
- Deduplication of events
- Staleness checks on every read path
- Structured JSON logging
- Health panel for providers, DB, Redis, WS, event rates

On provider failure: surface **DATA INSUFFICIENT** / **STALE**, never fabricate fillers.

---

## 10. Phase 1 Scope (this delivery)

Implemented now:
- Monorepo scaffold under `memecoin-intelligence/`
- Docs: ARCHITECTURE, DATA_SOURCES, SCORING, RISK_MODEL, ROADMAP
- `.env.example`
- FastAPI app with health, tokens, opportunities, paper portfolio, WS hub
- SQLAlchemy models + Alembic baseline
- Provider interfaces + stub/mock providers (no fabricated “live” claims)
- Deterministic scoring/decision engines with explainable contributions
- Next.js dark dashboard shell with live WS wiring
- Docker Compose (Postgres + Redis + API + frontend)
- Unit tests for scoring, risk, paper trading, look-ahead guards

Deferred to later phases: live discovery, full wallet graph, X/news NLP, ML training, alerts adapters, live execution.
