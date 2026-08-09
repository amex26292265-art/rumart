"""Opportunity scoring + confidence + entry quality."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.domain.types import (
    BASELINE_WEIGHTS,
    WEIGHTS_VERSION,
    EntryQualityStatus,
    MomentumState,
    ScoreContribution,
)


@dataclass
class FeatureSet:
    """Normalized 0-1 features. None means missing — never invent."""

    market_momentum: float | None = None
    buyer_quality: float | None = None
    unique_buyer_growth: float | None = None
    liquidity_quality: float | None = None
    social_momentum: float | None = None
    narrative_strength: float | None = None
    wallet_smart_money: float | None = None
    holder_distribution: float | None = None
    contract_safety: float | None = None
    dev_insider_behavior: float | None = None
    # penalties as absolute points to subtract (0-100 scale)
    penalties: dict[str, float] = field(default_factory=dict)
    # meta for confidence
    independent_sources: int = 0
    sample_size: int = 0
    token_age_minutes: float | None = None
    signal_agreement: float | None = None  # 0-1
    # entry
    price_extension: float | None = None  # 0=flat, 1=parabolic
    pullback_quality: float | None = None
    volume_returning: bool | None = None


@dataclass
class ScoreResult:
    opportunity_score: float | None
    confidence: float | None
    entry_quality: float | None
    entry_status: EntryQualityStatus
    momentum_state: MomentumState
    contributions: list[ScoreContribution]
    weights_version: str
    present_factors: int
    total_factors: int
    data_quality: str


def _momentum_state(f: FeatureSet) -> MomentumState:
    mm = f.market_momentum
    ub = f.unique_buyer_growth
    if mm is None and ub is None:
        return MomentumState.UNKNOWN
    mm = mm if mm is not None else 0.0
    ub = ub if ub is not None else 0.0
    if mm < 0.15 and ub < 0.15:
        return MomentumState.QUIET
    if f.price_extension is not None and f.price_extension > 0.85 and (ub < 0.4 or mm < 0.4):
        return MomentumState.OVEREXTENDED
    if mm > 0.75 and ub > 0.6:
        return MomentumState.BREAKOUT
    if mm > 0.55 and ub > 0.45:
        return MomentumState.ACCELERATING
    if mm > 0.3:
        return MomentumState.EARLY_ACTIVITY
    if mm < 0.25 and ub < 0.2:
        return MomentumState.COOLING
    return MomentumState.EARLY_ACTIVITY


class ScoringEngine:
    def __init__(self, weights: dict[str, float] | None = None) -> None:
        self.weights = dict(weights or BASELINE_WEIGHTS)
        total = sum(self.weights.values())
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"weights must sum to 1.0, got {total}")

    def score(self, features: FeatureSet) -> ScoreResult:
        contributions: list[ScoreContribution] = []
        weighted_sum = 0.0
        weight_present = 0.0
        present = 0

        for name, weight in self.weights.items():
            raw = getattr(features, name)
            if raw is None:
                contributions.append(
                    ScoreContribution(
                        factor=name,
                        weight=weight,
                        raw=0.0,
                        weighted=0.0,
                        note="MISSING",
                    )
                )
                continue
            raw_c = max(0.0, min(1.0, float(raw)))
            w = weight * raw_c * 100.0
            weighted_sum += w
            weight_present += weight
            present += 1
            contributions.append(
                ScoreContribution(factor=name, weight=weight, raw=raw_c, weighted=round(w, 3))
            )

        opportunity: float | None
        if present == 0:
            opportunity = None
            data_quality = "INSUFFICIENT"
        else:
            # Rescale by present weights so missing features don't silently become zeros
            opportunity = weighted_sum / weight_present if weight_present > 0 else None
            data_quality = "PARTIAL" if present < len(self.weights) else "COMPLETE"

        penalty_total = 0.0
        for pname, pval in features.penalties.items():
            p = max(0.0, float(pval))
            penalty_total += p
            contributions.append(
                ScoreContribution(
                    factor=f"penalty_{pname}",
                    weight=None,
                    raw=-p,
                    weighted=-p,
                )
            )

        if opportunity is not None:
            opportunity = max(0.0, min(100.0, opportunity - penalty_total))

        confidence = self._confidence(features, present)
        entry_quality, entry_status = self._entry(features)
        momentum = _momentum_state(features)

        return ScoreResult(
            opportunity_score=None if opportunity is None else round(opportunity, 2),
            confidence=confidence,
            entry_quality=entry_quality,
            entry_status=entry_status,
            momentum_state=momentum,
            contributions=contributions,
            weights_version=WEIGHTS_VERSION,
            present_factors=present,
            total_factors=len(self.weights),
            data_quality=data_quality,
        )

    def _confidence(self, features: FeatureSet, present: int) -> float | None:
        if present == 0:
            return 0.0
        completeness = present / len(self.weights)
        source_factor = min(1.0, features.independent_sources / 4.0)
        sample_factor = min(1.0, features.sample_size / 50.0) if features.sample_size else 0.15
        age_factor = 1.0
        if features.token_age_minutes is not None:
            # very new tokens: lower confidence unless dense samples
            if features.token_age_minutes < 10:
                age_factor = 0.55 if features.sample_size >= 30 else 0.35
            elif features.token_age_minutes < 60:
                age_factor = 0.75
        agreement = features.signal_agreement if features.signal_agreement is not None else 0.5
        conf = 100.0 * (
            0.35 * completeness
            + 0.25 * source_factor
            + 0.20 * sample_factor
            + 0.10 * age_factor
            + 0.10 * agreement
        )
        return round(max(0.0, min(100.0, conf)), 1)

    def _entry(self, features: FeatureSet) -> tuple[float | None, EntryQualityStatus]:
        if features.price_extension is None and features.pullback_quality is None:
            return None, EntryQualityStatus.UNKNOWN
        ext = features.price_extension if features.price_extension is not None else 0.5
        pull = features.pullback_quality if features.pullback_quality is not None else 0.3
        vol_bonus = 0.1 if features.volume_returning else 0.0
        quality = max(0.0, min(100.0, (1.0 - ext) * 55 + pull * 35 + vol_bonus * 100))
        if ext >= 0.85:
            status = EntryQualityStatus.DO_NOT_CHASE
        elif ext >= 0.65 and pull < 0.4:
            status = EntryQualityStatus.WAIT_FOR_PULLBACK
        elif pull >= 0.6 and features.volume_returning:
            status = EntryQualityStatus.FAVORABLE_RISK_REWARD
        elif pull >= 0.45:
            status = EntryQualityStatus.ENTRY_SETUP_FORMING
        else:
            status = EntryQualityStatus.WAIT_FOR_CONFIRMATION
        return round(quality, 1), status
