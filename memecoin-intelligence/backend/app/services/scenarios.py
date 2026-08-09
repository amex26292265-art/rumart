"""Labeled mock scenarios for Phase 1 UI + tests. NEVER presented as live chain data."""

from __future__ import annotations

from copy import deepcopy
from datetime import timedelta

from app.core.resilience import utcnow
from app.domain.types import AnalysisResult, DecisionStatus, EntryQualityStatus, MomentumState, SafetyClass
from app.engines.decision import DecisionEngine, DecisionInput
from app.engines.risk import RiskEngine, RiskInput
from app.engines.scoring import FeatureSet, ScoringEngine


SCENARIO_SOURCE = "mock.scenario"


def _base_token(mint: str, symbol: str, name: str, age_min: float, **market: object) -> dict:
    now = utcnow()
    return {
        "mint": mint,
        "symbol": symbol,
        "name": name,
        "age_minutes": age_min,
        "detected_at": (now - timedelta(minutes=age_min)).isoformat(),
        "launch_platform": market.get("launch_platform", "pump.fun"),
        "price_usd": market.get("price_usd"),
        "market_cap_usd": market.get("market_cap_usd"),
        "liquidity_usd": market.get("liquidity_usd"),
        "volume_5m": market.get("volume_5m"),
        "buys": market.get("buys"),
        "sells": market.get("sells"),
        "unique_buyers": market.get("unique_buyers"),
        "momentum_label": market.get("momentum_label"),
        "social_label": market.get("social_label"),
        "wallet_label": market.get("wallet_label"),
        "data_source": SCENARIO_SOURCE,
        "provenance": {
            "source": SCENARIO_SOURCE,
            "source_timestamp": now.isoformat(),
            "ingestion_timestamp": now.isoformat(),
            "reliability": 1.0,
            "status": "OK",
            "note": "Synthetic scenario for local demo/tests — not live market data",
        },
    }


