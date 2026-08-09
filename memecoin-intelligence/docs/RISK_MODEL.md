# MEMECOIN INTELLIGENCE — Risk Model

**Rule:** A token that fails a critical safety check can never appear as a recommended opportunity. Rejected tokens remain visible in a separate Danger / Rejected feed with explanations.

---

## 1. Safety classifications

| Class | Meaning | Opportunity eligibility |
| --- | --- | --- |
| PASS | No critical red flags in available data | Eligible |
| CAUTION | Material risks; proceed only with high confidence & evidence | Eligible with score penalty |
| HIGH RISK | Severe concerns; usually WATCH/WAIT max | Not eligible for CONSIDER ENTRY |
| REJECT | Critical fail | Never recommended |

Missing critical safety data → treat as **INSUFFICIENT** for bullish actions (do not silently PASS).

---

## 2. Risk score families (0–100 each)

Each score requires an explanation string list citing evidence IDs.

| Score | What it captures |
| --- | --- |
| INSIDER RISK | Early privileged wallets, pre-public transfers, related funding |
| DEV RISK | Deployer history, prior rugs, holdings/sales, authority misuse |
| BUNDLE RISK | Synchronized buys, same-block clusters, Jito-like bundling patterns |
| CONCENTRATION RISK | Top holder %, LP ownership, effective float |

Composite **Risk Score** = weighted blend (default equal weights unless configured), then mapped to class.

---

## 3. Hard REJECT triggers (examples)

Any one can force REJECT when evidence is present:

- Honeypot / sell restriction confirmed by reliable check
- Mint authority retained **and** actively abused (or unverifiable when policy requires renounce)
- Freeze authority present when policy forbids it for recommendations
- Extreme concentration (e.g. top wallet(s) control overwhelming supply excluding known LP vault patterns — threshold configurable)
- Coordinated bundled supply control with dump signature
- Liquidity removed / collapsed after launch in a manipulative pattern
- Confirmed wash trading dominating volume
- Abnormal insider selling into initial buyers

Exact thresholds: `risk_thresholds` config, versioned.

---

## 4. CAUTION / HIGH RISK soft factors

- Mutable metadata / concerning Token-2022 extensions
- Suspicious but unconfirmed wallet graphs
- Rapid liquidity decrease without full pull
- Social bot-likelihood elevated
- Deployer has mixed prior outcomes
- Very low unique buyers vs volume

---

## 5. Rug / scam filter pipeline

```
token candidate
  → contract/authority checks
  → liquidity integrity
  → holder concentration
  → bundle / sync detection
  → wash / fake volume heuristics
  → insider/dev behavior
  → social authenticity (when available)
  → classification + explanations
```

Bullish opportunity classification is gated: **must not be REJECT**; CONSIDER ENTRY additionally requires not HIGH RISK (configurable).

---

## 6. Wallet classification (risk-relevant)

| Class | Notes |
| --- | --- |
| UNKNOWN | Insufficient history |
| NEW | New wallet, little track record |
| RETAIL | Ordinary activity |
| ACTIVE TRADER | Frequent activity, mixed results |
| PROFITABLE TRADER | Multi-token historical evidence |
| HIGH-CONVICTION | Repeated early profitable entries with discipline |
| WHALE | Large size |
| SNIPER | Systematic first-block entries |
| BUNDLED/SUSPICIOUS | Coordination indicators |
| INSIDER-LINKED | Graph link to privileged flow |
| DEV-LINKED | Linked to deployer |

**Smart Money Confidence** requires multi-token historical evidence. One lucky trade ≠ smart money.

---

## 7. Narrative authenticity (risk-adjacent)

Token↔narrative link classes:

| Class | Requirement |
| --- | --- |
| OFFICIAL/VERIFIED | Strong external evidence (official account mint announcement, etc.) |
| CONNECTED BUT UNVERIFIED | Semantic link only |
| COPYCAT | Namejacking a narrative without evidence |
| UNKNOWN | Insufficient |

Never call a token official without evidence.

---

## 8. Stale / insufficient safety data

If a required safety check cannot run:

- Do **not** invent a pass
- Mark check `UNKNOWN` / `INSUFFICIENT`
- Block CONSIDER ENTRY
- Surface on UI as degraded analysis quality

---

## 9. Paper trading risk controls

Even in paper mode:
- Max position size (default $5)
- Max concurrent positions
- No infinite pyramiding
- Simulated fees + slippage + priority fees
- Exit engine watches distribution / liquidity / social collapse — not only arbitrary % TP
