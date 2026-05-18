import type {
  ProgramComponents,
  TcasRound,
} from "@peerahat/types";

// ─── Per-row result envelope ──────────────────────────────────────────────
// The criteria parser walks each row and either produces a typed payload or a
// human-readable Thai error. The preview endpoint then layers `new | update
// | unchanged` on top by querying the DB.

export type ParseRowResult<T> =
  | { rowIndex: number; ok: true; data: T }
  | { rowIndex: number; ok: false; error: string };

export interface ParseResult<T> {
  rows: ParseRowResult<T>[];
  errorCount: number;
  okCount: number;
}

export interface ParsedCriteriaRow {
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
  sourceUrl: string | null;
}

export function makeResult<T>(rows: ParseRowResult<T>[]): ParseResult<T> {
  let okCount = 0;
  let errorCount = 0;
  for (const r of rows) {
    if (r.ok) okCount++;
    else errorCount++;
  }
  return { rows, okCount, errorCount };
}