def build_scenarios() -> list[dict]:
    """Return scenario tokens with engine-computed analysis."""
    scoring = ScoringEngine()
    risk_engine = RiskEngine()
    decision_engine = DecisionEngine()

    defs = [
        {
            "token": _base_token(
                "ScenarioOrganic111111111111111111111111111",
                "ORGN",
                "Organic Breakout",
                11,
                price_usd=0.00042,
                market_cap_usd=85_000,
                liquidity_usd=28_000,
                volume_5m=42_000,
                buys=180,
                sells=70,
                unique_buyers=96,
                momentum_label="ACCELERATING",
                social_label="ORGANIC",
                wallet_label="ACCUMULATION",
            ),
            "features": FeatureSet(
                market_momentum=0.82,
                buyer_quality=0.7,
                unique_buyer_growth=0.78,
                liquidity_quality=0.72,
                social_momentum=0.65,
                narrative_strength=0.7,
                wallet_smart_money=0.6,
                holder_distribution=0.68,
                contract_safety=0.8,
                dev_insider_behavior=0.75,
                penalties={},
                independent_sources=4,
                sample_size=96,
                token_age_minutes=11,
                signal_agreement=0.8,
                price_extension=0.35,
                pullback_quality=0.55,
                volume_returning=True,
            ),
            "risk": RiskInput(
                mint="ScenarioOrganic111111111111111111111111111",
                mint_authority=None,
                freeze_authority=None,
                mint_authority_known=True,
                freeze_authority_known=True,
                top_holder_pct=[8, 5, 4, 3, 2, 2, 2, 1, 1, 1],
                liquidity_usd=28_000,
                liquidity_change_pct=22,
                suspected_bundle_pct=6,
                wash_trade_score=10,
                honeypot_suspected=False,
                deployer_sold_pct=0,
                unique_buyers=96,
                volume_5m=42_000,
            ),
            "bucket": "opportunity",
        },
        {
            "token": _base_token(
                "ScenarioWash222222222222222222222222222222",
                "WASH",
                "Wash Traded Pump",
                8,
                price_usd=0.0011,
                market_cap_usd=210_000,
                liquidity_usd=9_000,
                volume_5m=120_000,
                buys=40,
                sells=38,
                unique_buyers=4,
                momentum_label="OVEREXTENDED",
                social_label="BOT_LIKE",
                wallet_label="SUSPICIOUS",
            ),
            "features": FeatureSet(
                market_momentum=0.9,
                buyer_quality=0.1,
                unique_buyer_growth=0.1,
                liquidity_quality=0.25,
                social_momentum=0.85,
                narrative_strength=0.2,
                wallet_smart_money=0.05,
                holder_distribution=0.2,
                contract_safety=0.4,
                dev_insider_behavior=0.2,
                penalties={"wash_trading": 20, "bot_social": 12},
                independent_sources=2,
                sample_size=4,
                token_age_minutes=8,
                signal_agreement=0.2,
                price_extension=0.92,
                pullback_quality=0.1,
                volume_returning=False,
            ),
            "risk": RiskInput(
                mint="ScenarioWash222222222222222222222222222222",
                mint_authority="StillActive111",
                freeze_authority=None,
                mint_authority_known=True,
                freeze_authority_known=True,
                top_holder_pct=[42, 18, 9, 5, 4],
                liquidity_usd=9_000,
                liquidity_change_pct=-5,
                suspected_bundle_pct=28,
                wash_trade_score=88,
                honeypot_suspected=False,
                deployer_sold_pct=15,
                unique_buyers=4,
                volume_5m=120_000,
            ),
            "bucket": "rejected",
        },
        {
            "token": _base_token(
                "ScenarioRug3333333333333333333333333333333",
                "RUGX",
                "Liquidity Rug Pattern",
                6,
                price_usd=0.00005,
                market_cap_usd=12_000,
                liquidity_usd=800,
                volume_5m=3_000,
                buys=20,
                sells=55,
                unique_buyers=12,
                momentum_label="COLLAPSE",
                social_label="COORDINATED",
                wallet_label="DISTRIBUTION",
            ),
            "features": FeatureSet(
                market_momentum=0.1,
                buyer_quality=0.05,
                unique_buyer_growth=0.05,
                liquidity_quality=0.05,
                social_momentum=0.4,
                narrative_strength=0.1,
                wallet_smart_money=0.0,
                holder_distribution=0.1,
                contract_safety=0.1,
                dev_insider_behavior=0.0,
                penalties={"liquidity_deterioration": 20, "dev_dumping": 20},
                independent_sources=3,
                sample_size=12,
                token_age_minutes=6,
                signal_agreement=0.7,
                price_extension=0.2,
                pullback_quality=0.1,
                volume_returning=False,
            ),
            "risk": RiskInput(
                mint="ScenarioRug3333333333333333333333333333333",
                mint_authority=None,
                freeze_authority=None,
                mint_authority_known=True,
                freeze_authority_known=True,
                top_holder_pct=[55, 10, 5],
                liquidity_usd=800,
                liquidity_change_pct=-85,
                suspected_bundle_pct=45,
                wash_trade_score=40,
                honeypot_suspected=False,
                deployer_sold_pct=80,
                unique_buyers=12,
                volume_5m=3_000,
            ),
            "bucket": "rejected",
        },
        {
            "token": _base_token(
                "ScenarioChase44444444444444444444444444444",
                "CHASE",
                "Parabolic Chase Trap",
                18,
                price_usd=0.0088,
                market_cap_usd=1_200_000,
                liquidity_usd=90_000,
                volume_5m=200_000,
                buys=300,
                sells=260,
                unique_buyers=140,
                momentum_label="OVEREXTENDED",
                social_label="INFLUENCER",
                wallet_label="MIXED",
            ),
            "features": FeatureSet(
                market_momentum=0.75,
                buyer_quality=0.55,
                unique_buyer_growth=0.4,
                liquidity_quality=0.7,
                social_momentum=0.8,
                narrative_strength=0.75,
                wallet_smart_money=0.35,
                holder_distribution=0.55,
                contract_safety=0.7,
                dev_insider_behavior=0.6,
                penalties={"overextended_price": 10},
                independent_sources=4,
                sample_size=140,
                token_age_minutes=18,
                signal_agreement=0.55,
                price_extension=0.9,
                pullback_quality=0.15,
                volume_returning=False,
            ),
            "risk": RiskInput(
                mint="ScenarioChase44444444444444444444444444444",
                mint_authority=None,
                freeze_authority=None,
                mint_authority_known=True,
                freeze_authority_known=True,
                top_holder_pct=[12, 7, 5, 4, 3, 3, 2, 2, 2, 2],
                liquidity_usd=90_000,
                liquidity_change_pct=5,
                suspected_bundle_pct=8,
                wash_trade_score=20,
                honeypot_suspected=False,
                deployer_sold_pct=5,
                unique_buyers=140,
                volume_5m=200_000,
            ),
            "bucket": "opportunity",
        },
        {
            "token": _base_token(
                "ScenarioInsuf55555555555555555555555555555",
                "IDK",
                "Insufficient Data Token",
                3,
                price_usd=None,
                market_cap_usd=None,
                liquidity_usd=None,
                volume_5m=None,
                buys=None,
                sells=None,
                unique_buyers=None,
                momentum_label="UNKNOWN",
                social_label="UNKNOWN",
                wallet_label="UNKNOWN",
            ),
            "features": FeatureSet(
                independent_sources=0,
                sample_size=0,
                token_age_minutes=3,
            ),
            "risk": RiskInput(
                mint="ScenarioInsuf55555555555555555555555555555",
                mint_authority_known=False,
                freeze_authority_known=False,
            ),
            "bucket": "new",
        },
    ]

    out: list[dict] = []
    for d in defs:
        token = deepcopy(d["token"])
        risk = risk_engine.evaluate(d["risk"])
        score = scoring.score(d["features"])
        decision = decision_engine.decide(
            DecisionInput(
                mint=token["mint"],
                score=score,
                safety_class=risk.safety_class,
                risk_reasons=risk.reasons,
            )
        )
        analysis = AnalysisResult(
            mint=token["mint"],
            opportunity_score=score.opportunity_score,
            confidence=score.confidence,
            risk_score=risk.composite,
            entry_quality=score.entry_quality,
            entry_status=score.entry_status,
            momentum_state=score.momentum_state,
            safety_class=risk.safety_class,
            decision=decision.decision,
            contributions=score.contributions,
            why=decision.why,
            risks=decision.risks,
            evidence=decision.evidence + risk.evidence,
            what_changed=decision.what_changed,
            invalidation=decision.invalidation,
            weights_version=score.weights_version,
            data_quality=score.data_quality,
        )
        token["bucket"] = d["bucket"]
        token["analysis"] = analysis.model_dump()
        token["risk_breakdown"] = {
            "insider_risk": risk.insider_risk,
            "dev_risk": risk.dev_risk,
            "bundle_risk": risk.bundle_risk,
            "concentration_risk": risk.concentration_risk,
            "composite": risk.composite,
            "safety_class": risk.safety_class.value,
            "reasons": risk.reasons,
        }
        # Rejected tokens must not appear as recommended candidates
        if risk.safety_class == SafetyClass.REJECT:
            token["bucket"] = "rejected"
            if analysis.decision != DecisionStatus.REJECT:
                token["analysis"]["decision"] = DecisionStatus.REJECT.value
        out.append(token)
    return out


def narrative_scenarios() -> list[dict]:
    now = utcnow()
    return [
        {
            "id": "nar-organic-demo",
            "title": "Demo narrative: viral animal clip (SCENARIO)",
            "narrative_score": 78,
            "freshness": 0.9,
            "social_velocity": 0.7,
            "source_credibility": 0.6,
            "crypto_relevance": 0.55,
            "token_connection_strength": 0.5,
            "link_class": "CONNECTED_UNVERIFIED",
            "summary": "Labeled scenario only — not live breaking news.",
            "source": SCENARIO_SOURCE,
            "detected_at": now.isoformat(),
            "urls": [],
        }
    ]
