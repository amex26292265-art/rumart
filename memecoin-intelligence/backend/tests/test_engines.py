"""Unit tests — scoring, risk, paper, look-ahead, decision."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.domain.types import DecisionStatus, SafetyClass
from app.engines.decision import DecisionEngine, DecisionInput
from app.engines.lookahead import LookAheadError, ensure_not_future, filter_available
from app.engines.paper import PaperConfig, PaperTradingEngine
from app.engines.risk import RiskEngine, RiskInput
from app.engines.scoring import FeatureSet, ScoringEngine
from app.services.scenarios import build_scenarios


def test_weights_sum_to_one():
    ScoringEngine()  # raises if invalid


def test_scoring_missing_features_insufficient():
    result = ScoringEngine().score(FeatureSet())
    assert result.opportunity_score is None
    assert result.data_quality == "INSUFFICIENT"
    assert result.confidence == 0.0


def test_scoring_contributions_and_penalties():
    features = FeatureSet(
        market_momentum=1.0,
        buyer_quality=1.0,
        unique_buyer_growth=1.0,
        liquidity_quality=1.0,
        social_momentum=1.0,
        narrative_strength=1.0,
        wallet_smart_money=1.0,
        holder_distribution=1.0,
        contract_safety=1.0,
        dev_insider_behavior=1.0,
        penalties={"bundling": 10},
        independent_sources=4,
        sample_size=80,
        token_age_minutes=30,
        signal_agreement=1.0,
        price_extension=0.2,
        pullback_quality=0.7,
        volume_returning=True,
    )
    result = ScoringEngine().score(features)
    assert result.opportunity_score == pytest.approx(90.0, abs=0.01)
    assert any(c.factor == "penalty_bundling" for c in result.contributions)
    assert result.confidence and result.confidence > 50


def test_risk_reject_on_wash_and_concentration():
    risk = RiskEngine().evaluate(
        RiskInput(
            mint="x",
            mint_authority_known=True,
            freeze_authority_known=True,
            mint_authority=None,
            freeze_authority=None,
            top_holder_pct=[55, 10],
            liquidity_usd=1000,
            wash_trade_score=90,
            suspected_bundle_pct=10,
            honeypot_suspected=False,
            deployer_sold_pct=0,
        )
    )
    assert risk.safety_class == SafetyClass.REJECT


def test_risk_insufficient_without_authorities():
    risk = RiskEngine().evaluate(RiskInput(mint="y"))
    assert risk.safety_class == SafetyClass.INSUFFICIENT


def test_decision_never_recommends_reject_safety():
    score = ScoringEngine().score(
        FeatureSet(
            market_momentum=0.9,
            buyer_quality=0.9,
            unique_buyer_growth=0.9,
            liquidity_quality=0.9,
            social_momentum=0.9,
            narrative_strength=0.9,
            wallet_smart_money=0.9,
            holder_distribution=0.9,
            contract_safety=0.9,
            dev_insider_behavior=0.9,
            independent_sources=4,
            sample_size=100,
            token_age_minutes=20,
            signal_agreement=0.9,
            price_extension=0.3,
            pullback_quality=0.6,
            volume_returning=True,
        )
    )
    out = DecisionEngine().decide(
        DecisionInput(mint="z", score=score, safety_class=SafetyClass.REJECT, risk_reasons=["bad"])
    )
    assert out.decision == DecisionStatus.REJECT


def test_decision_wait_on_chase():
    score = ScoringEngine().score(
        FeatureSet(
            market_momentum=0.8,
            buyer_quality=0.7,
            unique_buyer_growth=0.6,
            liquidity_quality=0.7,
            social_momentum=0.7,
            narrative_strength=0.7,
            wallet_smart_money=0.5,
            holder_distribution=0.6,
            contract_safety=0.7,
            dev_insider_behavior=0.6,
            independent_sources=3,
            sample_size=50,
            token_age_minutes=15,
            signal_agreement=0.6,
            price_extension=0.9,
            pullback_quality=0.1,
            volume_returning=False,
        )
    )
    out = DecisionEngine().decide(
        DecisionInput(mint="c", score=score, safety_class=SafetyClass.PASS, risk_reasons=[])
    )
    assert out.decision == DecisionStatus.WAIT


def test_paper_trading_applies_fees_and_slippage():
    engine = PaperTradingEngine(PaperConfig(starting_balance_usd=40, max_position_usd=5))
    pos = engine.open_long("mint", "AAA", mark_price=1.0, notional_usd=5.0, liquidity_usd=10_000)
    assert pos is not None
    assert pos.entry_price > 1.0  # slippage on buy
    assert engine.portfolio.balance_usd < 40
    assert engine.portfolio.fees_paid > 0
    closed = engine.close_position(pos.id, mark_price=1.1, liquidity_usd=10_000)
    assert closed is not None
    assert closed.status == "closed"


def test_paper_blocks_when_broke():
    engine = PaperTradingEngine(PaperConfig(starting_balance_usd=0.2, max_position_usd=5))
    assert engine.open_long("m", "X", mark_price=1.0) is None


def test_lookahead_blocks_future():
    as_of = datetime(2026, 8, 9, 12, 0, tzinfo=timezone.utc)
    future = as_of + timedelta(minutes=5)
    with pytest.raises(LookAheadError):
        ensure_not_future(future, as_of, label="candle")


def test_filter_available_excludes_future():
    as_of = datetime(2026, 8, 9, 12, 0, tzinfo=timezone.utc)
    items = [
        {"t": (as_of - timedelta(minutes=1)).isoformat(), "v": 1},
        {"t": (as_of + timedelta(minutes=1)).isoformat(), "v": 2},
    ]
    kept = filter_available(items, "t", as_of)
    assert len(kept) == 1
    assert kept[0]["v"] == 1


def test_scenarios_rejected_not_in_opportunity_bucket():
    scenarios = build_scenarios()
    for t in scenarios:
        if t["analysis"]["safety_class"] == "REJECT":
            assert t["bucket"] == "rejected"
            assert t["analysis"]["decision"] == "REJECT"
    # organic should be opportunity-ish
    organic = next(t for t in scenarios if t["symbol"] == "ORGN")
    assert organic["bucket"] == "opportunity"
    assert organic["data_source"] == "mock.scenario"
