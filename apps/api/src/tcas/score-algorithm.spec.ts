/**
 * Executable spec for the TCAS admission-score algorithm.
 *
 * Each test mirrors a documented scenario from ALGORITHM.md so the spec
 * doubles as validation: if a Worked Example or Edge Case stops passing,
 * either the algorithm regressed or the spec changed — both should be
 * conscious decisions.
 *
 * Test order = spec section order:
 *   1. Worked Examples (lines 102-137)
 *   2. Edge Cases checklist (lines 173-183)
 *   3. Property-based invariants (fast-check)
 *
 * Numeric comparisons use toBeCloseTo to absorb IEEE-754 rounding; spec
 * tolerance for weighted score is 0.01 (~quarter-percent).
 */
import * as fc from "fast-check";
import {
  DEFAULT_EXAM_MAX,
  GPAX_CODE,
  GPAX_MAX,
  WEIGHT_SUM_TOLERANCE,
  calculateScore,
  isGpaxCode,
  maxScoreFor,
  normalize,
  type ScoreProgram,
} from "@peerahat/types";

// ─── Worked Examples (ALGORITHM.md §"Worked Examples") ──────────────────────

describe("ALGORITHM.md Worked Examples", () => {
  it("Example 1 — Single exam, NETSAT Math 100%, score 72 → 72.0", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [{ examCode: "NETSAT_MATH", weightPercent: 100 }],
    };
    const result = calculateScore(program, { scores: { NETSAT_MATH: 72 } });
    expect(result.eligible).toBe(true);
    expect(result.weightedScore).toBeCloseTo(72.0, 2);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]).toMatchObject({
      examCode: "NETSAT_MATH",
      rawScore: 72,
      maxScore: 100,
      normalized: 72,
      contribution: 72,
    });
  });

  it("Example 2 — Multi-exam, no GPAX → 68.0", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: "TPAT3", weightPercent: 20 },
        { examCode: "ENG", weightPercent: 30 },
        { examCode: "MATH", weightPercent: 30 },
        { examCode: "PHYSICS", weightPercent: 20 },
      ],
    };
    const result = calculateScore(program, {
      scores: { TPAT3: 50, ENG: 70, MATH: 80, PHYSICS: 65 },
    });
    expect(result.eligible).toBe(true);
    expect(result.weightedScore).toBeCloseTo(68.0, 2);
    // Spec line 112: (50×.2)+(70×.3)+(80×.3)+(65×.2) = 10+21+24+13 = 68
    expect(result.breakdown.map((b) => b.contribution)).toEqual([
      10, 21, 24, 13,
    ]);
  });

  it("Example 3 — GPAX as weight, 0-4 normalized → 79.5", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: GPAX_CODE, weightPercent: 20 },
        { examCode: "TGAT1", weightPercent: 40 },
        { examCode: "TGAT2", weightPercent: 40 },
      ],
    };
    const result = calculateScore(program, {
      scores: { TGAT1: 80, TGAT2: 75 },
      gpax: 3.5,
    });
    expect(result.eligible).toBe(true);
    expect(result.weightedScore).toBeCloseTo(79.5, 2);
    // Spec line 117-120: GPAX 17.5 + TGAT1 32 + TGAT2 30 = 79.5
    expect(result.breakdown[0]).toMatchObject({
      examCode: GPAX_CODE,
      rawScore: 3.5,
      maxScore: 4,
      normalized: 87.5,
      contribution: 17.5,
    });
  });

  it("Example 4 — GPAX as gate only", () => {
    const program: ScoreProgram = {
      minGpax: 2.5,
      minTotalPercent: null,
      weights: [
        { examCode: "MATH", weightPercent: 50 },
        { examCode: "ENG", weightPercent: 50 },
      ],
    };
    // Spec line 125: GPAX 2.30 → FAIL gate, score never computed (per
    // spec, but we still compute the score for UI display purposes —
    // the eligibility result is the authoritative ineligible signal).
    const ineligible = calculateScore(program, {
      scores: { MATH: 80, ENG: 70 },
      gpax: 2.3,
    });
    expect(ineligible.eligible).toBe(false);
    expect(ineligible.meetsGpax).toBe(false);
    expect(ineligible.reason).toBe("gpax_below_threshold");
    // GPAX NOT in the sum — score uses only weighted subjects.
    expect(ineligible.weightedScore).toBeCloseTo(75.0, 2);

    // Spec line 126: GPAX 3.20 → PASS, score = (80×.5)+(70×.5) = 75.0
    const eligible = calculateScore(program, {
      scores: { MATH: 80, ENG: 70 },
      gpax: 3.2,
    });
    expect(eligible.eligible).toBe(true);
    expect(eligible.weightedScore).toBeCloseTo(75.0, 2);
  });

  it("Example 5 — Gate + weight together → 66.0", () => {
    const program: ScoreProgram = {
      minGpax: 2.75,
      minTotalPercent: null,
      weights: [
        { examCode: GPAX_CODE, weightPercent: 10 },
        { examCode: "TGAT1", weightPercent: 45 },
        { examCode: "TPAT3", weightPercent: 45 },
      ],
    };
    const result = calculateScore(program, {
      scores: { TGAT1: 60, TPAT3: 70 },
      gpax: 3.0,
    });
    expect(result.eligible).toBe(true);
    expect(result.meetsGpax).toBe(true);
    expect(result.weightedScore).toBeCloseTo(66.0, 2);
    // Spec line 133-136: GPAX 7.5 + TGAT1 27 + TPAT3 31.5 = 66
    expect(result.breakdown.map((b) => b.contribution)).toEqual([7.5, 27, 31.5]);
  });
});

