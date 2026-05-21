// Types + pure helpers for the scraped TCAS dumps.
// Safe to import from client components.
//
// Server-only file readers live next door in `./tcas-data-server.ts`
// — keeping the `node:fs` import out of this module prevents webpack
// from bundling it into the client and erroring on the `node:` scheme.

// ─── Types (mirroring the scraper output) ────────────────────────────
// TODO(tcas-import): move to packages/types/src/tcas.ts once the API
// surfaces these — keeping inline here avoids touching the shared package
// for a temporary scaffold.

export interface KkuProgramWeight {
  exam_code: string;
  weight_percent: number;
  min_subject_score: number | null;
  raw_subject_code: string;
  raw_subject_name: string;
}

export interface KkuProgram {
  id: number;
  group_id: number | null;
  year: number;
  round: string;
  university: string;
  faculty: string;
  program_name: string;
  min_gpax?: number | null;
  min_total_percent: number;
  source_url: string;
  weights: KkuProgramWeight[];
  notes: string;
}

export interface KkuQuotaFile {
  metadata: {
    scraped_at: string;
    source: string;
    year: number;
    round: string;
    total_programs: number;
    failed: number;
  };
  programs: KkuProgram[];
}

export interface KkuStatRecord {
  external_id: string;
  faculty_id: string;
  faculty: string;
  program_name: string;
  year: number;
  round: string;
  min_score: number | null;
  max_score: number | null;
  mean_score: number | null;
  applicants: number | null;
  admitted: number | null;
  is_predicted: boolean;
  source: string;
}

export interface KkuStatFile {
  metadata: {
    scraped_at: string;
    source: string;
    year: number;
    round: string;
    total_records: number;
    sanity_warnings: number;
  };
  records: KkuStatRecord[];
}

export interface CalendarEvent {
  event_type: string;
  title_th: string;
  date_start: string | null;
  date_end: string | null;
  note?: string;
}

export interface CalendarRound {
  round_code: string;
  round_name_th: string;
  events: CalendarEvent[];
}

export interface CalendarFile {
  year: number;
  academic_year: number;
  scraped_at: string;
  source: string;
  note?: string;
  rounds: CalendarRound[];
  exam_events?: Array<CalendarEvent & { exam_code: string }>;
}

// ─── TCAS Round 3 (mytcas-wide) ──────────────────────────────────────

export interface TcasProgramWeight {
  exam_code: string;
  weight_percent: number;
  min_subject_score: number | null;
  raw_subject_code: string;
  raw_subject_name: string;
}

export interface TcasProgram {
  external_id: string;
  project_id?: string;
  project_name_th?: string;
  type: string;
  year: number;
  round: string;
  university: string;
  university_id: string;
  faculty: string;
  campus: string | null;
  program_name: string;
  program_type: string;
  min_gpax: number | null;
  min_total_score: number;
  receive_student_number: number | null;
  weights: TcasProgramWeight[];
  source_url: string;
}

export interface TcasQuotaFile {
  metadata: {
    scraped_at: string;
    source: string;
    total_courses: number;
    year: number;
    round: string;
    total_programs: number;
  };
  programs: TcasProgram[];
}

export interface TcasStatRecord {
  external_id: string;
  year: number;
  round: string;
  university: string;
  faculty: string;
  program_name: string;
  min_score: number | null;
  max_score: number | null;
  mean_score: number | null;
  est_min_score_mean: number | null;
  est_min_score_regression: number | null;
  is_predicted: boolean;
  weights?: Array<{
    exam_code: string;
    weight_percent: number;
    raw_subject_code: string;
  }>;
  source: string;
}

export interface TcasStatFile {
  metadata: {
    scraped_at: string;
    source: string;
    year: number;
    round: string;
    total_records: number;
  };
  records: TcasStatRecord[];
}

// ─── Pure helpers (client-safe) ──────────────────────────────────────
// kku-quota uses numeric `id`; kku-stat uses 12-digit `external_id` —
// they don't share a join key. The reliable match is the (faculty,
// program_name) tuple, which appears identical in both files for now.
// TCAS R3 has a clean `external_id` shared across both files.

export function findHistoryFor(
  program: KkuProgram,
  records: KkuStatRecord[],
): KkuStatRecord | undefined {
  return records.find(
    (r) =>
      r.faculty === program.faculty &&
      r.program_name === program.program_name,
  );
}

export function findTcasHistoryFor(
  program: TcasProgram,
  records: TcasStatRecord[],
): TcasStatRecord | undefined {
  return records.find((r) => r.external_id === program.external_id);
}
