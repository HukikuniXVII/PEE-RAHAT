import { z } from "zod";

// ─── Round + exam system enums ────────────────────────────────────────────

export const tcasRoundSchema = z.enum([
  "r1_portfolio",
  "r2_quota_kku_netsat",
  "r3_admission",
  "r4_direct",
]);
export type TcasRound = z.infer<typeof tcasRoundSchema>;

export const examSystemSchema = z.enum([
  "gpax",
  "tgat",
  "tpat",
  "aLevel",
  "netsat",
]);
export type ExamSystem = z.infer<typeof examSystemSchema>;

// ─── Program components ───────────────────────────────────────────────────
// Two shapes share one discriminated union:
//   - "single": the normal "Subject X carries N% of the score" component.
//   - "chooseHighest": a group of options that share one weight; the student's
//     highest-scoring option in the group is what counts. Chula R3 row 043
//     uses this pattern with four science subjects sharing 80%.

export const examOptionSchema = z.object({
  system: examSystemSchema,
  code: z.string(),
  name: z.string(),
});
export type ExamOption = z.infer<typeof examOptionSchema>;

export const singleComponentSchema = z.object({
  type: z.literal("single"),
  system: examSystemSchema,
  code: z.string(),
  name: z.string(),
  weight: z.number().min(0).max(100),
  min: z.number().nullable(),
});
export type SingleComponent = z.infer<typeof singleComponentSchema>;

export const chooseHighestGroupSchema = z.object({
  type: z.literal("chooseHighest"),
  weight: z.number().min(0).max(100),
  min: z.number().nullable(),
  options: z.array(examOptionSchema).min(2),
});
export type ChooseHighestGroup = z.infer<typeof chooseHighestGroupSchema>;

export const programComponentSchema = z.discriminatedUnion("type", [
  singleComponentSchema,
  chooseHighestGroupSchema,
]);
export type ProgramComponent = z.infer<typeof programComponentSchema>;

export const programComponentsSchema = z
  .object({
    gpaxMin: z.number().min(0).max(4).nullable(),
    exams: z.array(programComponentSchema),
  })
  .refine(
    (c) => {
      const sum = c.exams.reduce((a, e) => a + e.weight, 0);
      return Math.abs(sum - 100) < 0.5;
    },
    { message: "Sum of weights must equal 100" },
  );
export type ProgramComponents = z.infer<typeof programComponentsSchema>;

// Key format: `${system}:${code}` when code is set; just `system` when code is empty.
// Special key "gpax" for GPA. Examples: "gpax", "tgat", "tgat:1", "tpat:30", "aLevel:61", "netsat:103".
export function componentKey(
  systemOrOption: ExamSystem | ExamOption,
  code?: string,
): string {
  if (typeof systemOrOption === "string") {
    return code ? `${systemOrOption}:${code}` : systemOrOption;
  }
  const opt = systemOrOption;
  return opt.code ? `${opt.system}:${opt.code}` : opt.system;
}

export const tcasScoresSchema = z.record(z.string(), z.number());
export type TcasScores = z.infer<typeof tcasScoresSchema>;

export const tcasWhatIfRequestSchema = z.object({
  programId: z.string().min(1),
  scores: tcasScoresSchema,
});
export type TcasWhatIfRequest = z.infer<typeof tcasWhatIfRequestSchema>;

// ─── Program DTO ──────────────────────────────────────────────────────────

export interface TcasProgram {
  id: string;
  university: string;
  campus: string | null;
  faculty: string;
  major: string;
  subTrack: string | null;
  programType: string | null;
  courseCode: string | null;
  round: TcasRound;
  admissionYear: number;
  quotaSeats: number;
  components: ProgramComponents;
  totalMinScore: number | null;
  tags: string[];
  sourceUrl: string | null;
}

export interface TcasDeadline {
  id: string;
  title: string;
  date: string;
  type: "exam" | "registration" | "announcement";
}

// ─── What-If result ───────────────────────────────────────────────────────

export interface SubjectGap {
  system: ExamSystem;
  code: string;
  name: string;
  weightPct: number;
  currentScore: number;
  requiredScore: number;
  pointsNeeded: number;
  // For chooseHighest groups, the gap is reported against the currently-best
  // option. groupOptions lists every option so the UI can show what else
  // qualifies for the same slot.
  groupOptions?: ExamOption[];
}

export interface FailedPerSubjectMin {
  system: ExamSystem;
  code: string;
  name: string;
  need: number;
  have: number;
}

/** Per ALGORITHM.md Phase-2 extension — subjects the student hasn't
 *  entered yet (distinct from "scored 0"). Surfaced separately so the
 *  UI can prompt the user to fill them in. */
export interface MissingSubject {
  system: ExamSystem;
  code: string;
  name: string;
}

/** Non-fatal data-quality warning from the canonical score algorithm.
 *  See packages/types/src/score-algorithm.ts:ScoreWarning. */
export interface TcasWhatIfWarning {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface TcasWhatIfResult {
  programId: string;
  weightedAverage: number;
  gap: number;
  isOnTrack: boolean;
  meetsTotalMin: boolean;
  meetsGpax: boolean;
  failedPerSubjectMins: FailedPerSubjectMin[];
  subjectGaps: SubjectGap[];
  planB: Array<Pick<TcasProgram, "id" | "university" | "faculty" | "major">>;
  // ── ALGORITHM.md Phase-2 additive fields ──────────────────────────────
  /** Subjects required by the program that the student hasn't entered. */
  missingSubjects: MissingSubject[];
  /** Data-quality warnings (weights don't sum to 100, etc.) — non-fatal. */
  warnings: TcasWhatIfWarning[];
  /** Weighted score even when ineligible. Same numeric as `weightedAverage`
   *  for eligible results; null when any required subject is missing. */
  partialScore: number | null;
}