// ─── Edge cases (ALGORITHM.md §"Edge Cases to Test") ───────────────────────

describe("ALGORITHM.md Edge Cases", () => {
  it("Single exam at 100% weight produces normalized contribution", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [{ examCode: "A_LV_61", weightPercent: 100 }],
    };
    const result = calculateScore(program, { scores: { A_LV_61: 85 } });
    expect(result.weightedScore).toBeCloseTo(85, 2);
  });

  it("Multi-exam summing to exactly 100% — no warning", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: "A", weightPercent: 33.33 },
        { examCode: "B", weightPercent: 33.33 },
        { examCode: "C", weightPercent: 33.34 },
      ],
    };
    const result = calculateScore(program, { scores: { A: 50, B: 60, C: 70 } });
    expect(result.warnings).toHaveLength(0);
  });

  it("GPAX as weight only — normalize 0-4 → 0-100", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [{ examCode: GPAX_CODE, weightPercent: 100 }],
    };
    const result = calculateScore(program, { scores: {}, gpax: 4.0 });
    expect(result.weightedScore).toBeCloseTo(100, 2);
    const half = calculateScore(program, { scores: {}, gpax: 2.0 });
    expect(half.weightedScore).toBeCloseTo(50, 2);
  });

  it("GPAX as gate only — excluded from score", () => {
    const program: ScoreProgram = {
      minGpax: 3.0,
      minTotalPercent: null,
      weights: [{ examCode: "TGAT1", weightPercent: 100 }],
    };
    const r = calculateScore(program, { scores: { TGAT1: 50 }, gpax: 3.5 });
    expect(r.weightedScore).toBeCloseTo(50, 2);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0]?.examCode).toBe("TGAT1");
  });

  it("GPAX as both gate and weight — single GPAX value drives both", () => {
    const program: ScoreProgram = {
      minGpax: 2.75,
      minTotalPercent: null,
      weights: [
        { examCode: GPAX_CODE, weightPercent: 50 },
        { examCode: "ENG", weightPercent: 50 },
      ],
    };
    const r = calculateScore(program, { scores: { ENG: 60 }, gpax: 3.5 });
    expect(r.meetsGpax).toBe(true);
    // GPAX 3.5/4×100 = 87.5 × .5 = 43.75; ENG 60×.5 = 30. Total 73.75
    expect(r.weightedScore).toBeCloseTo(73.75, 2);
  });

  it("Missing required subject → ineligible, reason='missing_subject'", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: "TGAT1", weightPercent: 50 },
        { examCode: "TPAT3", weightPercent: 50 },
      ],
    };
    const r = calculateScore(program, { scores: { TGAT1: 60 } });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("missing_subject");
    expect(r.missingSubjects).toEqual([{ examCode: "TPAT3" }]);
    // Score is null when missing — distinguish from "computed and got 0".
    expect(r.weightedScore).toBeNull();
  });

  it("Per-subject minimum not met → ineligible with detail + partial score computed", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: "TGAT1", weightPercent: 50, minSubjectScore: 50 },
        { examCode: "TPAT3", weightPercent: 50, minSubjectScore: 50 },
      ],
    };
    const r = calculateScore(program, { scores: { TGAT1: 45, TPAT3: 60 } });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("subject_below_minimum");
    expect(r.failedSubjectMins).toEqual([
      {
        reason: "subject_below_minimum",
        examCode: "TGAT1",
        required: 50,
        actual: 45,
      },
    ]);
    // Partial score IS computed even though one subject fell below its
    // minimum (canComputeScore gates on missing, not min-fails).
    // 45×.5 + 60×.5 = 22.5 + 30 = 52.5
    expect(r.weightedScore).toBeCloseTo(52.5, 2);
  });

  it("Total below minTotalPercent → ineligible with partialScore preserved", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: 60,
      weights: [{ examCode: "A", weightPercent: 100 }],
    };
    const r = calculateScore(program, { scores: { A: 50 } });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("total_below_minimum");
    expect(r.meetsTotalMin).toBe(false);
    // Sibling gates still pass — only the total threshold failed.
    expect(r.meetsGpax).toBe(true);
    expect(r.missingSubjects).toHaveLength(0);
    expect(r.failedSubjectMins).toHaveLength(0);
    // partialScore is exposed via weightedScore (per spec); UI can show
    // it alongside the "below minimum" message.
    expect(r.weightedScore).toBeCloseTo(50, 2);
  });

  it("Weights not summing to 100 → still compute, attach warning", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: "A", weightPercent: 40 },
        { examCode: "B", weightPercent: 30 },
        // sum = 70 — way off 100
      ],
    };
    const r = calculateScore(program, { scores: { A: 100, B: 100 } });
    // Spec line 56-57: warn but don't fail
    expect(r.eligible).toBe(true);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatchObject({
      code: "weight_sum_off_100",
      details: { total: 70 },
    });
    expect(r.weightedScore).toBeCloseTo(70, 2);
  });

  it("Float rounding — values are reported as computed (consumer rounds for display)", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: "A", weightPercent: 10 },
        { examCode: "B", weightPercent: 20 },
      ],
    };
    const r = calculateScore(program, { scores: { A: 50, B: 70 } });
    // 0.1 × 50 + 0.2 × 70 = 5 + 14 = 19. Want exact (or close).
    expect(r.weightedScore).toBeCloseTo(19, 5);
  });
});

