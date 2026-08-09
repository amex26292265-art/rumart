"""REST + WebSocket API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.resilience import utcnow
from app.services.state import state

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, Any]:
    settings = get_settings()
    provider_health = {}
    for key, prov in state.providers.items():
        provider_health[key] = await prov.health()

    degraded = []
    if state.db_ok is False:
        degraded.append("database")
    if state.redis_ok is False:
        degraded.append("redis")
    for key, h in provider_health.items():
        if h.get("status") in {"disabled", "error"}:
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
        "tokens_monitored": len(state.tokens),
        "events_per_minute": state.events_per_minute,
        "providers": provider_health,
        "degraded_components": degraded,
        "analysis_quality_warning": bool(degraded)
        or any(t.get("analysis", {}).get("data_quality") == "INSUFFICIENT" for t in state.tokens),
        "data_disclaimer": "Scenario tokens are labeled mock.scenario and are not live market data.",
    }


@router.get("/narratives/breaking")
async def breaking_narratives() -> dict[str, Any]:
    return {"items": state.narratives, "source_note": "Phase 1 may include labeled scenarios only"}


@router.get("/tokens/opportunities")
async def opportunities() -> dict[str, Any]:
    items = state.opportunities()
    # Enforce: REJECT never in recommended list
    items = [t for t in items if t.get("analysis", {}).get("decision") != "REJECT"]
    return {"items": items, "count": len(items)}


@router.get("/tokens/new")
async def new_tokens() -> dict[str, Any]:
    return {"items": state.new_tokens(), "count": len(state.tokens)}


@router.get("/tokens/rejected")
async def rejected() -> dict[str, Any]:
    return {"items": state.rejected(), "count": len(state.rejected())}


@router.get("/tokens/{mint}")
async def token_detail(mint: str) -> dict[str, Any]:
    token = next((t for t in state.tokens if t["mint"] == mint), None)
    if token is None:
        return {"error": "NOT_FOUND", "mint": mint}
    analysis = token.get("analysis", {})
    llm = await state.providers["llm"].explain(
        {
            "decision": analysis.get("decision"),
            "why": analysis.get("why"),
            "risks": analysis.get("risks"),
            "evidence": analysis.get("evidence"),
        }
    )
    return {
        "token": token,
        "axiom": state.axiom_link(mint),
        "explanation": {"text": llm.text, "evidence_ids": llm.evidence_ids},
        "why_now": analysis.get("why", []),
        "what_would_change_decision": analysis.get("invalidation", []),
    }


@router.get("/smart-money")
async def smart_money() -> dict[str, Any]:
    # Phase 1: derived labels from scenarios only
    activity = []
    for t in state.tokens:
        if t.get("wallet_label") in {"ACCUMULATION"}:
            activity.append(
                {
                    "mint": t["mint"],
                    "symbol": t["symbol"],
                    "label": t["wallet_label"],
                    "note": "Scenario label — live wallet intelligence arrives in Phase 4",
                    "source": t.get("data_source"),
                }
            )
    return {"items": activity}


@router.get("/portfolio/paper")
async def paper_portfolio() -> dict[str, Any]:
    marks = {
        t["mint"]: t["price_usd"]
        for t in state.tokens
        if isinstance(t.get("price_usd"), (int, float))
    }
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
    notional_usd: float | None = Field(default=None, ge=0.5, le=40)


@router.post("/portfolio/paper/open")
async def paper_open(body: PaperOpenRequest) -> dict[str, Any]:
    token = next((t for t in state.tokens if t["mint"] == body.mint), None)
    if token is None:
        return {"error": "NOT_FOUND"}
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
                "tokens": len(state.tokens),
                "disclaimer": "Scenario data is labeled mock.scenario",
            }
        )
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_json({"type": "pong", "t": utcnow().isoformat()})
    except WebSocketDisconnect:
        pass
    finally:
        state.ws_clients.discard(websocket)
