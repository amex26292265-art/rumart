# MEMECOIN INTELLIGENCE V2

Professional local decision-support terminal for Solana memecoins + **Bybit Spot** scanning.

**Paper trading only.** Never invents data. Never claims certainty.

## Quick start

```bash
cd memecoin-intelligence
cp .env.example .env
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# frontend (other terminal)
cd frontend && npm install && npm run dev
```

- Dashboard: http://localhost:3001
- API: http://localhost:8000/docs

Or: `docker compose up --build`

## V2 highlights

- Rebuilt dark trading-terminal UI (sidebar, top bar, KPI cards, opportunity rows, radar/charts)
- Clickable status explainers (CONSIDER ENTRY / DO NOT CHASE / etc.)
- Live **Bybit Spot** public WebSocket scanner (no API secret)
- Fast Movers ranked by short-horizon acceleration (not 24h % alone)
- Opportunity score **separate** from Entry Quality + Chase Risk
- Production dashboard disables mock scenario tokens (`SEED_DEMO_SCENARIOS=false`)

## Bybit note

Official REST (`api.bybit.com`) can be geo-blocked in some cloud regions (HTTP 403) while public WebSocket still works. In that case discovery falls back to documented CoinGecko `bybit_spot` exchange tickers, then prices stream from Bybit WS. Provenance is labeled.

## Docs

See `docs/` for architecture, data sources, scoring, risk, and roadmap.
