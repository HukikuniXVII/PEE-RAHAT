import type { TcasRound } from "@peerahat/types";

import type {
  ParsedCriteriaRow,
  ParsedStatsRow,
} from "./parsers/types";

// Per-row preview status. The UI colors green/amber/grey/rose.
export type PreviewStatus = "new" | "update" | "unchanged" | "error";

export interface CriteriaDiffEntry {
  field: string;
  before: unknown;
  after: unknown;
}

export interface CriteriaPreviewRow {
  rowIndex: number;
  status: PreviewStatus;
  data?: ParsedCriteriaRow;
  existingId?: string;
  diff?: CriteriaDiffEntry[];
  error?: string;
}

export interface StatsPreviewRow {
  rowIndex: number;
  status: PreviewStatus;
  data?: ParsedStatsRow;
  existingId?: string;
  programLinkedId?: string | null;
  error?: string;
}

export interface PreviewSummary {
  total: number;
  new: number;
  update: number;
  unchanged: number;
  error: number;
}

// ─── Stashed payloads in Redis (or memory fallback) ──────────────────────

export interface StashedCriteriaUpload {
  kind: "criteria";
  filename: string;
  fileHash: string;
  rows: CriteriaPreviewRow[];
  summary: PreviewSummary;
}

export interface StashedStatsUpload {
  kind: "stats";
  filename: string;
  fileHash: string;
  year: number;
  round: TcasRound;
  rows: StatsPreviewRow[];
  summary: PreviewSummary;
}

export type StashedUpload = StashedCriteriaUpload | StashedStatsUpload;

export interface CommitResult {
  inserted: number;
  updated: number;
  skipped: number;
}
