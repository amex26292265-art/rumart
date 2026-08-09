"""In-memory app state for Phase 1 (DB optional when Postgres unavailable)."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.config import Settings, get_settings
from app.engines.paper import PaperConfig, PaperTradingEngine
from app.providers.disabled import (
    DisabledDiscoveryProvider,
    DisabledMarketDataProvider,
    DisabledNewsProvider,
    DisabledOnChainProvider,
    DisabledSocialProvider,
    DisabledWalletProvider,
    TemplateLLMProvider,
)
from app.providers.bybit import bybit_service
from app.services.scenarios import build_scenarios, narrative_scenarios


class AppState:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.tokens: list[dict[str, Any]] = []
        self.narratives: list[dict[str, Any]] = []
        self.paper = PaperTradingEngine(
            PaperConfig(
                starting_balance_usd=self.settings.paper_starting_balance_usd,
                max_position_usd=self.settings.paper_max_position_usd,
                max_open_positions=self.settings.paper_max_open_positions,
            )
        )
        self.ws_clients: set[Any] = set()
        self.events_per_minute: float = 0.0
        self.db_ok: bool | None = None
        self.redis_ok: bool | None = None
        self.bybit = bybit_service
        self.providers = {
            "market": DisabledMarketDataProvider(),
            "onchain": DisabledOnChainProvider(),
            "discovery": DisabledDiscoveryProvider(),
            "social": DisabledSocialProvider(),
            "news": DisabledNewsProvider(),
            "wallet": DisabledWalletProvider(),
            "llm": TemplateLLMProvider(),
            "bybit": bybit_service,
        }
        self._lock = asyncio.Lock()
        self.signal_history: list[dict[str, Any]] = []
        self.watchlist: set[str] = set()
        self.alerts: list[dict[str, Any]] = []

    def load_scenarios(self) -> None:
        if self.settings.seed_demo_scenarios:
            self.tokens = build_scenarios()
            self.narratives = narrative_scenarios()
        else:
            self.tokens = []
            self.narratives = []

    async def broadcast(self, message: dict[str, Any]) -> None:
        dead = []
        for ws in list(self.ws_clients):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.ws_clients.discard(ws)

    def opportunities(self) -> list[dict[str, Any]]:
        rows = [
            t
            for t in self.tokens
            if t.get("bucket") == "opportunity"
            and t.get("analysis", {}).get("decision") != "REJECT"
            and t.get("analysis", {}).get("safety_class") != "REJECT"
        ]
        rows.sort(key=lambda t: t.get("analysis", {}).get("opportunity_score") or -1, reverse=True)
        return rows

    def rejected(self) -> list[dict[str, Any]]:
        return [t for t in self.tokens if t.get("bucket") == "rejected"]

    def new_tokens(self) -> list[dict[str, Any]]:
        return list(self.tokens)

    def axiom_link(self, mint: str) -> dict[str, str | None]:
        deep = None
        tmpl = self.settings.axiom_mint_deep_link_template.strip()
        if tmpl:
            # Only if operator explicitly configures a documented template later
            deep = tmpl.replace("{mint}", mint)
        return {
            "pulse_url": self.settings.axiom_pulse_url,
            "mint_deep_link": deep,
            "copy_mint": mint,
            "note": "Official Axiom docs do not document a mint deep-link; use Copy CA + Pulse.",
        }


state = AppState()
