import type { ProgramComponents, TcasRound } from "./tcas";

// Per-row preview status. The admin UI colors:
// new=green, update=amber, unchanged=grey, error=rose.
export type TcasPreviewStatus = "new" | "update" | "unchanged" | "error";

export interface TcasCriteriaParsedRow {
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

export interface TcasCriteriaDiffEntry {
  field: string;
  before: unknown;
  after: unknown;
}

export interface TcasCriteriaPreviewRow {
  rowIndex: number;
  status: TcasPreviewStatus;
  data?: TcasCriteriaParsedRow;
  existingId?: string;
  diff?: TcasCriteriaDiffEntry[];
  error?: string;
}

export interface TcasPreviewSummary {
  total: number;
  new: number;
  update: number;
  unchanged: number;
  error: number;
}

export interface TcasCriteriaPreviewResponse {
  uploadId: string;
  rows: TcasCriteriaPreviewRow[];
  summary: TcasPreviewSummary;
}

export interface TcasCommitResult {
  inserted: number;
  updated: number;
  skipped: number;
}

export interface TcasImportAuditEntry {
  id: string;
  kind: string;
  filename: string;
  fileHash: string | null;
  inserted: number;
  updated: number;
  skipped: number;
  importedBy: string | null;
  importedAt: string;
}

export interface TcasExamCatalogueEntry {
  key: string;
  system: "gpax" | "tgat" | "tpat" | "aLevel" | "netsat";
  nameTh: string;
}
