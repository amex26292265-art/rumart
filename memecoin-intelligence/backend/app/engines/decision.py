"""Decision engine — maps scores + risk to actionable statuses with explanations."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.domain.types import DecisionStatus, SafetyClass
from app.engines.scoring import ScoreResult


@dataclass
class DecisionInput:
    mint: str
    score: ScoreResult
    safety_class: SafetyClass
    risk_reasons: list[str] = field(default_factory=list)
    prior_decision: DecisionStatus | None = None
    has_open_position: bool = False


@dataclass
class DecisionOutput:
    decision: DecisionStatus
    why: list[str]
    risks: list[str]
    what_changed: list[str]
    invalidation: list[str]
    evidence: list[dict[str, Any]]


class DecisionEngine:
    def decide(self, inp: DecisionInput) -> DecisionOutput:
        s = inp.score
        why: list[str] = []
        risks = list(inp.risk_reasons)
        what_changed: list[str] = []
        invalidation = [
            "volume velocity turns negative",
            "unique buyers collapse",
            "major early wallets begin distributing",
            "liquidity falls rapidly",
            "narrative/social activity collapses",
        ]

        if inp.safety_class == SafetyClass.REJECT:
            return DecisionOutput(
                decision=DecisionStatus.REJECT,
                why=["Failed critical safety checks"],
                risks=risks,
                what_changed=self._changed(inp.prior_decision, DecisionStatus.REJECT),
                invalidation=invalidation,
                evidence=[{"id": "safety_class", "value": inp.safety_class.value}],
            )

        if s.opportunity_score is None or s.data_quality == "INSUFFICIENT":
            return DecisionOutput(
                decision=DecisionStatus.INSUFFICIENT_DATA,
                why=["DATA INSUFFICIENT: critical features missing or unavailable"],
                risks=risks or ["Analysis quality degraded"],
                what_changed=self._changed(inp.prior_decision, DecisionStatus.INSUFFICIENT_DATA),
                invalidation=invalidation,
                evidence=[{"id": "data_quality", "value": s.data_quality}],
            )

        if inp.has_open_position:
            # Exit/hold path is refined in later phases; Phase 1 keeps HOLD unless reject/insufficient
            decision = DecisionStatus.HOLD_MONITOR
            why.append("Open paper position — monitoring thesis")
        elif inp.safety_class in (SafetyClass.HIGH_RISK, SafetyClass.INSUFFICIENT):
            decision = DecisionStatus.WATCH
            why.append(f"Safety class is {inp.safety_class.value}; blocking aggressive entry")
        elif (
            s.opportunity_score >= 70
            and (s.confidence or 0) >= 55
            and s.entry_status.value in {"FAVORABLE_RISK_REWARD", "ENTRY_SETUP_FORMING"}
            and inp.safety_class in {SafetyClass.PASS, SafetyClass.CAUTION}
            and s.present_factors >= 3
        ):
            # Cross-signal: require enough present factors
            decision = DecisionStatus.CONSIDER_ENTRY
            why.append(
                f"Opportunity {s.opportunity_score}/100 with confidence {s.confidence}% "
                f"and entry {s.entry_status.value}"
            )
            why.append(f"Momentum state: {s.momentum_state.value}")
        elif s.opportunity_score >= 60 and s.entry_status.value in {"DO_NOT_CHASE", "WAIT_FOR_PULLBACK"}:
            decision = DecisionStatus.WAIT
            why.append("Token looks interesting but entry quality is poor — do not chase")
            why.append(f"Entry status: {s.entry_status.value}")
        elif s.opportunity_score >= 45:
            decision = DecisionStatus.WATCH
            why.append("Moderate setup — watching for confirmation across independent signals")
        else:
            decision = DecisionStatus.WATCH
            why.append("Opportunity below actionable threshold")

        what_changed = self._changed(inp.prior_decision, decision)
        return DecisionOutput(
            decision=decision,
            why=why,
            risks=risks,
            what_changed=what_changed,
            invalidation=invalidation,
            evidence=[
                {"id": "opportunity_score", "value": s.opportunity_score},
                {"id": "confidence", "value": s.confidence},
                {"id": "entry_status", "value": s.entry_status.value},
                {"id": "safety_class", "value": inp.safety_class.value},
            ],
        )

    def _changed(self, prior: DecisionStatus | None, current: DecisionStatus) -> list[str]:
        if prior is None:
            return ["Initial analysis"]
        if prior == current:
            return ["No decision change since previous analysis"]
        return [f"Decision changed from {prior.value} to {current.value}"]
