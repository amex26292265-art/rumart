"""REST + WebSocket API."""

from __future__ import annotations

import inspect
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.resilience import utcnow
from app.services.state import state

router = APIRouter()

STATUS_EXPLAINERS = {
    "CONSIDER_ENTRY": {
        "title": "CONSIDER ENTRY",
        "summary": (
            "The token currently satisfies enough of the configured opportunity criteria to deserve "
            "consideration for a position. This is NOT a guarantee that price will increase."
        ),
    },
    "STRONG_SETUP": {
        "title": "STRONG SETUP",
        "summary": "Multiple independent signals align with acceptable entry quality. Still not a guaranteed outcome.",
    },
    "WAIT_FOR_PULLBACK": {
        "title": "WAIT FOR PULLBACK",
        "summary": "Underlying opportunity may be interesting, but current entry quality is poor (often overextended).",
    },
    "DO_NOT_CHASE": {
        "title": "DO NOT CHASE",
        "summary": "Price moved vertically / chase risk is elevated. Waiting is preferred over FOMO entries.",
    },
    "WATCH": {
        "title": "WATCH",
        "summary": "Worth monitoring, but not yet actionable under current thresholds.",
    },
    "REJECT": {
        "title": "REJECT / AVOID",
        "summary": "The token failed one or more critical safety/risk rules and must not be recommended.",
    },
    "INSUFFICIENT_DATA": {
        "title": "INSUFFICIENT DATA",
        "summary": "Critical evidence is missing or stale. The system refuses to guess.",
    },
    "EXIT": {
        "title": "EXIT SIGNAL",
        "summary": "Monitoring suggests momentum/structure deterioration. Decision-support only.",
    },
    "TAKE_PROFIT": {
        "title": "TAKE PROFIT",
        "summary": "Conditions suggest trimming exposure may be prudent. Not financial advice.",
    },
}


async def _provider_health(prov: Any) -> dict[str, Any]:
    health = getattr(prov, "health", None)
    if health is None:
        return {"status": "unknown"}
    if inspect.iscoroutinefunction(health):
        return await health()
    result = health()
    if inspect.isawaitable(result):
        return await result
    return result


@router.get("/health")
async def health() -> dict[str, Any]:
    settings = get_settings()
    provider_health = {}
    for key, prov in state.providers.items():
        provider_health[key] = await _provider_health(prov)

    bybit_h = state.bybit.health()
    provider_health["bybit"] = bybit_h

    degraded = []
    if state.db_ok is False:
        degraded.append("database")
    if state.redis_ok is False:
        degraded.append("redis")
    if bybit_h.get("status") in {"error", "degraded"} and not bybit_h.get("ws_ok"):
        degraded.append("provider:bybit")
    for key, h in provider_health.items():
        if key == "bybit":
            continue
        if h.get("status") == "error":
            degraded.append(f"provider:{key}")

    return {
        "status": "degraded" if degraded else "ok",
        "app": settings.app_name,
        "trading_mode": settings.trading_mode,
        "live_execution_enabled": settings.live_execution_enabled,
        "time": utcnow().isoformat(),
        "database": "ok" if state.db_ok else ("down" if state.db_ok is False else "unknown"),
        "redis": "ok" if state.redis_ok else ("down" if state.redis_ok is False else "unknown"),
        "websocket_clients": len(state.ws_clients),
        "tokens_monitored": len(state.bybit.subscribed) or len(state.tokens),
        "events_per_minute": state.events_per_minute,
        "providers": provider_health,
        "bybit": bybit_h,
        "degraded_components": degraded,
        "analysis_quality_warning": bool(degraded),
        "seed_demo_scenarios": settings.seed_demo_scenarios,
        "data_disclaimer": "Production view uses live providers only. Scenarios are tests/fixtures.",
    }


@router.get("/meta/status-explainers")
async def status_explainers() -> dict[str, Any]:
    return {"items": STATUS_EXPLAINERS}


