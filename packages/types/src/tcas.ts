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

export const programComponentSchema = z.object({
  system: examSystemSchema,
  code: z.string(),
  name: z.string(),
  weight: z.number().min(0).max(100),
  min: z.number().nullable(),
});
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
    { message: "Sum of exam weights must equal 100" },
  );
export type ProgramComponents = z.infer<typeof programComponentsSchema>;

// Key format: `${system}:${code}` when code is set; just `system` when code is empty.
// Special key "gpax" for GPA. Examples: "gpax", "tgat", "tgat:1", "tpat:30", "aLevel:61", "netsat:103".
export function componentKey(system: ExamSystem, code: string): string {
  return code ? `${system}:${code}` : system;
}

export const tcasScoresSchema = z.record(z.string(), z.number());
export type TcasScores = z.infer<typeof tcasScoresSchema>;

export const tcasWhatIfRequestSchema = z.object({
  programId: z.string().min(1),
  scores: tcasScoresSchema,
});
export type TcasWhatIfRequest = z.infer<typeof tcasWhatIfRequestSchema>;

// ─── Program + stats DTOs ─────────────────────────────────────────────────

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

export interface TcasProgramStat {
  id: string;
  programId: string | null;
  courseCode: string;
  university: string;
  faculty: string;
  major: string;
  year: number;
  round: TcasRound;
  quotaSeats: number;
  applicants: number;
  passedRound1: number;
  passedRound2: number;
  maxScoreR1: number | null;
  minScoreR1: number | null;
  maxScoreR2: number | null;
  minScoreR2: number | null;
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
}

export interface FailedPerSubjectMin {
  system: ExamSystem;
  code: string;
  name: string;
  need: number;
  have: number;
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
}
