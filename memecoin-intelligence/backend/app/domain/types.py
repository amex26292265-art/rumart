"""Domain enums and value objects."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class DecisionStatus(str, Enum):
    REJECT = "REJECT"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    WATCH = "WATCH"
    WAIT = "WAIT"
    CONSIDER_ENTRY = "CONSIDER_ENTRY"
    HOLD_MONITOR = "HOLD_MONITOR"
    TAKE_PARTIAL_PROFIT = "TAKE_PARTIAL_PROFIT"
    REDUCE_EXPOSURE = "REDUCE_EXPOSURE"
    EXIT_SIGNAL = "EXIT_SIGNAL"


class SafetyClass(str, Enum):
    PASS = "PASS"
    CAUTION = "CAUTION"
    HIGH_RISK = "HIGH_RISK"
    REJECT = "REJECT"
    INSUFFICIENT = "INSUFFICIENT"


class MomentumState(str, Enum):
    QUIET = "QUIET"
    EARLY_ACTIVITY = "EARLY_ACTIVITY"
    ACCELERATING = "ACCELERATING"
    BREAKOUT = "BREAKOUT"
    OVEREXTENDED = "OVEREXTENDED"
    COOLING = "COOLING"
    DISTRIBUTION = "DISTRIBUTION"
    COLLAPSE = "COLLAPSE"
    UNKNOWN = "UNKNOWN"


class EntryQualityStatus(str, Enum):
    DO_NOT_CHASE = "DO_NOT_CHASE"
    WAIT_FOR_PULLBACK = "WAIT_FOR_PULLBACK"
    WAIT_FOR_CONFIRMATION = "WAIT_FOR_CONFIRMATION"
    ENTRY_SETUP_FORMING = "ENTRY_SETUP_FORMING"
    FAVORABLE_RISK_REWARD = "FAVORABLE_RISK_REWARD"
    UNKNOWN = "UNKNOWN"


class WalletClass(str, Enum):
    UNKNOWN = "UNKNOWN"
    NEW = "NEW"
    RETAIL = "RETAIL"
    ACTIVE_TRADER = "ACTIVE_TRADER"
    PROFITABLE_TRADER = "PROFITABLE_TRADER"
    HIGH_CONVICTION = "HIGH_CONVICTION"
    WHALE = "WHALE"
    SNIPER = "SNIPER"
    BUNDLED_SUSPICIOUS = "BUNDLED_SUSPICIOUS"
    INSIDER_LINKED = "INSIDER_LINKED"
    DEV_LINKED = "DEV_LINKED"


class NarrativeLinkClass(str, Enum):
    OFFICIAL_VERIFIED = "OFFICIAL_VERIFIED"
    CONNECTED_UNVERIFIED = "CONNECTED_UNVERIFIED"
    COPYCAT = "COPYCAT"
    UNKNOWN = "UNKNOWN"


class SocialAuthenticity(str, Enum):
    ORGANIC_TREND = "ORGANIC_TREND"
    INFLUENCER_DRIVEN = "INFLUENCER_DRIVEN"
    PAID_PROMOTED = "PAID_PROMOTED"
    BOT_LIKE = "BOT_LIKE"
    COORDINATED = "COORDINATED"
    UNKNOWN = "UNKNOWN"


BASELINE_WEIGHTS: dict[str, float] = {
    "market_momentum": 0.20,
    "buyer_quality": 0.15,
    "unique_buyer_growth": 0.10,
    "liquidity_quality": 0.10,
    "social_momentum": 0.10,
    "narrative_strength": 0.10,
    "wallet_smart_money": 0.10,
    "holder_distribution": 0.05,
    "contract_safety": 0.05,
    "dev_insider_behavior": 0.05,
}

WEIGHTS_VERSION = "baseline-v1"


class ScoreContribution(BaseModel):
    factor: str
    weight: float | None = None
    raw: float
    weighted: float
    note: str | None = None


class AnalysisResult(BaseModel):
    mint: str
    opportunity_score: float | None = None
    confidence: float | None = None
    risk_score: float | None = None
    entry_quality: float | None = None
    entry_status: EntryQualityStatus = EntryQualityStatus.UNKNOWN
    momentum_state: MomentumState = MomentumState.UNKNOWN
    safety_class: SafetyClass = SafetyClass.INSUFFICIENT
    decision: DecisionStatus = DecisionStatus.INSUFFICIENT_DATA
    contributions: list[ScoreContribution] = Field(default_factory=list)
    why: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    what_changed: list[str] = Field(default_factory=list)
    invalidation: list[str] = Field(default_factory=list)
    weights_version: str = WEIGHTS_VERSION
    data_quality: str = "UNKNOWN"
