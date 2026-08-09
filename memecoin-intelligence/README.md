# MEMECOIN INTELLIGENCE

Local decision-support system for discovering and analyzing very new Solana memecoins.

**Paper trading only.** Never invents data. Never claims certainty. Live execution is not included.

This application lives under `memecoin-intelligence/` inside the repository (alongside the existing Rumart marketplace; the two are independent).

## Quick start

```bash
cd memecoin-intelligence
cp .env.example .env
docker compose up --build
```

- Dashboard: http://localhost:3001
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

Without Docker (API only):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
pnpm install
pnpm dev
```

## Documentation

| Doc | Path |
| --- | --- |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Data sources | [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) |
| Scoring | [docs/SCORING.md](docs/SCORING.md) |
| Risk model | [docs/RISK_MODEL.md](docs/RISK_MODEL.md) |
| Roadmap | [docs/ROADMAP.md](docs/ROADMAP.md) |

## Folder structure

```
memecoin-intelligence/
├── docs/
├── backend/app/{api,core,db,domain,engines,providers,services,workers}
├── backend/tests/
├── frontend/src/{app,components,hooks,lib}
├── scripts/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Phase 1 status

- Architecture + provider interfaces
- PostgreSQL models + Redis wiring
- Deterministic risk / score / decision / paper engines
- Dark dashboard shell with WebSocket live updates
- Scenario fixtures labeled as `mock.scenario` (never presented as live chain data)

Live discovery, wallet graph, social/news NLP, and ML training arrive in later phases (see ROADMAP).

## Non-negotiables

- No seed phrases / private keys
- No automatic real-money trades
- No undocumented Axiom API
- Missing/stale data → INSUFFICIENT / STALE / UNKNOWN