// ─── First-fail reason precedence ───────────────────────────────────────────

describe("First-fail reason precedence (spec STEP order)", () => {
  it("GPAX gate fires before subject completeness", () => {
    const program: ScoreProgram = {
      minGpax: 3.0,
      minTotalPercent: null,
      weights: [{ examCode: "TGAT1", weightPercent: 100 }],
    };
    // Both GPAX too low AND TGAT1 missing — STEP 1 fires first.
    const r = calculateScore(program, { scores: {}, gpax: 2.0 });
    expect(r.reason).toBe("gpax_below_threshold");
    expect(r.missingSubjects).toEqual([{ examCode: "TGAT1" }]);
  });

  it("Missing subject fires before total min", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: 90,
      weights: [
        { examCode: "TGAT1", weightPercent: 50 },
        { examCode: "TPAT3", weightPercent: 50 },
      ],
    };
    const r = calculateScore(program, { scores: { TGAT1: 80 } });
    expect(r.reason).toBe("missing_subject");
  });

  it("gpax_required when gate is set but input.gpax missing", () => {
    const program: ScoreProgram = {
      minGpax: 2.5,
      minTotalPercent: null,
      weights: [{ examCode: "A", weightPercent: 100 }],
    };
    const r = calculateScore(program, { scores: { A: 60 } });
    expect(r.reason).toBe("gpax_required");
  });

  it("GPAX is not double-reported as missing when gate already flagged it", () => {
    // Same root cause should produce ONE user-facing signal, not two.
    const program: ScoreProgram = {
      minGpax: 2.5,
      minTotalPercent: null,
      weights: [
        { examCode: GPAX_CODE, weightPercent: 30 },
        { examCode: "A", weightPercent: 70 },
      ],
    };
    const r = calculateScore(program, { scores: { A: 80 } });
    expect(r.reason).toBe("gpax_required");
    expect(r.meetsGpax).toBe(false);
    // GPAX absence is owned by the gate; the missing-subjects list
    // surfaces only the genuinely-distinct missing subjects (none here).
    expect(r.missingSubjects).toHaveLength(0);
    // STEP 3 still short-circuits — the score is null because GPAX is
    // truly absent (hasAnyMissing internal flag), even though it's not
    // duplicated in the user-facing list.
    expect(r.weightedScore).toBeNull();
  });
});

