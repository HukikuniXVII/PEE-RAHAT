# Admission Score Calculation Algorithm

Specification for the TCAS/NETSAT score calculator. This handles all program
formats: single-exam, multi-exam, GPAX-as-weight, and GPAX-as-gate.

---

## Core Concept

A program's admission score is a **weighted sum of normalized subject scores**.

```
weightedScore = Σ [ normalize(rawScore, maxScore) × (weightPercent / 100) ]

where normalize(raw, max) = (raw / max) × 100
```

Two invariants guarantee the score always lands on a 0–100 scale:

1. **All weights sum to 100%** — enforced at data-import time.
2. **Every subject is normalized to 0–100 before weighting** — critical because
   GPAX is on a 0–4 scale while all exams (TGAT/TPAT/A-Level/NETSAT) are 0–100.

---

## GPAX Has Two Distinct Roles

This is the most error-prone part. GPAX can appear in **either or both** roles,
and they are computed completely differently:

| Role | Meaning | Where it lives | Affects score? |
|------|---------|----------------|----------------|
| **Gate** | Minimum threshold to be eligible | `program.minGpax` | No — pass/fail only |
| **Weight** | Counts toward the weighted score | entry in `program.weights[]` with `examCode: 'GPAX'` | Yes |

A program may use:
- **Gate only**: "requires GPAX ≥ 2.50" → set `minGpax`, GPAX not in `weights`
- **Weight only**: "GPAX 20% + TGAT 80%" → GPAX in `weights`, `minGpax` null
- **Both**: "requires GPAX ≥ 2.75 AND counts GPAX as 10%" → set both
- **Neither**: pure exam scoring → `minGpax` null, GPAX not in `weights`

When GPAX is a weight, its `maxScore` is **4** (not 100), so it must be normalized:
`3.50 / 4 × 100 = 87.5`.

---

## Algorithm Steps

```
INPUT:  studentInput { scores: Record<examCode, number>, gpax?: number }
        program { minGpax, minTotalPercent, weights[] }
OUTPUT: { eligible, weightedScore, breakdown[] } OR { eligible: false, reason }

STEP 0 — Data integrity check
  totalWeight = sum(weights[].weightPercent)
  if abs(totalWeight - 100) > 0.5:
    add warning "weights sum to X%, not 100%"   (don't fail — flag it)

STEP 1 — GPAX gate check
  if program.minGpax is not null:
    if studentInput.gpax is null:        FAIL "GPAX required"
    if studentInput.gpax < minGpax:      FAIL "GPAX below threshold"

STEP 2 — Completeness + per-subject minimums
  for each w in program.weights:
    raw = (w.examCode == 'GPAX') ? studentInput.gpax : studentInput.scores[w.examCode]
    if raw is null/NaN:                  FAIL "missing subject {examCode}"
    if w.minSubjectScore and raw < w.minSubjectScore:
                                         FAIL "{examCode} below subject minimum"

  if any failure in steps 1–2:
    return { eligible: false, reason, failedChecks, partialScore? }

STEP 3 — Normalize, weight, sum
  for each w in program.weights:
    raw       = (w.examCode == 'GPAX') ? gpax : scores[w.examCode]
    maxScore  = w.maxScore ?? (w.examCode == 'GPAX' ? 4 : 100)
    normalized = (raw / maxScore) × 100
    contribution = normalized × (w.weightPercent / 100)
  weightedScore = sum(contributions)

STEP 4 — Total minimum check
  if weightedScore < program.minTotalPercent:
    return { eligible: false, reason: "total below minimum", partialScore }

  return { eligible: true, weightedScore, breakdown }
```

---

## Constants

```
GPAX_CODE          = 'GPAX'
GPAX_MAX           = 4.0
DEFAULT_EXAM_MAX   = 100
WEIGHT_SUM_TOLERANCE = 0.5   // accept 99.5–100.5 to absorb rounding
```

---

## Worked Examples (all verified)

**1. Single exam** — NETSAT Math 100%, student scores 72
```
72/100 × 100 × 1.00 = 72.0
```

**2. Multi-exam, no GPAX** — TPAT3 20% + Eng 30% + Math 30% + Physics 20%
scores 50, 70, 80, 65
```
(50×.2) + (70×.3) + (80×.3) + (65×.2) = 10 + 21 + 24 + 13 = 68.0
```

**3. GPAX as weight** — GPAX 20% + TGAT1 40% + TGAT2 40%, GPAX 3.50, scores 80, 75
```
GPAX:  3.50/4 × 100 = 87.5 → ×.20 = 17.5
TGAT1: 80           → ×.40 = 32.0
TGAT2: 75           → ×.40 = 30.0
total = 79.5
```

**4. GPAX as gate only** — requires GPAX ≥ 2.50; score = Math 50% + Eng 50%
```
GPAX 2.30 → FAIL (below 2.50), score never computed
GPAX 3.20 → PASS, score = (80×.5)+(70×.5) = 75.0   (GPAX NOT in the sum)
```

**5. Gate + weight together** — requires GPAX ≥ 2.75 AND counts GPAX 10%;
TGAT1 45% + TPAT3 45%, GPAX 3.00, scores 60, 70
```
gate: 3.00 ≥ 2.75 → PASS
GPAX:  3.00/4 × 100 = 75 → ×.10 = 7.5
TGAT1: 60           → ×.45 = 27.0
TPAT3: 70           → ×.45 = 31.5
total = 66.0
```

---

## Data Layer Requirements

For the algorithm to work, the scraper + DB must distinguish the two GPAX roles:

```ts
interface Program {
  minGpax: number | null;          // GATE — eligibility threshold
  minTotalPercent: number;         // minimum total weighted score (e.g. 30)
  weights: Array<{
    examCode: string;              // 'GPAX' | 'TGAT1' | 'NETSAT_MATH' | ...
    weightPercent: number;         // must sum to 100 across all entries
    minSubjectScore?: number | null;
    maxScore?: number;             // 4 for GPAX, 100 (default) otherwise
  }>;
}
```

**Scraping rules:**
- Text like "GPAX ขั้นต่ำ 2.50" / "GPAX not less than X" → `minGpax` (gate)
- Text like "GPAX 20%" / "ผลการเรียน 20%" / "GPA 10%" → push to `weights[]`
  with `examCode: 'GPAX'`, `maxScore: 4`
- A program can produce both from the same page — handle independently.

**Import validation (reject or warn):**
- Sum of `weightPercent` must equal 100 (±0.5)
- Any `weights[]` entry with `examCode === 'GPAX'` must have `maxScore === 4`
- No `UNKNOWN_*` exam codes
- `minTotalPercent` and `minGpax` within sane ranges (0–100, 0–4)

---

## Edge Cases to Test

- [ ] Single exam at 100% weight
- [ ] Multi-exam summing to exactly 100%
- [ ] GPAX as weight only (normalize 0–4 → 0–100)
- [ ] GPAX as gate only (excluded from score)
- [ ] GPAX as both gate and weight
- [ ] Missing a required subject → ineligible with clear reason
- [ ] Per-subject minimum not met → ineligible
- [ ] Total below `minTotalPercent` → ineligible, return partialScore
- [ ] Weights NOT summing to 100 → still compute, attach warning
- [ ] Float rounding (e.g. 0.1+0.2) → all displayed values via round2()
```
