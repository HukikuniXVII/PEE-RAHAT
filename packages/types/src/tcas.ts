import { z } from "zod";

export type TcasRound = "1" | "2" | "3" | "4";

export const tcasScoreFieldSchema = z.enum([
  "gpax",
  "tGat",
  "tPat1",
  "tPat2",
  "tPat3",
  "tPat4",
  "tPat5",
  "aLevelMath1",
  "aLevelMath2",
  "aLevelPhy",
  "aLevelChe",
  "aLevelBio",
  "aLevelSci",
  "aLevelThai",
  "aLevelSoc",
  "aLevelEng",
]);

export type TcasScoreField = z.infer<typeof tcasScoreFieldSchema>;

const score0to100 = z.coerce.number().min(0).max(100).optional();

export const tcasScoresSchema = z.object({
  gpax: z.coerce.number().min(0).max(4).optional(),
  tGat: score0to100,
  tPat1: score0to100,
  tPat2: score0to100,
  tPat3: score0to100,
  tPat4: score0to100,
  tPat5: score0to100,
  aLevelMath1: score0to100,
  aLevelMath2: score0to100,
  aLevelPhy: score0to100,
  aLevelChe: score0to100,
  aLevelBio: score0to100,
  aLevelSci: score0to100,
  aLevelThai: score0to100,
  aLevelSoc: score0to100,
  aLevelEng: score0to100,
});

export type TcasScores = z.infer<typeof tcasScoresSchema>;

export const tcasWhatIfRequestSchema = z.object({
  programId: z.string().min(1),
  scores: tcasScoresSchema,
});

export interface TcasProgram {
  id: string;
  university: string;
  faculty: string;
  major: string;
  round: TcasRound;
  minScore: number;
  weights: Partial<Record<TcasScoreField, number>>;
  tags: string[];
}

export interface TcasDeadline {
  id: string;
  title: string;
  date: string;
  type: "exam" | "registration" | "announcement";
}

export type TcasWhatIfRequest = z.infer<typeof tcasWhatIfRequestSchema>;

export interface SubjectGap {
  field: TcasScoreField;
  weightPct: number;
  currentScore: number;
  requiredScore: number;
  pointsNeeded: number;
}

export interface TcasWhatIfResult {
  programId: string;
  weightedAverage: number;
  gap: number;
  isOnTrack: boolean;
  subjectGaps: SubjectGap[];
  planB: Array<Pick<TcasProgram, "id" | "university" | "faculty" | "major" | "minScore">>;
}