// ─── Warning behavior ───────────────────────────────────────────────────────

describe("Warnings", () => {
  it("GPAX entry with maxScore≠4 emits gpax_max_not_4", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: GPAX_CODE, weightPercent: 50, maxScore: 5 },
        { examCode: "A", weightPercent: 50 },
      ],
    };
    const r = calculateScore(program, { scores: { A: 50 }, gpax: 3.0 });
    expect(r.warnings.map((w) => w.code)).toContain("gpax_max_not_4");
    // Computation uses the supplied maxScore (5) — we honor the data,
    // we just warn about it.
    expect(r.breakdown[0]?.maxScore).toBe(5);
  });

  it("Weight sum within tolerance produces no warning", () => {
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: "A", weightPercent: 49.7 },
        { examCode: "B", weightPercent: 50.3 },
      ],
    };
    const r = calculateScore(program, { scores: { A: 50, B: 50 } });
    expect(r.warnings).toHaveLength(0);
  });

  it("Non-finite weightPercent is sanitized to 0 with invalid_weight_percent warning", () => {
    // Defends against garbage import data (NaN/Infinity from a bad
    // column or division by zero) without NaN-propagating into the
    // user-facing score.
    const program: ScoreProgram = {
      minGpax: null,
      minTotalPercent: null,
      weights: [
        { examCode: "A", weightPercent: Number.NaN },
        { examCode: "B", weightPercent: 100 },
      ],
    };
    const r = calculateScore(program, { scores: { A: 50, B: 60 } });
    expect(r.warnings.map((w) => w.code)).toContain("invalid_weight_percent");
    // NaN weight clamped to 0 → no contribution from A; only B counts.
    expect(r.weightedScore).toBeCloseTo(60, 2);
    expect(Number.isFinite(r.weightedScore ?? NaN)).toBe(true);
  });
});

// ─── Helper functions ──────────────────────────────────────────────────────

describe("Helpers", () => {
  it("isGpaxCode is case-insensitive", () => {
    expect(isGpaxCode("GPAX")).toBe(true);
    expect(isGpaxCode("gpax")).toBe(true);
    expect(isGpaxCode("Gpax")).toBe(true);
    expect(isGpaxCode("gPAx")).toBe(true);
    expect(isGpaxCode("GPA")).toBe(false);
    expect(isGpaxCode("TGAT")).toBe(false);
  });

  it("maxScoreFor honors explicit, then GPAX→4, then 100", () => {
    expect(maxScoreFor({ examCode: "GPAX", weightPercent: 10 })).toBe(4);
    expect(maxScoreFor({ examCode: "gpax", weightPercent: 10 })).toBe(4);
    expect(maxScoreFor({ examCode: "TGAT", weightPercent: 10 })).toBe(100);
    expect(
      maxScoreFor({ examCode: "NETSAT_MATH", weightPercent: 10, maxScore: 500 }),
    ).toBe(500);
  });

  it("normalize projects to 0..100", () => {
    expect(normalize(3.5, 4)).toBeCloseTo(87.5, 5);
    expect(normalize(72, 100)).toBeCloseTo(72, 5);
    expect(normalize(0, 100)).toBe(0);
    expect(normalize(50, 0)).toBe(0); // div-by-zero guard
  });
});

// ─── Property-based invariants (fast-check) ────────────────────────────────