@router.get("/dashboard/kpis")
async def dashboard_kpis() -> dict[str, Any]:
    marks = {
        t["mint"]: t["price_usd"]
        for t in state.tokens
        if isinstance(t.get("price_usd"), (int, float))
    }
    # Prefer Bybit marks for open paper positions when available
    for p in state.paper.portfolio.open_positions:
        feat = state.bybit.compute_features(p.mint) or state.bybit.compute_features(p.symbol)
        if feat and feat.get("price") is not None:
            marks[p.mint] = feat["price"]

    metrics = state.paper.metrics(marks)
    movers = state.bybit.fast_movers(limit=20)
    ai_signals = [m for m in movers if m.get("status") in {"CONSIDER_ENTRY", "STRONG_SETUP", "WAIT_FOR_PULLBACK"}]
    best = None
    if ai_signals:
        best = max(ai_signals, key=lambda x: x.get("opportunity_score") or -1)

    return {
        "portfolio": metrics.get("equity") or metrics.get("balance"),
        "cash": metrics.get("balance"),
        "today_pnl": metrics.get("realized_pnl"),
        "open_positions": metrics.get("open_positions"),
        "ai_signals_today": len(ai_signals),
        "win_rate": metrics.get("win_rate"),
        "profit_factor": metrics.get("profit_factor"),
        "max_drawdown": None,  # requires equity curve history — not invented
        "best_signal_today": (
            {
                "symbol": best.get("symbol"),
                "opportunity_score": best.get("opportunity_score"),
                "status": best.get("status"),
            }
            if best
            else None
        ),
        "starting_balance": state.paper.config.starting_balance_usd,
        "note": "max_drawdown is null until equity curve history is collected",
    }


@router.get("/narratives/breaking")
async def breaking_narratives() -> dict[str, Any]:
    return {
        "items": state.narratives,
        "source_note": "Live narrative engine not enabled yet — empty unless scenarios explicitly seeded",
    }


@router.get("/tokens/opportunities")
async def opportunities() -> dict[str, Any]:
    # Prefer live Bybit opportunities; fall back to scenario tokens only if seeded
    live = [
        m
        for m in state.bybit.fast_movers(limit=50)
        if m.get("status") in {"CONSIDER_ENTRY", "STRONG_SETUP", "WAIT_FOR_PULLBACK", "WATCH"}
        and m.get("opportunity_score") is not None
    ]
    live.sort(key=lambda x: x.get("opportunity_score") or -1, reverse=True)
    if live:
        return {"items": live, "count": len(live), "source": "bybit.live"}

    items = state.opportunities()
    items = [t for t in items if t.get("analysis", {}).get("decision") != "REJECT"]
    return {"items": items, "count": len(items), "source": "scenarios" if items else "empty"}


@router.get("/tokens/new")
async def new_tokens() -> dict[str, Any]:
    listings = state.bybit.new_listings(limit=40)
    if listings:
        return {"items": listings, "count": len(listings), "source": "bybit.launchTime"}
    return {
        "items": [],
        "count": 0,
        "source": "unavailable",
        "note": "Listing age requires Bybit instruments launchTime; REST may be geo-blocked in some environments",
    }


@router.get("/tokens/rejected")
async def rejected() -> dict[str, Any]:
    return {"items": state.rejected(), "count": len(state.rejected())}


@router.get("/tokens/{mint}")
async def token_detail(mint: str) -> dict[str, Any]:
    # Bybit symbol detail
    feat = state.bybit.compute_features(mint.upper())
    if feat:
        explainer = STATUS_EXPLAINERS.get(feat.get("status") or "", STATUS_EXPLAINERS["INSUFFICIENT_DATA"])
        llm = await state.providers["llm"].explain(
            {
                "decision": feat.get("status"),
                "why": feat.get("why"),
                "risks": feat.get("risks"),
                "evidence": [{"id": "bybit_features", "value": feat.get("changes")}],
            }
        )
        return {
            "kind": "bybit",
            "token": feat,
            "status_explainer": explainer,
            "explanation": {"text": llm.text, "evidence_ids": llm.evidence_ids},
            "why_now": feat.get("why") or [],
            "what_would_change_decision": feat.get("invalidation") or [],
            "waiting_for": feat.get("waiting_for") or [],
            "bybit_trade_url": f"https://www.bybit.com/trade/spot/{feat['base']}/USDT",
        }

    token = next((t for t in state.tokens if t["mint"] == mint), None)
    if token is None:
        return {"error": "NOT_FOUND", "mint": mint, "status": "INSUFFICIENT_DATA"}
    analysis = token.get("analysis", {})
    decision = analysis.get("decision") or "INSUFFICIENT_DATA"
    llm = await state.providers["llm"].explain(
        {
            "decision": decision,
            "why": analysis.get("why"),
            "risks": analysis.get("risks"),
            "evidence": analysis.get("evidence"),
        }
    )
    return {
        "kind": "scenario_or_solana",
        "token": token,
        "axiom": state.axiom_link(mint),
        "status_explainer": STATUS_EXPLAINERS.get(decision, STATUS_EXPLAINERS["INSUFFICIENT_DATA"]),
        "explanation": {"text": llm.text, "evidence_ids": llm.evidence_ids},
        "why_now": analysis.get("why", []),
        "what_would_change_decision": analysis.get("invalidation", []),
    }


