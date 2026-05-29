/**
 * Canonical TCAS/NETSAT admission-score calculator.
 *
 * This module is the single source of truth for the algorithm specified
 * in ALGORITHM.md. Both the frontend (live projection on the TCAS calc
 * page) and the backend (server-side whatIf evaluation) must funnel
 * every score calculation through `calculateScore` so the same inputs
 * always produce the same outputs.
 *
 * Pure function — no I/O, no external state, no framework imports.
 * Tested in apps/api/src/tcas/score-algorithm.spec.ts (Jest + fast-check),
 * mirroring every Worked Example and Edge Case in ALGORITHM.md.
 */

// ─── Constants (from ALGORITHM.md "Constants" section) ──────────────────────

/** Canonical exam code for GPAX entries in `weights[]`. Always uppercase. */
export const GPAX_CODE = "GPAX";

/** GPAX is on a 0-4 scale; everything else defaults to 0-100. */
export const GPAX_MAX = 4.0;

/** Default `maxScore` when a weight entry omits it. */
export const DEFAULT_EXAM_MAX = 100;

/** Accept weight sums in [99.5, 100.5] to absorb upstream rounding. */
export const WEIGHT_SUM_TOLERANCE = 0.5;

// ─── Input types ────────────────────────────────────────────────────────────

export interface ScoreWeight {
  /** Canonical code (`GPAX`, `TGAT1`, `A_LV_61`, `NETSAT_MATH`, ...). */
  examCode: string;
  /** 0-100 percentage; sum across all weights should ≈ 100. */
  weightPercent: number;
  /** Per-subject eligibility minimum (in raw, unnormalized units). */
  minSubjectScore?: number | null;
  /** Raw-score upper bound for this exam (4 for GPAX, 100 default). */
  maxScore?: number;
}

export interface ScoreProgram {
  /** GPAX gate threshold; null = no GPAX requirement. */
  minGpax: number | null;
  /** Minimum weighted total (0-100); null = no total minimum. */
  minTotalPercent: number | null;
  weights: ScoreWeight[];
}

export interface ScoreInput {
  /**
   * Raw subject scores keyed by examCode. Keys are matched
   * case-sensitively against `weights[].examCode`. Missing keys mean
   * "student hasn't entered this subject yet" and produce a
   * `missingSubjects` entry (not a silent zero).
   */
  scores: Record<string, number>;
  /**
   * GPAX (0-4) as a separate field per spec line 50. Both the gate
   * (STEP 1) and a `GPAX` weight entry (STEP 3) read from here, so
   * callers don't need to also put it in `scores`.
   */
  gpax?: number | null;
}

// ─── Output types ───────────────────────────────────────────────────────────

export type ScoreFailReason =
  | "gpax_required"
  | "gpax_below_threshold"
  | "missing_subject"
  | "subject_below_minimum"
  | "total_below_minimum";

export interface ScoreBreakdownEntry {
  examCode: string;
  /** What the student entered (raw, unnormalized). */
  rawScore: number;
  /** The maxScore used for normalization (4 for GPAX, 100 default). */
  maxScore: number;
  /** raw / maxScore × 100 → 0..100. */
  normalized: number;
  weightPercent: number;
  /** normalized × (weightPercent / 100) — what this subject adds. */
  contribution: number;
}

export interface ScoreFailedCheck {
  reason: ScoreFailReason;
  examCode?: string;
  /** "need ≥ 2.50 but have 2.30" type details. */
  required?: number;
  actual?: number;
}

export type ScoreWarningCode =
  | "weight_sum_off_100"
  | "gpax_max_not_4"
  | "invalid_weight_percent";

export interface ScoreWarning {
  code: ScoreWarningCode;
  message: string;
  /** Free-form details — kept loose so warnings can carry context without
   *  forcing a new shape per code. */
  details?: Record<string, unknown>;
}

export interface ScoreMissingSubject {
  examCode: string;
}

export interface ScoreResult {
  /** True iff every gate passes (GPAX, subject mins, total min, no missing). */
  eligible: boolean;
  /**
   * Weighted total in 0..100. **Read `eligible` first.**
   *
   * Populated even when `eligible: false` (partial-score display), per
   * the optional `partialScore?` in the spec return shape. This is a
   * deliberate divergence from the literal narrative of Worked Example 4
   * ("score never computed") — keeping the partial value lets the UI
   * render advice like *"you'd score 75 if your GPAX cleared the gate."*
   *
   * Null only when computation was prevented (any required subject
   * missing → STEP 3 short-circuits, since substituting 0 would lie).
   * Consumers must NOT interpret a non-null value as "eligible."
   */
  weightedScore: number | null;
  /** Per-subject computed contributions. Empty when computation
   *  short-circuits on missing subjects. */
  breakdown: ScoreBreakdownEntry[];
  /** Non-fatal data-quality warnings (e.g. weights don't sum to 100). */
  warnings: ScoreWarning[];

