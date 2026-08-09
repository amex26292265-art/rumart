"""Bybit Spot market client — official V5 public REST + WebSocket.

Docs:
- REST instruments: https://bybit-exchange.github.io/docs/v5/market/instrument
- REST tickers: https://bybit-exchange.github.io/docs/v5/market/tickers
- WS connect: https://bybit-exchange.github.io/docs/v5/ws/connect
- WS ticker: https://bybit-exchange.github.io/docs/v5/websocket/public/ticker

No API secret required for public market data.
"""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import httpx
import websockets

from app.core.logging import get_logger
from app.core.resilience import DataStatus, Provenance, utcnow

log = get_logger("bybit")

BYBIT_REST = "https://api.bybit.com"
BYBIT_WS_SPOT = "wss://stream.bybit.com/v5/public/spot"
COINGECKO_BYBIT_SPOT = "https://api.coingecko.com/api/v3/exchanges/bybit_spot/tickers"

WINDOWS_SEC = [10, 30, 60, 180, 300, 900, 3600, 14400, 86400]
WINDOW_LABELS = {
    10: "10s",
    30: "30s",
    60: "1m",
    180: "3m",
    300: "5m",
    900: "15m",
    3600: "1h",
    14400: "4h",
    86400: "24h",
}


def _f(v: Any) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


@dataclass
class TickSample:
    ts: float  # unix seconds
    price: float
    volume_24h: float | None = None
    turnover_24h: float | None = None
    bid1: float | None = None
    ask1: float | None = None
    bid1_size: float | None = None
    ask1_size: float | None = None


@dataclass
class Instrument:
    symbol: str
    base: str
    quote: str
    status: str
    launch_time_ms: int | None = None
    discovery_source: str = "bybit.instruments-info"


@dataclass
class SymbolState:
    symbol: str
    base: str
    quote: str = "USDT"
    last_price: float | None = None
    price_24h_pcnt: float | None = None
    high_24h: float | None = None
    low_24h: float | None = None
    volume_24h: float | None = None
    turnover_24h: float | None = None
    bid1: float | None = None
    ask1: float | None = None
    bid1_size: float | None = None
    ask1_size: float | None = None
    updated_at: datetime | None = None
    source_ts_ms: int | None = None
    launch_time_ms: int | None = None
    discovery_source: str = "unknown"
    samples: deque[TickSample] = field(default_factory=lambda: deque(maxlen=5000))
    first_seen_at: datetime | None = None


