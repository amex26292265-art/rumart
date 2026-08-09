"""Disabled / unavailable provider stubs — never fabricate live market data."""

from __future__ import annotations

from typing import Any

from app.core.resilience import DataStatus, Provenance, utcnow
from app.providers.base import (
    DiscoveredToken,
    LLMExplanation,
    LLMProvider,
    MarketDataProvider,
    MarketSnapshot,
    NewsItem,
    NewsProvider,
    OnChainProvider,
    OnChainTokenInfo,
    SocialProvider,
    SocialSnapshot,
    TokenDiscoveryProvider,
    WalletIntelligenceProvider,
    WalletProfile,
)


def _disabled_prov(source: str, mint: str | None = None) -> Provenance:
    return Provenance(
        source=source,
        source_timestamp=None,
        ingestion_timestamp=utcnow(),
        reliability=0.0,
        mint=mint,
        status=DataStatus.INSUFFICIENT,
        extra={"reason": "provider_disabled_or_unconfigured"},
    )


class DisabledMarketDataProvider(MarketDataProvider):
    name = "market.disabled"

    async def get_market_snapshot(self, mint: str) -> MarketSnapshot | None:
        return MarketSnapshot(
            mint=mint,
            price_usd=None,
            market_cap_usd=None,
            fdv_usd=None,
            liquidity_usd=None,
            provenance=_disabled_prov(self.name, mint),
        )

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "disabled"}


class DisabledOnChainProvider(OnChainProvider):
    name = "onchain.disabled"

    async def get_token_info(self, mint: str) -> OnChainTokenInfo | None:
        return OnChainTokenInfo(
            mint=mint,
            decimals=None,
            supply=None,
            mint_authority=None,
            freeze_authority=None,
            provenance=_disabled_prov(self.name, mint),
        )

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "disabled"}


class DisabledDiscoveryProvider(TokenDiscoveryProvider):
    name = "discovery.disabled"

    async def poll_new_tokens(self) -> list[DiscoveredToken]:
        return []

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "disabled"}


class DisabledSocialProvider(SocialProvider):
    name = "social.disabled"

    async def get_social_snapshot(self, query: str, mint: str | None = None) -> SocialSnapshot | None:
        return SocialSnapshot(
            mint=mint,
            query=query,
            mention_count=None,
            unique_authors=None,
            mentions_per_minute=None,
            engagement=None,
            bot_likelihood=None,
            authenticity="UNKNOWN",
            provenance=_disabled_prov(self.name, mint),
        )

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "disabled"}


class DisabledNewsProvider(NewsProvider):
    name = "news.disabled"

    async def fetch_recent(self, query: str | None = None) -> list[NewsItem]:
        return []

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "disabled"}


class DisabledWalletProvider(WalletIntelligenceProvider):
    name = "wallet.disabled"

    async def analyze_wallet(self, address: str) -> WalletProfile | None:
        return WalletProfile(
            address=address,
            classification="UNKNOWN",
            smart_money_confidence=None,
            provenance=_disabled_prov(self.name),
            notes=["INSUFFICIENT: wallet provider not configured"],
        )

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "disabled"}


class TemplateLLMProvider(LLMProvider):
    """Deterministic template explainer — does not invent numbers."""

    name = "llm.template"

    async def explain(self, structured_evidence: dict[str, Any]) -> LLMExplanation:
        decision = structured_evidence.get("decision", "INSUFFICIENT_DATA")
        why = structured_evidence.get("why") or []
        risks = structured_evidence.get("risks") or []
        lines = [
            f"Decision: {decision}.",
            "This explanation is generated from structured engine outputs only.",
        ]
        if why:
            lines.append("Supporting points:")
            lines.extend(f"- {w}" for w in why[:8])
        if risks:
            lines.append("Risks:")
            lines.extend(f"- {r}" for r in risks[:8])
        if not why and not risks:
            lines.append("DATA INSUFFICIENT for a richer explanation.")
        evidence_ids = [e.get("id", "unknown") for e in structured_evidence.get("evidence", []) if isinstance(e, dict)]
        return LLMExplanation(
            text="\n".join(lines),
            evidence_ids=evidence_ids,
            provenance=Provenance(
                source=self.name,
                source_timestamp=utcnow(),
                ingestion_timestamp=utcnow(),
                reliability=1.0,
                status=DataStatus.OK,
            ),
        )

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "ok"}