@router.get("/smart-money")
async def smart_money() -> dict[str, Any]:
    return {
        "items": [],
        "note": "Wallet intelligence arrives in a later phase — refusing to invent smart-money labels",
    }


@router.get("/bybit/health")
async def bybit_health() -> dict[str, Any]:
    return state.bybit.health()


@router.get("/bybit/instruments")
async def bybit_instruments() -> dict[str, Any]:
    items = [
        {
            "symbol": i.symbol,
            "base": i.base,
            "quote": i.quote,
            "status": i.status,
            "launch_time_ms": i.launch_time_ms,
            "discovery_source": i.discovery_source,
        }
        for i in state.bybit.instruments.values()
    ]
    return {
        "items": items,
        "count": len(items),
        "discovery_source": state.bybit.discovery_source,
        "discovery_error": state.bybit.discovery_error,
        "rest_ok": state.bybit.rest_ok,
    }


@router.get("/bybit/fast-movers")
async def bybit_fast_movers(limit: int = 40) -> dict[str, Any]:
    items = state.bybit.fast_movers(limit=limit)
    return {
        "items": items,
        "count": len(items),
        "ws_ok": state.bybit.ws_ok,
        "note": "Ranked by short-horizon acceleration, not 24h % alone",
    }


@router.get("/bybit/new-listings")
async def bybit_new_listings(limit: int = 30) -> dict[str, Any]:
    items = state.bybit.new_listings(limit=limit)
    return {
        "items": items,
        "count": len(items),
        "note": (
            None
            if items
            else "No launchTime available (Bybit REST instruments required). Not fabricating listing ages."
        ),
    }


@router.get("/bybit/heatmap")
async def bybit_heatmap() -> dict[str, Any]:
    items = []
    for feat in state.bybit.snapshot_all_tracked():
        phase = feat.get("phase") or "INSUFFICIENT"
        color = {
            "ACCELERATION": "accelerating",
            "BREAKOUT": "bullish",
            "ACTIVITY": "bullish",
            "QUIET": "neutral",
            "OVEREXTENDED": "overextended",
            "DISTRIBUTION": "weakening",
            "INSUFFICIENT": "insufficient",
        }.get(phase, "neutral")
        items.append(
            {
                "symbol": feat["symbol"],
                "base": feat["base"],
                "price": feat.get("price"),
                "change_1m": (feat.get("changes") or {}).get("1m"),
                "change_5m": (feat.get("changes") or {}).get("5m"),
                "turnover_24h": feat.get("turnover_24h"),
                "group": color,
                "status": feat.get("status"),
                "opportunity_score": feat.get("opportunity_score"),
                "data_status": feat.get("data_status"),
            }
        )
    return {"items": items, "count": len(items)}


@router.get("/bybit/symbol/{symbol}")
async def bybit_symbol(symbol: str) -> dict[str, Any]:
    feat = state.bybit.compute_features(symbol.upper())
    if not feat:
        return {"error": "INSUFFICIENT_DATA", "symbol": symbol}
    return {"item": feat, "status_explainer": STATUS_EXPLAINERS.get(feat.get("status") or "", None)}


@router.get("/portfolio/paper")
async def paper_portfolio() -> dict[str, Any]:
    marks: dict[str, float] = {}
    for p in state.paper.portfolio.positions:
        feat = state.bybit.compute_features(p.mint) or state.bybit.compute_features(p.symbol)
        if feat and isinstance(feat.get("price"), (int, float)):
            marks[p.mint] = float(feat["price"])
    for t in state.tokens:
        if isinstance(t.get("price_usd"), (int, float)):
            marks[t["mint"]] = float(t["price_usd"])
    return {
        "mode": "paper",
        "live_execution_enabled": False,
        "metrics": state.paper.metrics(marks),
        "positions": [
            {
                "id": p.id,
                "mint": p.mint,
                "symbol": p.symbol,
                "qty": p.qty,
                "entry_price": p.entry_price,
                "entry_notional": p.entry_notional,
                "fees_paid": p.fees_paid,
                "status": p.status,
                "opened_at": p.opened_at.isoformat(),
                "exit_price": p.exit_price,
                "realized_pnl": p.realized_pnl,
                "notes": p.notes,
            }
            for p in state.paper.portfolio.positions
        ],
        "trades": state.paper.portfolio.trades[-50:],
    }