describe("Invariants (property-based)", () => {
  // Build a valid program: weights sum to ~100, max 8 subjects, 0-100 raw
  // scores for non-GPAX, 0-4 for GPAX. Tight enough to be deterministic;
  // wide enough to surface boundary bugs.
  const validProgramArb = fc
    .integer({ min: 1, max: 6 })
    .chain((n) =>
      fc.tuple(
        fc.array(fc.integer({ min: 1, max: 99 }), {
          minLength: n,
          maxLength: n,
        }),
        fc.uniqueArray(
          fc.constantFrom("TGAT1", "TGAT2", "TPAT1", "TPAT3", "A_LV_61", "A_LV_64"),
          { minLength: n, maxLength: n },
        ),
      ),
    )
    .map(([rawWeights, codes]) => {
      // Normalize to sum exactly 100 by scaling.
      const sum = rawWeights.reduce((s, w) => s + w, 0);
      const scaled = rawWeights.map((w) => (w / sum) * 100);
      const weights = codes.map((examCode, i) => ({
        examCode,
        weightPercent: scaled[i]!,
      }));
      return weights;
    });

  it("Weighted score is always in [0, 100] for fully entered valid inputs", () => {
    fc.assert(
      fc.property(
        validProgramArb,
        fc.dictionary(
          fc.constantFrom(
            "TGAT1",
            "TGAT2",
            "TPAT1",
            "TPAT3",
            "A_LV_61",
            "A_LV_64",
          ),
          fc.double({ min: 0, max: 100, noNaN: true }),
        ),
        (weights, scores) => {
          const program: ScoreProgram = {
            minGpax: null,
            minTotalPercent: null,
            weights,
          };
          // Skip when any required subject is missing — algorithm
          // correctly returns null score in that case (tested elsewhere).
          const complete = weights.every(
            (w) => scores[w.examCode] != null,
          );
          if (!complete) return true;
          const r = calculateScore(program, { scores });
          if (r.weightedScore == null) return false;
          return r.weightedScore >= -0.001 && r.weightedScore <= 100.001;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("Normalize is idempotent on already-normalized inputs (maxScore=100)", () => {
    // Strict equality fails on IEEE-754 denormals (e.g. 5e-324 / 100
    // underflows to 0). Use a small absolute tolerance instead — the
    // algorithm is exact for representable values, denormals just round.
    fc.assert(
      fc.property(
        // Restrict to normal positives + 0; denormal subnormals are a
        // float-representation concern, not an algorithm property.
        fc.double({ min: Number.MIN_VALUE * 10, max: 100, noNaN: true }),
        (x) => Math.abs(normalize(x, 100) - x) < 1e-9,
      ),
      { numRuns: 100 },
    );
  });

  it("GPAX gate is monotonic: higher GPAX never makes you fail-the-gate when lower passes", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 4, noNaN: true }), // threshold
        fc.double({ min: 0, max: 4, noNaN: true }), // lower
        fc.double({ min: 0, max: 4, noNaN: true }), // upper
        (threshold, lower, upper) => {
          const program: ScoreProgram = {
            minGpax: threshold,
            minTotalPercent: null,
            weights: [{ examCode: "A", weightPercent: 100 }],
          };
          const lo = Math.min(lower, upper);
          const hi = Math.max(lower, upper);
          const rLo = calculateScore(program, {
            scores: { A: 50 },
            gpax: lo,
          });
          const rHi = calculateScore(program, {
            scores: { A: 50 },
            gpax: hi,
          });
          // If the lower GPAX passes the gate, the higher one must too.
          if (rLo.meetsGpax) return rHi.meetsGpax;
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("Adding more weight to a subject the student aces never lowers the score", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 0.4, noNaN: true }), // weight shift
        (shift) => {
          // Two-subject program: A (student scored 100) + B (scored 0).
          // Shifting weight from B to A should increase the score.
          const base: ScoreProgram = {
            minGpax: null,
            minTotalPercent: null,
            weights: [
              { examCode: "A", weightPercent: 50 },
              { examCode: "B", weightPercent: 50 },
            ],
          };
          const shifted: ScoreProgram = {
            minGpax: null,
            minTotalPercent: null,
            weights: [
              { examCode: "A", weightPercent: 50 + shift * 100 },
              { examCode: "B", weightPercent: 50 - shift * 100 },
            ],
          };
          const scores = { A: 100, B: 0 };
          const r1 = calculateScore(base, { scores });
          const r2 = calculateScore(shifted, { scores });
          return (r2.weightedScore ?? 0) >= (r1.weightedScore ?? 0) - 0.001;
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── Constants exposed ─────────────────────────────────────────────────────

describe("Constants match spec", () => {
  it("GPAX_CODE = 'GPAX' (uppercase)", () => {
    expect(GPAX_CODE).toBe("GPAX");
  });
  it("GPAX_MAX = 4.0", () => {
    expect(GPAX_MAX).toBe(4.0);
  });
  it("DEFAULT_EXAM_MAX = 100", () => {
    expect(DEFAULT_EXAM_MAX).toBe(100);
  });
  it("WEIGHT_SUM_TOLERANCE = 0.5", () => {
    expect(WEIGHT_SUM_TOLERANCE).toBe(0.5);
  });
});
