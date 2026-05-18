import type {
  ProgramComponents,
  TcasRound,
} from "./tcas";

// ─── AI-parsed row ────────────────────────────────────────────────────────
// The single source of truth for what Gemini hands back. The same shape
// flows through the preview UI, the admin's edits, and the commit endpoint.

export interface ParsedProgramRow {
  // 1..N row number from the leftmost column of the source PDF. Kept around
  // so the admin can cross-reference the side panel against the PDF page.
  orderNumber: number | null;
  faculty: string;
  major: string;
  subTrack: string | null;
  programType: string | null;
  quotaSeats: number | null;
  components: ProgramComponents;
  totalMinScore: number | null;
  // 0..1 self-assessment from the LLM for THIS row. We use 0.7 as the
  // "needs review" threshold in the UI's confidence summary.
  confidence: number;
  notes: string | null;
}

// ─── Preview / commit envelope ────────────────────────────────────────────

export type TcasPreviewStatus = "new" | "update" | "unchanged" | "error";

export interface TcasPreviewSummary {
  total: number;
  new: number;
  update: number;
  unchanged: number;
  error: number;
}

export interface TcasAiParseResponse {
  uploadId: string;
  rows: ParsedProgramRow[];
  summary: TcasPreviewSummary;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  parseDurationMs: number;
  estimatedCostUsd: number;
}

// What the commit endpoint accepts: optional row-level edits keyed by the
// ParsedProgramRow's index in `rows`. Lets the admin override anything the
// LLM got wrong before we touch the DB.
export type TcasRowEdits = Record<string, Partial<ParsedProgramRow>>;

export interface TcasCommitResult {
  inserted: number;
  updated: number;
  skipped: number;
}

// ─── Audit + usage log read-models ───────────────────────────────────────

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

export interface AiUsageLogEntry {
  id: string;
  adminId: string;
  service: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  fileName: string | null;
  rowCount: number | null;
  createdAt: string;
}

// Convenience aggregation for the admin dashboard's "AI usage this month"
// tile. Computed server-side from AiUsageLog rows.
export interface AiUsageSummary {
  service: string;
  parses: number;
  totalCostUsd: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  rangeStart: string;
  rangeEnd: string;
}

// Re-exported here so consumers of the import surface (admin UI, api-client)
// can pull a single type alias instead of touching the deep tcas.ts.
export type { ProgramComponents, TcasRound };
