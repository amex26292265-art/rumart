"""FastAPI entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.services.state import state

configure_logging()
log = get_logger("main")


async def _probe_infra() -> None:
    settings = get_settings()
    # Redis
    try:
        from redis.asyncio import Redis

        r = Redis.from_url(settings.redis_url, socket_connect_timeout=1)
        pong = await r.ping()
        state.redis_ok = bool(pong)
        await r.aclose()
    except Exception as exc:
        state.redis_ok = False
        log.warning("redis_unavailable", error=str(exc))

    # Postgres
    try:
        from app.db.session import init_db

        await init_db()
        state.db_ok = True
    except Exception as exc:
        state.db_ok = False
        log.warning("database_unavailable", error=str(exc))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    if settings.live_execution_enabled:
        raise RuntimeError("LIVE_EXECUTION_ENABLED must remain false — no live execution module in Phase 1")
    state.load_scenarios()
    await _probe_infra()
    log.info(
        "startup",
        tokens=len(state.tokens),
        db_ok=state.db_ok,
        redis_ok=state.redis_ok,
        trading_mode=settings.trading_mode,
    )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0-phase1",
        description="Decision-support system for Solana memecoin research. Paper trading only.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    app.include_router(router, prefix="/api/v1")
    return app


app = create_app()