class PaperOpenRequest(BaseModel):
    mint: str
    notional_usd: float | None = Field(default=None, ge=0.5, le=500)


@router.post("/portfolio/paper/open")
async def paper_open(body: PaperOpenRequest) -> dict[str, Any]:
    symbol = body.mint.upper()
    feat = state.bybit.compute_features(symbol)
    if feat and isinstance(feat.get("price"), (int, float)):
        if feat.get("status") in {"REJECT", "DO_NOT_CHASE"} and feat.get("chase_risk", 0) >= 80:
            return {"error": "CHASE_RISK", "detail": "Chase risk too high for paper entry"}
        pos = state.paper.open_long(
            mint=symbol,
            symbol=feat.get("base") or symbol,
            mark_price=float(feat["price"]),
            notional_usd=body.notional_usd,
            liquidity_usd=None,
        )
        if pos is None:
            return {"error": "ORDER_REJECTED", "detail": "Insufficient balance or position limits"}
        await state.broadcast({"type": "paper.position_opened", "mint": pos.mint, "id": pos.id})
        return {"ok": True, "position_id": pos.id}

    token = next((t for t in state.tokens if t["mint"] == body.mint), None)
    if token is None:
        return {"error": "INSUFFICIENT_DATA", "detail": "No usable live mark price"}
    if token.get("analysis", {}).get("safety_class") == "REJECT":
        return {"error": "REJECTED_TOKEN", "detail": "Cannot paper-trade REJECT safety class"}
    price = token.get("price_usd")
    if not isinstance(price, (int, float)) or price <= 0:
        return {"error": "INSUFFICIENT_DATA", "detail": "No usable mark price"}
    pos = state.paper.open_long(
        mint=token["mint"],
        symbol=token.get("symbol") or "???",
        mark_price=float(price),
        notional_usd=body.notional_usd,
        liquidity_usd=token.get("liquidity_usd") if isinstance(token.get("liquidity_usd"), (int, float)) else None,
    )
    if pos is None:
        return {"error": "ORDER_REJECTED", "detail": "Insufficient balance or position limits"}
    await state.broadcast({"type": "paper.position_opened", "mint": pos.mint, "id": pos.id})
    return {"ok": True, "position_id": pos.id}


@router.get("/watchlist")
async def get_watchlist() -> dict[str, Any]:
    items = []
    for sym in sorted(state.watchlist):
        feat = state.bybit.compute_features(sym)
        if feat:
            items.append(feat)
        else:
            items.append({"symbol": sym, "data_status": "INSUFFICIENT"})
    return {"items": items}


class WatchRequest(BaseModel):
    symbol: str


@router.post("/watchlist")
async def add_watchlist(body: WatchRequest) -> dict[str, Any]:
    state.watchlist.add(body.symbol.upper())
    return {"ok": True, "count": len(state.watchlist)}


@router.delete("/watchlist/{symbol}")
async def remove_watchlist(symbol: str) -> dict[str, Any]:
    state.watchlist.discard(symbol.upper())
    return {"ok": True, "count": len(state.watchlist)}


@router.get("/alerts")
async def alerts() -> dict[str, Any]:
    return {"items": state.alerts[-100:], "note": "Alert engine expands in later phase"}


@router.get("/config/scoring")
async def scoring_config() -> dict[str, Any]:
    from app.domain.types import BASELINE_WEIGHTS, WEIGHTS_VERSION

    return {"weights": BASELINE_WEIGHTS, "weights_version": WEIGHTS_VERSION, "note": "Baseline — not claimed optimal"}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    state.ws_clients.add(websocket)
    try:
        await websocket.send_json(
            {
                "type": "hello",
                "trading_mode": "paper",
                "bybit": state.bybit.health(),
                "disclaimer": "Live Bybit public data when available; no fabricated fills or catalysts",
            }
        )
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_json(
                    {
                        "type": "pong",
                        "t": utcnow().isoformat(),
                        "bybit_ws_ok": state.bybit.ws_ok,
                        "fast_movers": len(state.bybit.fast_movers(10)),
                    }
                )
            elif msg == "fast_movers":
                await websocket.send_json({"type": "bybit.fast_movers", "items": state.bybit.fast_movers(20)})
    except WebSocketDisconnect:
        pass
    finally:
        state.ws_clients.discard(websocket)
