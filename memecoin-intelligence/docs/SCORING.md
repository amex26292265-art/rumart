# MEMECOIN INTELLIGENCE — Scoring Model

**Status:** Configurable baseline (not claimed optimal)  
**Rule:** Opportunity Score ≠ Confidence. Both are always shown separately.

Weights are logged with every signal snapshot so later learning can retrain from paper-trading outcomes.

---

## 1. Opportunity Score (0–100)

### Baseline positive factors

| Factor | Default weight | Notes |
| --- | --- | --- |
| Market Momentum | 0.20 | Acceleration-aware, not raw % only |
| Buyer Quality | 0.15 | Wallet class quality of recent buyers |
| Unique Buyer Growth | 0.10 | Unique buyer velocity/acceleration |
| Liquidity Quality | 0.10 | Depth, stability, change direction |
| Social Momentum | 0.10 | Unique authors + engagement acceleration |
| Narrative Strength | 0.10 | Freshness × crypto relevance × connection |
| Wallet / Smart-Money Activity | 0.10 | Requires historical evidence, not one win |
| Holder Distribution | 0.05 | Top holder concentration quality |
| Token / Contract Safety | 0.05 | Mint/freeze/extensions (post risk gate) |
| Dev / Insider Behavior | 0.05 | Non-dumping / clean history contributes |

Weights sum to **1.00**. Stored in `scoring_weights` config + each snapshot.

### Risk penalties (subtracted)

| Penalty | Typical max subtraction | Trigger examples |
| --- | --- | --- |
| Insider concentration | −15 | Early wallets share funding / timing clusters |
| Bundling | −20 | Synchronized first-block buys |
| Wash trading | −25 | Circular volume, low unique participants |
| Bot social activity | −15 | Duplicate text, new accounts, low quality |
| Dev dumping | −25 | Deployer sells into strength |
| Liquidity deterioration | −20 | LP pulled / shrinking rapidly |
| Overextended price | −10 | Parabolic vs demand weakening |
| Abnormal wallet clustering | −15 | Same-fund swarm |

Floor after penalties: **0**. Ceiling: **100**.

### Feature contribution display

Every score response includes:

```json
{
  "opportunity_score": 72.4,
  "contributions": [
    {"factor": "market_momentum", "weight": 0.20, "raw": 0.81, "weighted": 16.2},
    {"factor": "penalty_bundling", "weight": null, "raw": -8.0, "weighted": -8.0}
  ],
  "weights_version": "baseline-v1"
}
```

---

## 2. Confidence (0–100%, separate)

Confidence measures **evidence quality**, not how “bullish” the setup looks.

Inputs:
- Data completeness (% of critical features present and non-stale)
- Number of independent sources agreeing
- Source reliability scores
- Sample size (txns, unique wallets, mention authors)
- Token age (very young → lower confidence unless dense evidence)
- Signal agreement (momentum vs social vs wallets)
- Model calibration prior (starts conservative; improves after evaluation phase)

Example allowed:

```
Opportunity: 91/100
Confidence: 42%
```

Meaning: setup looks strong **if** data were complete; currently evidence is thin.

---

## 3. Momentum states

Derived from velocity + acceleration of volume, buyers, holders, social, liquidity, txns, price:

| State | Intent |
| --- | --- |
| QUIET | Little activity |
| EARLY ACTIVITY | Rising from quiet |
| ACCELERATING | Positive velocity + acceleration |
| BREAKOUT | Acceleration + confirmation across ≥2 independent series |
| OVEREXTENDED | Price up hard while demand metrics weaken |
| COOLING | Velocity falling after expansion |
| DISTRIBUTION | Sell pressure + large wallet exits |
| COLLAPSE | Multi-metric breakdown |

A +100% price move with weakening demand ranks worse than +20% with accelerating independent buyers.

---

## 4. Entry Quality (0–100)

Separates **good token** from **good entry**.

Detects: parabolic extension, distance from short-term VWAP, local high distance, pullback, consolidation, renewed volume, buyer return, liquidity support.

Statuses:
- DO NOT CHASE
- WAIT FOR PULLBACK
- WAIT FOR CONFIRMATION
- ENTRY SETUP FORMING
- FAVORABLE RISK/REWARD

High Opportunity + low Entry Quality → **WAIT**, not CONSIDER ENTRY.

---

## 5. Cross-signal confirmation

Hard rule for high opportunity classifications:
- Require **≥3 independent signal families** (e.g. market + wallets + narrative/social)
- Single-metric spikes (social only, volume only) cannot produce CONSIDER ENTRY
- Social explosion + weak unique buying + duplicate posts → manufactured hype penalty

---

## 6. Decision mapping (simplified)

| Conditions | Decision |
| --- | --- |
| Risk REJECT | REJECT |
| Critical data missing/stale | INSUFFICIENT DATA |
| Opp high, entry poor, risk ok | WAIT |
| Opp moderate, early | WATCH |
| Opp high, confidence ok, entry ok, risk PASS/CAUTION | CONSIDER ENTRY |
| Open position, thesis ok | HOLD / MONITOR |
| Exit engine triggers | TAKE PARTIAL / REDUCE / EXIT |

Exact thresholds live in config (`decision_thresholds`) and are versioned in snapshots.

---

## 7. Learning path (later phases)

1. Collect immutable snapshots + forward returns (1m…24h).
2. Fit baseline models (logistic, GBM/XGBoost) on outcomes such as “+25% before −20%”.
3. Optimize weights against **net paper PnL / expectancy / drawdown**, not accuracy alone.
4. Keep human-readable contribution breakdown even after ML.

Until enough live data exists, baseline weights remain explicit and logged — never pretend they are scientifically optimal.
