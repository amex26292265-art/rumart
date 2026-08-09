# DexScreener client scaffold — used when live Phase 2 is enabled.
# Docs: https://docs.dexscreener.com/api/reference

from __future__ import annotations

from typing import Any

import httpx

from app.core.resilience import CircuitBreaker, DataStatus, Provenance, utcnow
from app.providers.base import MarketDataProvider, MarketSnapshot


class DexScreenerMarketProvider(MarketDataProvider):
    name = "dexscreener.tokens.v1"

    def __init__(self, base_url: str = "https://api.dexscreener.com") -> None:
        self.base_url = base_url.rstrip("/")
        self.breaker = CircuitBreaker()

    async def get_market_snapshot(self, mint: str) -> MarketSnapshot | None:
        if not self.breaker.allow():
            return MarketSnapshot(
                mint=mint,
                price_usd=None,
                market_cap_usd=None,
                fdv_usd=None,
                liquidity_usd=None,
                provenance=Provenance(
                    source=self.name,
                    source_timestamp=None,
                    ingestion_timestamp=utcnow(),
                    reliability=0.0,
                    mint=mint,
                    status=DataStatus.ERROR,
                    extra={"reason": "circuit_open"},
                ),
            )
        url = f"{self.base_url}/tokens/v1/solana/{mint}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
            if resp.status_code == 429:
                self.breaker.record_failure()
                status = DataStatus.ERROR
                payload: list[Any] = []
            else:
                resp.raise_for_status()
                payload = resp.json()
                self.breaker.record_success()
                status = DataStatus.OK
        except Exception as exc:
            self.breaker.record_failure()
            return MarketSnapshot(
                mint=mint,
                price_usd=None,
                market_cap_usd=None,
                fdv_usd=None,
                liquidity_usd=None,
                provenance=Provenance(
                    source=self.name,
                    source_timestamp=None,
                    ingestion_timestamp=utcnow(),
                    reliability=0.0,
                    mint=mint,
                    status=DataStatus.ERROR,
                    extra={"error": str(exc)},
                ),
            )

        if not payload:
            return MarketSnapshot(
                mint=mint,
                price_usd=None,
                market_cap_usd=None,
                fdv_usd=None,
                liquidity_usd=None,
                provenance=Provenance(
                    source=self.name,
                    source_timestamp=None,
                    ingestion_timestamp=utcnow(),
                    reliability=0.5,
                    mint=mint,
                    status=DataStatus.INSUFFICIENT if status == DataStatus.OK else status,
                ),
            )

        pair = payload[0]
        return MarketSnapshot(
            mint=mint,
            price_usd=_f(pair.get("priceUsd")),
            market_cap_usd=_f(pair.get("marketCap")),
            fdv_usd=_f(pair.get("fdv")),
            liquidity_usd=_f((pair.get("liquidity") or {}).get("usd")),
            volume_5m=_f((pair.get("volume") or {}).get("m5")),
            volume_1h=_f((pair.get("volume") or {}).get("h1")),
            buys=((pair.get("txns") or {}).get("m5") or {}).get("buys"),
            sells=((pair.get("txns") or {}).get("m5") or {}).get("sells"),
            pair_address=pair.get("pairAddress"),
            dex=pair.get("dexId"),
            provenance=Provenance(
                source=self.name,
                source_timestamp=utcnow(),
                ingestion_timestamp=utcnow(),
                reliability=0.85,
                mint=mint,
                status=status,
            ),
        )

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": self.breaker.state, "failures": self.breaker.failures}


def _f(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