class BybitSpotService:
    """In-memory Bybit Spot scanner with rolling-window features."""

    def __init__(self) -> None:
        self.instruments: dict[str, Instrument] = {}
        self.symbols: dict[str, SymbolState] = {}
        self.rest_ok: bool | None = None
        self.ws_ok: bool | None = None
        self.ws_last_message_at: datetime | None = None
        self.discovery_source: str | None = None
        self.discovery_error: str | None = None
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()
        self.subscribed: set[str] = set()

    async def discover_instruments(self) -> list[Instrument]:
        """Prefer official Bybit REST; fall back to CoinGecko exchange tickers if geo-blocked."""
        try:
            instruments = await self._discover_bybit_rest()
            self.rest_ok = True
            self.discovery_source = "bybit.v5.market.instruments-info"
            self.discovery_error = None
            self._ingest_instruments(instruments)
            return instruments
        except Exception as exc:
            self.rest_ok = False
            self.discovery_error = str(exc)
            log.warning("bybit_rest_discovery_failed", error=str(exc))

        try:
            instruments = await self._discover_coingecko_fallback()
            self.discovery_source = "coingecko.exchanges.bybit_spot.tickers"
            self._ingest_instruments(instruments)
            return instruments
        except Exception as exc:
            self.discovery_error = f"bybit_rest={self.discovery_error}; coingecko={exc}"
            log.warning("coingecko_discovery_failed", error=str(exc))
            return []

    async def _discover_bybit_rest(self) -> list[Instrument]:
        out: list[Instrument] = []
        cursor = None
        async with httpx.AsyncClient(timeout=20.0) as client:
            while True:
                params: dict[str, Any] = {"category": "spot", "limit": 1000}
                if cursor:
                    params["cursor"] = cursor
                resp = await client.get(f"{BYBIT_REST}/v5/market/instruments-info", params=params)
                if resp.status_code == 403:
                    raise RuntimeError("Bybit REST geo-blocked (HTTP 403)")
                resp.raise_for_status()
                payload = resp.json()
                if payload.get("retCode") != 0:
                    raise RuntimeError(payload.get("retMsg") or "bybit instruments error")
                result = payload.get("result") or {}
                for row in result.get("list") or []:
                    quote = (row.get("quoteCoin") or "").upper()
                    if quote != "USDT":
                        continue
                    if (row.get("status") or "") != "Trading":
                        continue
                    symbol = row.get("symbol")
                    if not symbol:
                        continue
                    out.append(
                        Instrument(
                            symbol=symbol,
                            base=(row.get("baseCoin") or "").upper(),
                            quote=quote,
                            status=row.get("status") or "Trading",
                            launch_time_ms=_int(row.get("launchTime")),
                            discovery_source="bybit.v5.market.instruments-info",
                        )
                    )
                cursor = result.get("nextPageCursor") or None
                if not cursor:
                    break
        return out

    async def _discover_coingecko_fallback(self) -> list[Instrument]:
        """Documented CoinGecko exchange tickers used only when Bybit REST is unavailable."""
        out: dict[str, Instrument] = {}
        async with httpx.AsyncClient(timeout=20.0) as client:
            for page in range(1, 12):
                resp = await client.get(COINGECKO_BYBIT_SPOT, params={"page": page})
                if resp.status_code == 429:
                    log.warning("coingecko_rate_limited", page=page, kept=len(out))
                    break
                resp.raise_for_status()
                payload = resp.json()
                tickers = payload.get("tickers") or []
                if not tickers:
                    break
                for t in tickers:
                    if (t.get("target") or "").upper() != "USDT":
                        continue
                    base = (t.get("base") or "").upper()
                    if not base:
                        continue
                    # Skip weird non-spot compound bases
                    if "/" in base or base.endswith("USDT"):
                        continue
                    symbol = f"{base}USDT"
                    out[symbol] = Instrument(
                        symbol=symbol,
                        base=base,
                        quote="USDT",
                        status="Trading",
                        launch_time_ms=None,
                        discovery_source="coingecko.exchanges.bybit_spot.tickers",
                    )
                await asyncio.sleep(0.35)
        if not out:
            raise RuntimeError("CoinGecko returned no Bybit USDT tickers")
        return list(out.values())

    def _ingest_instruments(self, instruments: list[Instrument]) -> None:
        now = utcnow()
        for inst in instruments:
            self.instruments[inst.symbol] = inst
            st = self.symbols.get(inst.symbol)
            if st is None:
                self.symbols[inst.symbol] = SymbolState(
                    symbol=inst.symbol,
                    base=inst.base,
                    quote=inst.quote,
                    launch_time_ms=inst.launch_time_ms,
                    discovery_source=inst.discovery_source,
                    first_seen_at=now,
                )
            else:
                st.launch_time_ms = inst.launch_time_ms or st.launch_time_ms
                st.discovery_source = inst.discovery_source

    async def start(self, max_ws_symbols: int = 80) -> None:
        if self._task and not self._task.done():
            return
        await self.discover_instruments()
        self._stop.clear()
        self._task = asyncio.create_task(self._ws_loop(max_ws_symbols), name="bybit-ws")

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _ws_loop(self, max_ws_symbols: int) -> None:
        # Prioritize high-turnover majors by sorting alphabetically then preferring known liquid bases
        priority = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT"]
        symbols = [s for s in priority if s in self.symbols]
        remaining = sorted(s for s in self.symbols if s not in symbols)
        symbols.extend(remaining)
        symbols = symbols[:max_ws_symbols]

        while not self._stop.is_set():
            try:
                async with websockets.connect(BYBIT_WS_SPOT, ping_interval=20, ping_timeout=20) as ws:
                    self.ws_ok = True
                    # Spot: max 10 args per subscribe request
                    for i in range(0, len(symbols), 10):
                        batch = symbols[i : i + 10]
                        args = [f"tickers.{s}" for s in batch]
                        await ws.send(json.dumps({"op": "subscribe", "args": args}))
                        self.subscribed.update(batch)
                    log.info("bybit_ws_subscribed", count=len(self.subscribed))

                    while not self._stop.is_set():
                        raw = await asyncio.wait_for(ws.recv(), timeout=30)
                        msg = json.loads(raw)
                        if msg.get("op") == "pong" or msg.get("ret_msg") == "pong":
                            continue
                        if msg.get("topic", "").startswith("tickers."):
                            self._on_ticker(msg)
                        # heartbeat
                        if self.ws_last_message_at and (utcnow() - self.ws_last_message_at).total_seconds() > 15:
                            await ws.send(json.dumps({"op": "ping"}))
            except Exception as exc:
                self.ws_ok = False
                log.warning("bybit_ws_disconnected", error=str(exc))
                await asyncio.sleep(3)

    def _on_ticker(self, msg: dict[str, Any]) -> None:
        data = msg.get("data") or {}
        symbol = data.get("symbol")
        if not symbol:
            return
        price = _f(data.get("lastPrice"))
        if price is None:
            return
        now = utcnow()
        self.ws_last_message_at = now
        st = self.symbols.get(symbol)
        if st is None:
            base = symbol.replace("USDT", "") if symbol.endswith("USDT") else symbol
            st = SymbolState(symbol=symbol, base=base, first_seen_at=now)
            self.symbols[symbol] = st
        st.last_price = price
        st.price_24h_pcnt = _f(data.get("price24hPcnt"))
        # Bybit spot price24hPcnt is fraction (e.g. 0.02 = +2%)
        st.high_24h = _f(data.get("highPrice24h"))
        st.low_24h = _f(data.get("lowPrice24h"))
        st.volume_24h = _f(data.get("volume24h"))
        st.turnover_24h = _f(data.get("turnover24h"))
        st.bid1 = _f(data.get("bid1Price"))
        st.ask1 = _f(data.get("ask1Price"))
        st.bid1_size = _f(data.get("bid1Size"))
        st.ask1_size = _f(data.get("ask1Size"))
        st.source_ts_ms = msg.get("ts")
        st.updated_at = now
        st.samples.append(
            TickSample(
                ts=now.timestamp(),
                price=price,
                volume_24h=st.volume_24h,
                turnover_24h=st.turnover_24h,
                bid1=st.bid1,
                ask1=st.ask1,
                bid1_size=st.bid1_size,
                ask1_size=st.ask1_size,
            )
        )

    def health(self) -> dict[str, Any]:
        age = None
        if self.ws_last_message_at:
            age = (utcnow() - self.ws_last_message_at).total_seconds()
        return {
            "provider": "bybit.spot",
            "rest_ok": self.rest_ok,
            "ws_ok": self.ws_ok,
            "discovery_source": self.discovery_source,
            "discovery_error": self.discovery_error,
            "instruments": len(self.instruments),
            "tracked_symbols": len(self.symbols),
            "subscribed": len(self.subscribed),
            "ws_last_age_seconds": age,
            "status": "ok" if self.ws_ok else ("degraded" if self.symbols else "error"),
        }

    async def ahealth(self) -> dict[str, Any]:
        return self.health()

    def compute_features(self, symbol: str) -> dict[str, Any] | None:
        st = self.symbols.get(symbol)
        if st is None or st.last_price is None:
            return None
        now = utcnow().timestamp()
        changes: dict[str, float | None] = {}
        for sec, label in WINDOW_LABELS.items():
            changes[label] = self._pct_change(st, now, sec)

        # Acceleration: compare recent short window vs prior short window
        c_1m = changes.get("1m")
        c_5m = changes.get("5m")
        c_10s = changes.get("10s")
        c_30s = changes.get("30s")
        price_velocity = c_1m
        price_acceleration = None
        if c_10s is not None and c_30s is not None:
            # rough accel: short burst vs slightly longer
            price_acceleration = c_10s - (c_30s / 3.0)

        vol_accel = self._volume_acceleration(st, now)
        imbalance = self._orderbook_imbalance(st)
        spread_bps = None
        if st.bid1 and st.ask1 and st.last_price:
            spread_bps = ((st.ask1 - st.bid1) / st.last_price) * 10_000

        chase = self._chase_risk(changes, vol_accel)
        phase = self._early_phase(changes, vol_accel, chase)
        opportunity, entry, confidence, status, why, risks, waiting, invalidation = self._score(
            changes, vol_accel, imbalance, chase, phase, st
        )

        age_sec = (utcnow() - st.updated_at).total_seconds() if st.updated_at else None
        data_status = DataStatus.OK
        if age_sec is None:
            data_status = DataStatus.INSUFFICIENT
        elif age_sec > 15:
            data_status = DataStatus.STALE

        listing_age_hours = None
        if st.launch_time_ms:
            listing_age_hours = max(0.0, (now * 1000 - st.launch_time_ms) / 3_600_000)

        return {
            "symbol": symbol,
            "base": st.base,
            "quote": st.quote,
            "price": st.last_price,
            "price_24h_pcnt": (st.price_24h_pcnt * 100.0) if st.price_24h_pcnt is not None else None,
            "changes": changes,
            "volume_24h": st.volume_24h,
            "turnover_24h": st.turnover_24h,
            "volume_acceleration": vol_accel,
            "price_velocity": price_velocity,
            "price_acceleration": price_acceleration,
            "orderbook_imbalance": imbalance,
            "spread_bps": spread_bps,
            "bid1": st.bid1,
            "ask1": st.ask1,
            "phase": phase,
            "chase_risk": chase,
            "opportunity_score": opportunity,
            "entry_quality": entry,
            "confidence": confidence,
            "status": status,
            "why": why,
            "risks": risks,
            "waiting_for": waiting,
            "invalidation": invalidation,
            "listing_age_hours": listing_age_hours,
            "discovery_source": st.discovery_source,
            "data_age_seconds": age_sec,
            "data_status": data_status.value,
            "provenance": Provenance(
                source="bybit.ws.tickers",
                source_timestamp=st.updated_at,
                ingestion_timestamp=utcnow(),
                reliability=0.9 if data_status == DataStatus.OK else 0.4,
                status=data_status,
                extra={"symbol": symbol},
            ).to_dict(),
            "sparkline": [s.price for s in list(st.samples)[-40:]],
        }

    def _pct_change(self, st: SymbolState, now: float, window_sec: int) -> float | None:
        if not st.samples:
            return None
        target = now - window_sec
        # find oldest sample at or after target; if none, use earliest if old enough
        oldest = None
        for s in st.samples:
            if s.ts <= target:
                oldest = s
            else:
                break
        if oldest is None:
            # insufficient history for this window
            first = st.samples[0]
            if now - first.ts < window_sec * 0.7:
                return None
            oldest = first
        if oldest.price <= 0 or st.last_price is None:
            return None
        return ((st.last_price - oldest.price) / oldest.price) * 100.0

    def _volume_acceleration(self, st: SymbolState, now: float) -> float | None:
        # proxy: turnover24h delta rate recent vs earlier (Bybit ticker volume24h is rolling 24h)
        if len(st.samples) < 10:
            return None
        recent = [s for s in st.samples if s.ts >= now - 60 and s.turnover_24h is not None]
        prior = [s for s in st.samples if now - 180 <= s.ts < now - 60 and s.turnover_24h is not None]
        if len(recent) < 2 or len(prior) < 2:
            return None
        r_delta = recent[-1].turnover_24h - recent[0].turnover_24h  # type: ignore[operator]
        p_delta = prior[-1].turnover_24h - prior[0].turnover_24h  # type: ignore[operator]
        if p_delta is None or abs(p_delta) < 1e-9:
            return None
        return ((r_delta - p_delta) / abs(p_delta)) * 100.0

    def _orderbook_imbalance(self, st: SymbolState) -> float | None:
        if st.bid1_size is None or st.ask1_size is None:
            return None
        denom = st.bid1_size + st.ask1_size
        if denom <= 0:
            return None
        return (st.bid1_size - st.ask1_size) / denom

    def _chase_risk(self, changes: dict[str, float | None], vol_accel: float | None) -> float:
        c5 = changes.get("5m") or 0.0
        c15 = changes.get("15m") or 0.0
        c1 = changes.get("1m") or 0.0
        risk = 0.0
        if c15 >= 25:
            risk += 35
        elif c15 >= 12:
            risk += 20
        if c5 >= 10:
            risk += 25
        if c1 >= 4 and c5 >= 8:
            risk += 15
        if vol_accel is not None and vol_accel < -20 and (c5 or 0) > 5:
            risk += 20  # price up, volume accel fading
        return max(0.0, min(100.0, risk))

    def _early_phase(
        self,
        changes: dict[str, float | None],
        vol_accel: float | None,
        chase: float,
    ) -> str:
        c10 = changes.get("10s")
        c1 = changes.get("1m")
        c5 = changes.get("5m")
        if chase >= 70:
            return "OVEREXTENDED"
        if c10 is None and c1 is None:
            return "INSUFFICIENT"
        if (c1 is not None and abs(c1) < 0.15) and (c5 is None or abs(c5) < 0.4):
            return "QUIET"
        if vol_accel is not None and vol_accel > 40 and (c1 or 0) > 0.4:
            if (c5 or 0) > 3:
                return "BREAKOUT"
            return "ACCELERATION"
        if (c1 or 0) > 0.25 or (c10 or 0) > 0.15:
            return "ACTIVITY"
        if (c5 or 0) < -2:
            return "DISTRIBUTION"
        return "ACTIVITY"

    def _score(
        self,
        changes: dict[str, float | None],
        vol_accel: float | None,
        imbalance: float | None,
        chase: float,
        phase: str,
        st: SymbolState,
    ) -> tuple[float | None, float | None, float | None, str, list[str], list[str], list[str], list[str]]:
        present = 0
        mom = 0.0
        c1 = changes.get("1m")
        c5 = changes.get("5m")
        if c1 is not None:
            present += 1
            mom += max(0.0, min(1.0, (c1 + 1) / 6))
        if c5 is not None:
            present += 1
            mom += max(0.0, min(1.0, (c5 + 2) / 12))
        mom = mom / max(1, (1 if c1 is not None else 0) + (1 if c5 is not None else 0))

        vol_s = 0.5
        if vol_accel is not None:
            present += 1
            vol_s = max(0.0, min(1.0, (vol_accel + 50) / 150))

        flow = 0.5
        if imbalance is not None:
            present += 1
            flow = max(0.0, min(1.0, (imbalance + 1) / 2))

        if present == 0 or st.last_price is None:
            return None, None, 0.0, "INSUFFICIENT_DATA", ["DATA INSUFFICIENT for scoring"], [], [], []

        opportunity = 100.0 * (0.4 * mom + 0.35 * vol_s + 0.25 * flow)
        opportunity = max(0.0, min(100.0, opportunity - chase * 0.25))

        # Entry quality inverse to chase / extension
        entry = max(0.0, min(100.0, 100.0 - chase))
        if phase in {"ACCELERATION", "ACTIVITY"} and chase < 40:
            entry = min(100.0, entry + 10)

        conf = min(100.0, 35 + present * 15 + (10 if len(st.samples) > 30 else 0))
        if st.updated_at and (utcnow() - st.updated_at).total_seconds() > 10:
            conf *= 0.7

        why: list[str] = []
        risks: list[str] = []
        waiting: list[str] = []
        invalidation = [
            "price velocity turns negative",
            "volume acceleration collapses",
            "orderbook flips heavily to asks",
            "broader market regime turns risk-off",
        ]

        if c1 is not None:
            why.append(f"1m price change {c1:+.2f}%")
        if c5 is not None:
            why.append(f"5m price change {c5:+.2f}%")
        if vol_accel is not None:
            why.append(f"volume acceleration proxy {vol_accel:+.1f}%")
        if imbalance is not None:
            why.append(f"top-of-book imbalance {imbalance:+.2f}")
        why.append(f"early-move phase: {phase}")

        if chase >= 55:
            risks.append(f"chase risk elevated ({chase:.0f}/100) — move may already be extended")
        if (c15 := changes.get("15m")) is not None and c15 > 20:
            risks.append(f"already {c15:+.1f}% over 15m")
        if imbalance is not None and imbalance < -0.25:
            risks.append("ask-side pressure at top of book")

        if chase >= 70 or phase == "OVEREXTENDED":
            status = "DO_NOT_CHASE"
            waiting.append("pullback toward short-term VWAP/structure")
            waiting.append("renewed volume acceleration after consolidation")
        elif opportunity >= 70 and entry >= 60 and phase in {"ACCELERATION", "BREAKOUT", "ACTIVITY"}:
            status = "CONSIDER_ENTRY"
        elif opportunity >= 60 and entry < 55:
            status = "WAIT_FOR_PULLBACK"
            waiting.append("better entry after extension cools")
        elif opportunity >= 45:
            status = "WATCH"
        elif phase == "DISTRIBUTION":
            status = "EXIT" if opportunity < 40 else "WATCH"
        else:
            status = "WATCH"

        return (
            round(opportunity, 1),
            round(entry, 1),
            round(conf, 1),
            status,
            why,
            risks,
            waiting,
            invalidation,
        )

    def fast_movers(self, limit: int = 40) -> list[dict[str, Any]]:
        rows = []
        for symbol in self.subscribed or self.symbols:
            feat = self.compute_features(symbol)
            if not feat or feat.get("data_status") in {"INSUFFICIENT", "ERROR"}:
                continue
            if feat.get("opportunity_score") is None and feat.get("status") == "INSUFFICIENT_DATA":
                continue
            # rank by short-term acceleration / activity, not 24h
            score = 0.0
            if feat.get("price_acceleration") is not None:
                score += abs(feat["price_acceleration"]) * 2
            if feat.get("changes", {}).get("1m") is not None:
                score += abs(feat["changes"]["1m"]) * 3
            if feat.get("volume_acceleration") is not None:
                score += max(0.0, feat["volume_acceleration"]) / 20
            if feat.get("phase") in {"ACCELERATION", "BREAKOUT", "ACTIVITY"}:
                score += 5
            if feat.get("opportunity_score") is not None:
                score += float(feat["opportunity_score"]) / 50.0
            feat["_rank_score"] = score
            rows.append(feat)
        rows.sort(key=lambda r: r.get("_rank_score") or 0, reverse=True)
        for r in rows:
            r.pop("_rank_score", None)
        return rows[:limit]

    def new_listings(self, limit: int = 30) -> list[dict[str, Any]]:
        dated = [s for s in self.symbols.values() if s.launch_time_ms]
        if not dated:
            return []
        dated.sort(key=lambda s: s.launch_time_ms or 0, reverse=True)
        out = []
        for s in dated[:limit]:
            feat = self.compute_features(s.symbol)
            if feat:
                out.append(feat)
        return out

    def snapshot_all_tracked(self) -> list[dict[str, Any]]:
        out = []
        for symbol in sorted(self.subscribed or self.symbols.keys()):
            feat = self.compute_features(symbol)
            if feat:
                out.append(feat)
        return out


def _int(v: Any) -> int | None:
    if v is None or v == "":
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


# singleton used by app state
bybit_service = BybitSpotService()
