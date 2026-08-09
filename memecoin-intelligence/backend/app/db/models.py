"""SQLAlchemy models."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Token(Base):
    __tablename__ = "tokens"

    mint: Mapped[str] = mapped_column(String(64), primary_key=True)
    symbol: Mapped[str | None] = mapped_column(String(32))
    name: Mapped[str | None] = mapped_column(String(128))
    launch_platform: Mapped[str | None] = mapped_column(String(64))
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at_onchain: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_scenario: Mapped[bool] = mapped_column(Boolean, default=False)
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class MarketSnapshotRow(Base):
    __tablename__ = "market_snapshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    mint: Mapped[str] = mapped_column(String(64), index=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    source: Mapped[str] = mapped_column(String(128))
    source_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ingestion_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reliability: Mapped[float] = mapped_column(Float, default=0.0)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class SignalSnapshot(Base):
    __tablename__ = "signal_snapshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    mint: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    opportunity_score: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float | None] = mapped_column(Float)
    risk_score: Mapped[float | None] = mapped_column(Float)
    decision: Mapped[str] = mapped_column(String(64))
    features: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    contributions: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    reasoning: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    market_price: Mapped[float | None] = mapped_column(Float)
    market_cap: Mapped[float | None] = mapped_column(Float)
    liquidity: Mapped[float | None] = mapped_column(Float)
    weights_version: Mapped[str] = mapped_column(String(64))
    immutable: Mapped[bool] = mapped_column(Boolean, default=True)


class PaperPositionRow(Base):
    __tablename__ = "paper_positions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    mint: Mapped[str] = mapped_column(String(64), index=True)
    symbol: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="open")
    qty: Mapped[float] = mapped_column(Float)
    entry_price: Mapped[float] = mapped_column(Float)
    entry_notional: Mapped[float] = mapped_column(Float)
    fees_paid: Mapped[float] = mapped_column(Float, default=0.0)
    exit_price: Mapped[float | None] = mapped_column(Float)
    realized_pnl: Mapped[float | None] = mapped_column(Float)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[list[Any]] = mapped_column(JSONB, default=list)


class ProviderHealthRow(Base):
    __tablename__ = "provider_health"

    provider: Mapped[str] = mapped_column(String(128), primary_key=True)
    status: Mapped[str] = mapped_column(String(64))
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    latency_ms: Mapped[float | None] = mapped_column(Float)
    detail: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
