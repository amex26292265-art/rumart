"""Paper trading engine — realistic fees/slippage, no perfect fills."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import uuid4

from app.core.resilience import utcnow


@dataclass
class PaperConfig:
    starting_balance_usd: float = 40.0
    max_position_usd: float = 5.0
    max_open_positions: int = 5
    # Solana-ish + venue assumptions (configurable; not claimed exact for all venues)
    base_fee_usd: float = 0.02
    priority_fee_usd: float = 0.03
    platform_fee_bps: float = 100.0  # 1% if unknown venue fee; logged
    base_slippage_bps: float = 50.0
    impact_bps_per_usd: float = 2.0  # crude impact model


@dataclass
class PaperPosition:
    id: str
    mint: str
    symbol: str
    qty: float
    entry_price: float
    entry_notional: float
    fees_paid: float
    opened_at: datetime
    status: str = "open"
    exit_price: float | None = None
    realized_pnl: float | None = None
    closed_at: datetime | None = None
    notes: list[str] = field(default_factory=list)


@dataclass
class PaperPortfolio:
    balance_usd: float
    positions: list[PaperPosition] = field(default_factory=list)
    realized_pnl: float = 0.0
    fees_paid: float = 0.0
    trades: list[dict[str, Any]] = field(default_factory=list)

    @property
    def open_positions(self) -> list[PaperPosition]:
        return [p for p in self.positions if p.status == "open"]


class PaperTradingEngine:
    def __init__(self, config: PaperConfig | None = None) -> None:
        self.config = config or PaperConfig()
        self.portfolio = PaperPortfolio(balance_usd=self.config.starting_balance_usd)

    def _cost_model(self, notional: float, liquidity_usd: float | None) -> tuple[float, float, list[str]]:
        notes: list[str] = []
        fees = self.config.base_fee_usd + self.config.priority_fee_usd
        fees += notional * (self.config.platform_fee_bps / 10_000.0)
        slip_bps = self.config.base_slippage_bps + notional * self.config.impact_bps_per_usd
        if liquidity_usd is not None and liquidity_usd > 0:
            impact = min(500.0, (notional / liquidity_usd) * 10_000.0)
            slip_bps += impact
            notes.append(f"liquidity_impact_bps≈{impact:.1f}")
        else:
            slip_bps += 100.0
            notes.append("liquidity unknown — added conservative slippage buffer")
        notes.append(f"fees_usd={fees:.4f}")
        notes.append(f"slippage_bps={slip_bps:.1f}")
        return fees, slip_bps, notes

    def open_long(
        self,
        mint: str,
        symbol: str,
        mark_price: float,
        notional_usd: float | None = None,
        liquidity_usd: float | None = None,
        as_of: datetime | None = None,
    ) -> PaperPosition | None:
        if mark_price <= 0:
            return None
        if len(self.portfolio.open_positions) >= self.config.max_open_positions:
            return None
        notional = min(
            notional_usd or self.config.max_position_usd,
            self.config.max_position_usd,
            self.portfolio.balance_usd,
        )
        if notional < 0.5:
            return None

        fees, slip_bps, notes = self._cost_model(notional, liquidity_usd)
        fill_price = mark_price * (1.0 + slip_bps / 10_000.0)
        spend = notional + fees
        if spend > self.portfolio.balance_usd:
            notional = max(0.0, self.portfolio.balance_usd - fees)
            if notional < 0.5:
                return None
            spend = notional + fees
            fill_price = mark_price * (1.0 + slip_bps / 10_000.0)

        qty = notional / fill_price
        self.portfolio.balance_usd -= spend
        self.portfolio.fees_paid += fees
        pos = PaperPosition(
            id=str(uuid4()),
            mint=mint,
            symbol=symbol,
            qty=qty,
            entry_price=fill_price,
            entry_notional=notional,
            fees_paid=fees,
            opened_at=as_of or utcnow(),
            notes=notes,
        )
        self.portfolio.positions.append(pos)
        self.portfolio.trades.append(
            {
                "side": "buy",
                "mint": mint,
                "price": fill_price,
                "notional": notional,
                "fees": fees,
                "at": pos.opened_at.isoformat(),
                "mark_price": mark_price,
                "notes": notes,
            }
        )
        return pos

    def close_position(
        self,
        position_id: str,
        mark_price: float,
        liquidity_usd: float | None = None,
        as_of: datetime | None = None,
        fraction: float = 1.0,
    ) -> PaperPosition | None:
        pos = next((p for p in self.portfolio.positions if p.id == position_id and p.status == "open"), None)
        if pos is None or mark_price <= 0:
            return None
        fraction = max(0.0, min(1.0, fraction))
        if fraction <= 0:
            return None

        notional_mark = pos.qty * fraction * mark_price
        fees, slip_bps, notes = self._cost_model(notional_mark, liquidity_usd)
        fill_price = mark_price * (1.0 - slip_bps / 10_000.0)
        proceeds = pos.qty * fraction * fill_price - fees
        cost_basis = pos.entry_notional * fraction
        pnl = proceeds - cost_basis

        self.portfolio.balance_usd += max(0.0, proceeds)
        self.portfolio.fees_paid += fees
        self.portfolio.realized_pnl += pnl

        if fraction >= 0.999:
            pos.status = "closed"
            pos.exit_price = fill_price
            pos.realized_pnl = pnl
            pos.closed_at = as_of or utcnow()
            pos.notes.extend(notes)
        else:
            pos.qty *= 1.0 - fraction
            pos.entry_notional *= 1.0 - fraction
            pos.notes.append(f"partial_exit fraction={fraction:.2f} pnl={pnl:.4f}")

        self.portfolio.trades.append(
            {
                "side": "sell",
                "mint": pos.mint,
                "price": fill_price,
                "notional": notional_mark,
                "fees": fees,
                "pnl": pnl,
                "at": (as_of or utcnow()).isoformat(),
                "mark_price": mark_price,
                "notes": notes,
            }
        )
        return pos

    def equity(self, marks: dict[str, float]) -> float:
        eq = self.portfolio.balance_usd
        for p in self.portfolio.open_positions:
            px = marks.get(p.mint)
            if px is not None:
                eq += p.qty * px
            else:
                # mark unavailable — count cost basis only, flag elsewhere
                eq += p.entry_notional
        return eq

    def metrics(self, marks: dict[str, float]) -> dict[str, Any]:
        closed = [p for p in self.portfolio.positions if p.status == "closed" and p.realized_pnl is not None]
        wins = [p for p in closed if (p.realized_pnl or 0) > 0]
        losses = [p for p in closed if (p.realized_pnl or 0) <= 0]
        gross_win = sum(p.realized_pnl or 0 for p in wins)
        gross_loss = abs(sum(p.realized_pnl or 0 for p in losses))
        return {
            "balance": round(self.portfolio.balance_usd, 4),
            "equity": round(self.equity(marks), 4),
            "realized_pnl": round(self.portfolio.realized_pnl, 4),
            "fees_paid": round(self.portfolio.fees_paid, 4),
            "open_positions": len(self.portfolio.open_positions),
            "closed_trades": len(closed),
            "win_rate": round(len(wins) / len(closed), 4) if closed else None,
            "profit_factor": round(gross_win / gross_loss, 4) if gross_loss > 0 else None,
            "avg_winner": round(gross_win / len(wins), 4) if wins else None,
            "avg_loser": round((-gross_loss / len(losses)), 4) if losses else None,
            "starting_balance": self.config.starting_balance_usd,
        }
