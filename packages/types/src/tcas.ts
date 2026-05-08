export type TcasRound = "1" | "2" | "3" | "4";

export type TcasScoreField =
  | "gpax"
  | "tGat"
  | "tPat1"
  | "tPat2"
  | "tPat3"
  | "tPat4"
  | "tPat5"
  | "aLevelMath1"
  | "aLevelMath2"
  | "aLevelPhy"
  | "aLevelChe"
  | "aLevelBio"
  | "aLevelSci"
  | "aLevelThai"
  | "aLevelSoc"
  | "aLevelEng";

export type TcasScores = Partial<Record<TcasScoreField, number>>;

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

export interface TcasWhatIfRequest {
  programId: string;
  scores: TcasScores;
}

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
