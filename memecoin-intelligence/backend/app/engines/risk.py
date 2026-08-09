"""Risk / safety engine — explainable, never silent-pass on missing critical data."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.domain.types import SafetyClass


@dataclass
class RiskInput:
    mint: str
    mint_authority: str | None = None
    freeze_authority: str | None = None
    mint_authority_known: bool = False
    freeze_authority_known: bool = False
    top_holder_pct: list[float] = field(default_factory=list)
    liquidity_usd: float | None = None
    liquidity_change_pct: float | None = None
    suspected_bundle_pct: float | None = None
    wash_trade_score: float | None = None
    honeypot_suspected: bool | None = None
    deployer_sold_pct: float | None = None
    unique_buyers: int | None = None
    volume_5m: float | None = None
    require_renounced_mint: bool = False


@dataclass
class RiskBreakdown:
    insider_risk: float | None
    dev_risk: float | None
    bundle_risk: float | None
    concentration_risk: float | None
    composite: float | None
    safety_class: SafetyClass
    reasons: list[str] = field(default_factory=list)
    evidence: list[dict[str, Any]] = field(default_factory=list)


def _clamp(x: float) -> float:
    return max(0.0, min(100.0, x))


class RiskEngine:
    def evaluate(self, inp: RiskInput) -> RiskBreakdown:
        reasons: list[str] = []
        evidence: list[dict[str, Any]] = []
        hard_reject = False
        insufficient = False

        # Honeypot
        if inp.honeypot_suspected is True:
            hard_reject = True
            reasons.append("Honeypot / sell restriction suspected by safety check")
            evidence.append({"id": "honeypot", "value": True})

        # Authorities
        if not inp.mint_authority_known or not inp.freeze_authority_known:
            insufficient = True
            reasons.append("INSUFFICIENT: mint/freeze authority data unavailable")
        else:
            if inp.require_renounced_mint and inp.mint_authority is not None:
                hard_reject = True
                reasons.append("Mint authority still active while policy requires renounce")
            if inp.freeze_authority is not None:
                reasons.append("Freeze authority present — CAUTION")
                evidence.append({"id": "freeze_authority", "value": inp.freeze_authority})

        # Concentration
        concentration_risk: float | None = None
        if not inp.top_holder_pct:
            insufficient = True
            reasons.append("INSUFFICIENT: holder distribution unavailable")
        else:
            top1 = inp.top_holder_pct[0]
            top10 = sum(inp.top_holder_pct[:10])
            concentration_risk = _clamp(top1 * 1.2 + max(0.0, top10 - 40) * 0.8)
            evidence.append({"id": "top_holders", "top1": top1, "top10": top10})
            if top1 >= 50:
                hard_reject = True
                reasons.append(f"Extreme concentration: top holder owns {top1:.1f}%")
            elif top10 >= 70:
                reasons.append(f"High concentration: top 10 own {top10:.1f}%")

        # Bundle
        bundle_risk: float | None = None
        if inp.suspected_bundle_pct is None:
            reasons.append("UNKNOWN: bundle metrics unavailable")
        else:
            bundle_risk = _clamp(inp.suspected_bundle_pct * 1.5)
            evidence.append({"id": "bundle_pct", "value": inp.suspected_bundle_pct})
            if inp.suspected_bundle_pct >= 40:
                hard_reject = True
                reasons.append(f"Bundled/suspicious early supply control ~{inp.suspected_bundle_pct:.0f}%")
            elif inp.suspected_bundle_pct >= 15:
                reasons.append(f"Elevated suspected bundled wallets ~{inp.suspected_bundle_pct:.0f}%")

        # Wash
        if inp.wash_trade_score is not None and inp.wash_trade_score >= 80:
            hard_reject = True
            reasons.append("Wash trading heuristics elevated")
            evidence.append({"id": "wash_trade_score", "value": inp.wash_trade_score})

        # Liquidity collapse
        if inp.liquidity_change_pct is not None and inp.liquidity_change_pct <= -70:
            hard_reject = True
            reasons.append(f"Liquidity collapsed {inp.liquidity_change_pct:.0f}%")
        if inp.liquidity_usd is None:
            insufficient = True
            reasons.append("INSUFFICIENT: liquidity unknown")

        # Dev dump
        dev_risk: float | None = None
        if inp.deployer_sold_pct is None:
            reasons.append("UNKNOWN: deployer sales unavailable")
        else:
            dev_risk = _clamp(inp.deployer_sold_pct * 1.4)
            evidence.append({"id": "deployer_sold_pct", "value": inp.deployer_sold_pct})
            if inp.deployer_sold_pct >= 60:
                hard_reject = True
                reasons.append(f"Deployer sold {inp.deployer_sold_pct:.0f}% of holdings")
            elif inp.deployer_sold_pct >= 20:
                reasons.append(f"Deployer selling detected ({inp.deployer_sold_pct:.0f}%)")

        # Fake volume heuristic
        if (
            inp.volume_5m is not None
            and inp.unique_buyers is not None
            and inp.volume_5m > 50_000
            and inp.unique_buyers < 5
        ):
            reasons.append("Volume high vs very few unique buyers — possible fake volume")
            if inp.wash_trade_score is None:
                # elevate suspicion but don't invent a wash score
                pass

        insider_risk: float | None = None
        if bundle_risk is not None or (inp.top_holder_pct and inp.top_holder_pct[0] > 20):
            parts = [x for x in [bundle_risk, concentration_risk] if x is not None]
            insider_risk = _clamp(sum(parts) / len(parts)) if parts else None

        components = [c for c in [insider_risk, dev_risk, bundle_risk, concentration_risk] if c is not None]
        composite = _clamp(sum(components) / len(components)) if components else None

        if hard_reject:
            safety = SafetyClass.REJECT
        elif insufficient and composite is None:
            safety = SafetyClass.INSUFFICIENT
        elif composite is not None and composite >= 75:
            safety = SafetyClass.HIGH_RISK
        elif composite is not None and composite >= 45:
            safety = SafetyClass.CAUTION
        elif insufficient:
            safety = SafetyClass.INSUFFICIENT
        else:
            safety = SafetyClass.PASS
            if not reasons:
                reasons.append("No critical safety red flags in available data")

        return RiskBreakdown(
            insider_risk=insider_risk,
            dev_risk=dev_risk,
            bundle_risk=bundle_risk,
            concentration_risk=concentration_risk,
            composite=composite,
            safety_class=safety,
            reasons=reasons,
            evidence=evidence,
        )
