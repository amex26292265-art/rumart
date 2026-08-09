"""Abstract provider interfaces — vendor-agnostic."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.core.resilience import Provenance


@dataclass
class MarketSnapshot:
    mint: str
    price_usd: float | None
    market_cap_usd: float | None
    fdv_usd: float | None
    liquidity_usd: float | None
    volume_1m: float | None = None
    volume_5m: float | None = None
    volume_15m: float | None = None
    volume_1h: float | None = None
    buys: int | None = None
    sells: int | None = None
    txns: int | None = None
    price_change_5m: float | None = None
    pair_address: str | None = None
    dex: str | None = None
    provenance: Provenance | None = None


@dataclass
class DiscoveredToken:
    mint: str
    name: str | None
    symbol: str | None
    launch_platform: str | None
    created_at: datetime | None
    bonding_curve_status: str | None = None
    migration_status: str | None = None
    deployer: str | None = None
    provenance: Provenance | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class OnChainTokenInfo:
    mint: str
    decimals: int | None
    supply: float | None
    mint_authority: str | None
    freeze_authority: str | None
    holder_count: int | None = None
    top_holder_pct: list[float] = field(default_factory=list)
    provenance: Provenance | None = None
    extensions: dict[str, Any] = field(default_factory=dict)


@dataclass
class SocialSnapshot:
    mint: str | None
    query: str
    mention_count: int | None
    unique_authors: int | None
    mentions_per_minute: float | None
    engagement: float | None
    bot_likelihood: float | None
    authenticity: str
    provenance: Provenance | None = None


@dataclass
class NewsItem:
    title: str
    url: str
    published_at: datetime | None
    source_name: str
    summary: str | None = None
    original_source_url: str | None = None
    provenance: Provenance | None = None


@dataclass
class WalletProfile:
    address: str
    classification: str
    smart_money_confidence: float | None
    realized_pnl: float | None = None
    win_rate: float | None = None
    prior_tokens_traded: int | None = None
    provenance: Provenance | None = None
    notes: list[str] = field(default_factory=list)


@dataclass
class LLMExplanation:
    text: str
    evidence_ids: list[str]
    provenance: Provenance | None = None


class MarketDataProvider(ABC):
    name: str

    @abstractmethod
    async def get_market_snapshot(self, mint: str) -> MarketSnapshot | None:
        raise NotImplementedError

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "unknown"}


class OnChainProvider(ABC):
    name: str

    @abstractmethod
    async def get_token_info(self, mint: str) -> OnChainTokenInfo | None:
        raise NotImplementedError

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "unknown"}


class TokenDiscoveryProvider(ABC):
    name: str

    @abstractmethod
    async def poll_new_tokens(self) -> list[DiscoveredToken]:
        raise NotImplementedError

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "unknown"}


class SocialProvider(ABC):
    name: str

    @abstractmethod
    async def get_social_snapshot(self, query: str, mint: str | None = None) -> SocialSnapshot | None:
        raise NotImplementedError

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "unknown"}


class NewsProvider(ABC):
    name: str

    @abstractmethod
    async def fetch_recent(self, query: str | None = None) -> list[NewsItem]:
        raise NotImplementedError

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "unknown"}


class WalletIntelligenceProvider(ABC):
    name: str

    @abstractmethod
    async def analyze_wallet(self, address: str) -> WalletProfile | None:
        raise NotImplementedError

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "unknown"}


class LLMProvider(ABC):
    name: str

    @abstractmethod
    async def explain(self, structured_evidence: dict[str, Any]) -> LLMExplanation:
        raise NotImplementedError

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "unknown"}