  // Eligibility breakdown — additive over the bare {eligible, reason} the
  // spec describes, so the UI can render rich diagnostics without
  // re-running the algorithm.
  meetsGpax: boolean;
  meetsTotalMin: boolean;
  /** Subjects the student hasn't entered (distinct from "scored 0"). */
  missingSubjects: ScoreMissingSubject[];
  /** Subjects entered but below `minSubjectScore`. */
  failedSubjectMins: ScoreFailedCheck[];
  /** First-fail reason (in spec STEP order); null when eligible. */
  reason: ScoreFailReason | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Case-insensitive GPAX detection. Schema docs use lowercase "gpax";
 *  upstream data (TCAS R3, KKU NETSAT) uses uppercase "GPAX". Tolerating
 *  both keeps us spec-conformant without forcing every importer to
 *  uppercase its exam codes first. */
export function isGpaxCode(examCode: string): boolean {
  return examCode.toUpperCase() === GPAX_CODE;
}

/** Resolve the maxScore used for normalization: respect explicit value,
 *  then GPAX → 4, then default 100. */
export function maxScoreFor(weight: ScoreWeight): number {
  if (weight.maxScore != null) return weight.maxScore;
  if (isGpaxCode(weight.examCode)) return GPAX_MAX;
  return DEFAULT_EXAM_MAX;
}

/** Project raw score onto 0..100 scale. Spec line 15. */
export function normalize(raw: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return (raw / maxScore) * 100;
}

/** STEP 0 — Weight sum check. Warning, not failure. */
function checkWeightSum(weights: ScoreWeight[]): ScoreWarning[] {
  const total = weights.reduce((sum, w) => sum + w.weightPercent, 0);
  if (Math.abs(total - 100) <= WEIGHT_SUM_TOLERANCE) return [];
  return [
    {
      code: "weight_sum_off_100",
      message: `weights sum to ${total.toFixed(2)}%, not 100%`,
      details: { total },
    },
  ];
}

/** STEP 0 helper — flag GPAX entries whose declared maxScore is wrong. */
function checkGpaxMax(weights: ScoreWeight[]): ScoreWarning[] {
  const warnings: ScoreWarning[] = [];
  for (const w of weights) {
    if (isGpaxCode(w.examCode) && w.maxScore != null && w.maxScore !== GPAX_MAX) {
      warnings.push({
        code: "gpax_max_not_4",
        message: `GPAX weight entry has maxScore=${w.maxScore}; expected 4`,
        details: { examCode: w.examCode, maxScore: w.maxScore },
      });
    }
  }
  return warnings;
}

/**
 * STEP 0 helper — flag non-finite `weightPercent` values (NaN, Infinity,
 * undefined). These would NaN-propagate through STEP 3 and silently
 * corrupt the final score. We sanitize the input copy used downstream so
 * the algorithm can still return a usable result; the warning surfaces
 * the bad data for the UI / import pipeline to act on.
 */
function checkAndSanitizeWeightPercents(weights: ScoreWeight[]): {
  sanitized: ScoreWeight[];
  warnings: ScoreWarning[];
} {
  const warnings: ScoreWarning[] = [];
  const sanitized = weights.map((w) => {
    if (!Number.isFinite(w.weightPercent)) {
      warnings.push({
        code: "invalid_weight_percent",
        message: `Weight for ${w.examCode} is ${w.weightPercent}; treated as 0`,
        details: { examCode: w.examCode, weightPercent: w.weightPercent },
      });
      return { ...w, weightPercent: 0 };
    }
    return w;
  });
  return { sanitized, warnings };
}

/** Look up the raw score for a weight entry. GPAX reads from input.gpax;
 *  everything else from input.scores keyed by examCode. Returns null when
 *  the value is missing or NaN (treated as "not entered"). */
function rawScoreFor(weight: ScoreWeight, input: ScoreInput): number | null {
  if (isGpaxCode(weight.examCode)) {
    const v = input.gpax;
    if (v == null || Number.isNaN(v)) return null;
    return v;
  }
  const v = input.scores[weight.examCode];
  if (v == null || Number.isNaN(v)) return null;
  return v;
}

// ─── Main entry ─────────────────────────────────────────────────────────────

/**
 * Compute admission score per ALGORITHM.md. Pure: same inputs ⇒ same
 * outputs, no I/O, no clock, no randomness.
 *
 * The return shape is deliberately rich (eligible + reason + every
 * intermediate gate state + breakdown) so consumers don't have to call
 * back into the algorithm for UI display. Callers that only need the
 * final score read `weightedScore`; callers that render reasons read
 * `reason` + `failedSubjectMins` + `missingSubjects`.
 */
export function calculateScore(
  program: ScoreProgram,
  input: ScoreInput,
): ScoreResult {
  // STEP 0 — Data integrity checks. Sanitization happens here so the
  // downstream loops see only well-formed weight percentages; warnings
  // bubble up to the caller for UI / import-pipeline action.
  const { sanitized: weights, warnings: sanitizationWarnings } =
    checkAndSanitizeWeightPercents(program.weights);
  const warnings: ScoreWarning[] = [
    ...checkWeightSum(weights),
    ...checkGpaxMax(weights),
    ...sanitizationWarnings,
  ];

  // STEP 1 — GPAX gate
  let meetsGpax = true;
  let firstReason: ScoreFailReason | null = null;
  if (program.minGpax != null) {
    if (input.gpax == null || Number.isNaN(input.gpax)) {
      meetsGpax = false;
      firstReason ??= "gpax_required";
    } else if (input.gpax < program.minGpax) {
      meetsGpax = false;
      firstReason ??= "gpax_below_threshold";
    }
  }

  // STEP 2 — Completeness + per-subject minimums
  const missingSubjects: ScoreMissingSubject[] = [];
  const failedSubjectMins: ScoreFailedCheck[] = [];
  // `hasAnyMissing` is the spec-true "do not compute STEP 3" gate.
  // It's kept separate from the displayed `missingSubjects` list so we
  // can suppress UI duplicates (GPAX missing + gpax_required for the
  // same root cause) without losing the safety condition.
  let hasAnyMissing = false;
  for (const w of weights) {
    const raw = rawScoreFor(w, input);
    if (raw == null) {
      hasAnyMissing = true;
      const alreadyFlaggedByGpaxGate =
        isGpaxCode(w.examCode) && firstReason === "gpax_required";
      if (!alreadyFlaggedByGpaxGate) {
        missingSubjects.push({ examCode: w.examCode });
      }
      firstReason ??= "missing_subject";
      continue;
    }
    if (w.minSubjectScore != null && raw < w.minSubjectScore) {
      failedSubjectMins.push({
        reason: "subject_below_minimum",
        examCode: w.examCode,
        required: w.minSubjectScore,
        actual: raw,
      });
      firstReason ??= "subject_below_minimum";
    }
  }

  // STEP 3 — Normalize, weight, sum. Skip when any required subject is
  // missing; the spec returns a null score in that case rather than a
  // misleading partial. Uses the sanitized weights (STEP 0) so any
  // non-finite weightPercent has already been clamped to 0.
  const canComputeScore = !hasAnyMissing;
  const breakdown: ScoreBreakdownEntry[] = [];
  let weightedScore: number | null = null;
  if (canComputeScore) {
    let sum = 0;
    for (const w of weights) {
      const raw = rawScoreFor(w, input)!; // safe: completeness checked above
      const maxScore = maxScoreFor(w);
      const normalized = normalize(raw, maxScore);
      const contribution = normalized * (w.weightPercent / 100);
      breakdown.push({
        examCode: w.examCode,
        rawScore: raw,
        maxScore,
        normalized,
        weightPercent: w.weightPercent,
        contribution,
      });
      sum += contribution;
    }
    weightedScore = sum;
  }

  // STEP 4 — Total minimum check
  let meetsTotalMin = true;
  if (
    program.minTotalPercent != null &&
    weightedScore != null &&
    weightedScore < program.minTotalPercent
  ) {
    meetsTotalMin = false;
    firstReason ??= "total_below_minimum";
  }

  const eligible =
    meetsGpax &&
    meetsTotalMin &&
    !hasAnyMissing &&
    failedSubjectMins.length === 0;

  return {
    eligible,
    weightedScore,
    breakdown,
    warnings,
    meetsGpax,
    meetsTotalMin,
    missingSubjects,
    failedSubjectMins,
    reason: eligible ? null : firstReason,
  };
}
