"""Bybit feature / chase-risk unit tests (no network required)."""

from datetime import datetime, timezone

from app.providers.bybit import BybitSpotService, SymbolState, TickSample


def test_chase_vs_early_acceleration():
    svc = BybitSpotService()
    now = datetime.now(timezone.utc).timestamp()

    # Overextended vertical move
    over = SymbolState(symbol="PUMPUSDT", base="PUMP")
    over.last_price = 1.94
    over.updated_at = datetime.now(timezone.utc)
    over.bid1_size = 10
    over.ask1_size = 40
    for i in range(40):
        # +90% over 15m-ish path
        px = 1.0 + (0.94 * i / 39)
        over.samples.append(TickSample(ts=now - (900 - i * 22), price=px, turnover_24h=1000 + i))
    svc.symbols["PUMPUSDT"] = over
    feat_over = svc.compute_features("PUMPUSDT")
    assert feat_over is not None
    assert feat_over["chase_risk"] >= 40
    assert feat_over["status"] in {"DO_NOT_CHASE", "WAIT_FOR_PULLBACK", "WATCH", "CONSIDER_ENTRY"}

    # Early mild acceleration
    early = SymbolState(symbol="EARLYUSDT", base="EARLY")
    early.last_price = 1.06
    early.updated_at = datetime.now(timezone.utc)
    early.bid1_size = 50
    early.ask1_size = 30
    for i in range(40):
        px = 1.0 + (0.06 * i / 39)
        early.samples.append(TickSample(ts=now - (300 - i * 7), price=px, turnover_24h=5000 + i * 20))
    svc.symbols["EARLYUSDT"] = early
    feat_early = svc.compute_features("EARLYUSDT")
    assert feat_early is not None
    assert feat_early["chase_risk"] < feat_over["chase_risk"]
