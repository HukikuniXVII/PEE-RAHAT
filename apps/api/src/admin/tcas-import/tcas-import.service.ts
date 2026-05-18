import { BadRequestException, Injectable } from "@nestjs/common";
import type { TcasRound } from "@peerahat/types";
import { createHash } from "node:crypto";

import { PrismaService } from "../../prisma/prisma.service";

import {
  parseCriteriaCsv,
  parseStatsCsv,
  parseStatsXlsx,
  type ParsedCriteriaRow,
  type ParsedStatsRow,
} from "./parsers";
import { TcasImportCache } from "./tcas-import.cache";
import type {
  CommitResult,
  CriteriaDiffEntry,
  CriteriaPreviewRow,
  PreviewStatus,
  PreviewSummary,
  StashedCriteriaUpload,
  StashedStatsUpload,
  StashedUpload,
  StatsPreviewRow,
} from "./tcas-import.types";

@Injectable()
export class TcasImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: TcasImportCache,
  ) {}

  // ─── Criteria ──────────────────────────────────────────────────────────

  async previewCriteria(
    filename: string,
    buffer: Buffer,
  ): Promise<{
    uploadId: string;
    rows: CriteriaPreviewRow[];
    summary: PreviewSummary;
  }> {
    const csv = buffer.toString("utf8");
    const parsed = parseCriteriaCsv(csv);

    // Look up each parsed row's identity in the DB to decide new vs update.
    const previewRows: CriteriaPreviewRow[] = [];
    for (const r of parsed.rows) {
      if (!r.ok) {
        previewRows.push({
          rowIndex: r.rowIndex,
          status: "error",
          error: r.error,
        });
        continue;
      }
      const existing = await this.prisma.tcasProgram.findFirst({
        where: {
          university: r.data.university,
          major: r.data.major,
          round: r.data.round,
          admissionYear: r.data.admissionYear,
          subTrack: r.data.subTrack,
          programType: r.data.programType,
        },
      });
      if (!existing) {
        previewRows.push({ rowIndex: r.rowIndex, status: "new", data: r.data });
        continue;
      }
      const diff = diffCriteriaRow(existing, r.data);
      previewRows.push({
        rowIndex: r.rowIndex,
        status: diff.length === 0 ? "unchanged" : "update",
        data: r.data,
        existingId: existing.id,
        diff,
      });
    }

    const summary = summarize(previewRows);
    const uploadId = await this.cache.stash<StashedCriteriaUpload>({
      kind: "criteria",
      filename,
      fileHash: sha256(buffer),
      rows: previewRows,
      summary,
    });
    return { uploadId, rows: previewRows, summary };
  }

  async commitCriteria(
    uploadId: string,
    adminUserId: string,
  ): Promise<CommitResult> {
    const stashed = await this.cache.fetch<StashedUpload>(uploadId);
    if (!stashed || stashed.kind !== "criteria") {
      throw new BadRequestException("uploadId หมดอายุหรือไม่ใช่ criteria");
    }
    if (stashed.summary.error > 0) {
      throw new BadRequestException(
        `ยังมี ${stashed.summary.error} แถวที่ผิดพลาด — แก้ไฟล์แล้วอัปโหลดใหม่`,
      );
    }
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of stashed.rows) {
        if (row.status === "unchanged") {
          skipped++;
          continue;
        }
        if (!row.data) continue;
        const importMeta = {
          sourceFile: stashed.filename,
          importedAt: new Date(),
          importedBy: adminUserId,
        };
        const data = {
          university: row.data.university,
          campus: row.data.campus,
          faculty: row.data.faculty,
          major: row.data.major,
          subTrack: row.data.subTrack,
          programType: row.data.programType,
          courseCode: row.data.courseCode,
          round: row.data.round,
          admissionYear: row.data.admissionYear,
          quotaSeats: row.data.quotaSeats,
          components: row.data.components,
          totalMinScore: row.data.totalMinScore,
          tags: [] as string[],
          sourceUrl: row.data.sourceUrl,
          ...importMeta,
        };
        if (row.status === "new") {
          await tx.tcasProgram.create({ data });
          inserted++;
        } else if (row.status === "update" && row.existingId) {
          await tx.tcasProgram.update({
            where: { id: row.existingId },
            data,
          });
          updated++;
        }
      }
      await tx.tcasImportAudit.create({
        data: {
          kind: "criteria",
          filename: stashed.filename,
          fileHash: stashed.fileHash,
          inserted,
          updated,
          skipped,
          importedBy: adminUserId,
        },
      });
    });

    await this.cache.drop(uploadId);
    return { inserted, updated, skipped };
  }

  // ─── Stats ─────────────────────────────────────────────────────────────

  async previewStats(
    filename: string,
    buffer: Buffer,
    meta: { year: number; round: TcasRound },
  ): Promise<{
    uploadId: string;
    rows: StatsPreviewRow[];
    summary: PreviewSummary;
  }> {
    const ext = filename.toLowerCase();
    const parsed = ext.endsWith(".xlsx")
      ? parseStatsXlsx(buffer, meta)
      : parseStatsCsv(buffer.toString("utf8"));

    const previewRows: StatsPreviewRow[] = [];
    for (const r of parsed.rows) {
      if (!r.ok) {
        previewRows.push({
          rowIndex: r.rowIndex,
          status: "error",
          error: r.error,
        });
        continue;
      }
      // Year and round may come from the form (xlsx) or the row itself (csv).
      // The xlsx parser already filled them in; for CSV we trust the row but
      // overwrite if the operator picked something else.
      const merged: ParsedStatsRow = {
        ...r.data,
        year: meta.year,
        round: meta.round,
      };
      const existing = await this.prisma.tcasProgramStat.findUnique({
        where: {
          courseCode_year_round: {
            courseCode: merged.courseCode,
            year: merged.year,
            round: merged.round,
          },
        },
      });
      // We also try to back-link to a program by courseCode so the calculator
      // can display past-stats next to the matching program.
      const linkedProgram = await this.prisma.tcasProgram.findFirst({
        where: { courseCode: merged.courseCode },
        select: { id: true },
      });
      const status: PreviewStatus = !existing
        ? "new"
        : statsRowUnchanged(existing, merged)
          ? "unchanged"
          : "update";
      previewRows.push({
        rowIndex: r.rowIndex,
        status,
        data: merged,
        existingId: existing?.id,
        programLinkedId: linkedProgram?.id ?? null,
      });
    }

    const summary = summarize(previewRows);
    const uploadId = await this.cache.stash<StashedStatsUpload>({
      kind: "stats",
      filename,
      fileHash: sha256(buffer),
      year: meta.year,
      round: meta.round,
      rows: previewRows,
      summary,
    });
    return { uploadId, rows: previewRows, summary };
  }

  async commitStats(
    uploadId: string,
    adminUserId: string,
  ): Promise<CommitResult> {
    const stashed = await this.cache.fetch<StashedUpload>(uploadId);
    if (!stashed || stashed.kind !== "stats") {
      throw new BadRequestException("uploadId หมดอายุหรือไม่ใช่ stats");
    }
    if (stashed.summary.error > 0) {
      throw new BadRequestException(
        `ยังมี ${stashed.summary.error} แถวที่ผิดพลาด — แก้ไฟล์แล้วอัปโหลดใหม่`,
      );
    }
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of stashed.rows) {
        if (row.status === "unchanged") {
          skipped++;
          continue;
        }
        if (!row.data) continue;
        const data = {
          courseCode: row.data.courseCode,
          university: row.data.university,
          faculty: row.data.faculty,
          major: row.data.major,
          year: row.data.year,
          round: row.data.round,
          quotaSeats: row.data.quotaSeats,
          applicants: row.data.applicants,
          passedRound1: row.data.passedRound1,
          passedRound2: row.data.passedRound2,
          maxScoreR1: row.data.maxScoreR1,
          minScoreR1: row.data.minScoreR1,
          maxScoreR2: row.data.maxScoreR2,
          minScoreR2: row.data.minScoreR2,
          sourceFile: stashed.filename,
          programId: row.programLinkedId ?? null,
        };
        if (row.status === "new") {
          await tx.tcasProgramStat.create({ data });
          inserted++;
        } else if (row.status === "update" && row.existingId) {
          await tx.tcasProgramStat.update({
            where: { id: row.existingId },
            data,
          });
          updated++;
        }
      }
      await tx.tcasImportAudit.create({
        data: {
          kind: "stats",
          filename: stashed.filename,
          fileHash: stashed.fileHash,
          inserted,
          updated,
          skipped,
          importedBy: adminUserId,
        },
      });
    });

    await this.cache.drop(uploadId);
    return { inserted, updated, skipped };
  }

  // ─── Audit log ────────────────────────────────────────────────────────

  async listImports() {
    return this.prisma.tcasImportAudit.findMany({
      orderBy: { importedAt: "desc" },
      take: 50,
    });
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function summarize(
  rows: Array<{ status: PreviewStatus }>,
): PreviewSummary {
  const out: PreviewSummary = {
    total: rows.length,
    new: 0,
    update: 0,
    unchanged: 0,
    error: 0,
  };
  for (const r of rows) {
    out[r.status]++;
  }
  return out;
}

function diffCriteriaRow(
  existing: {
    campus: string | null;
    faculty: string;
    courseCode: string | null;
    quotaSeats: number;
    totalMinScore: number | null;
    sourceUrl: string | null;
    components: unknown;
  },
  next: ParsedCriteriaRow,
): CriteriaDiffEntry[] {
  const out: CriteriaDiffEntry[] = [];
  const checks: Array<{ field: string; before: unknown; after: unknown }> = [
    { field: "campus", before: existing.campus, after: next.campus },
    { field: "faculty", before: existing.faculty, after: next.faculty },
    { field: "courseCode", before: existing.courseCode, after: next.courseCode },
    { field: "quotaSeats", before: existing.quotaSeats, after: next.quotaSeats },
    {
      field: "totalMinScore",
      before: existing.totalMinScore,
      after: next.totalMinScore,
    },
    { field: "sourceUrl", before: existing.sourceUrl, after: next.sourceUrl },
  ];
  for (const c of checks) {
    if (c.before !== c.after) out.push(c);
  }
  // Components is JSON; compare canonical-stringified forms.
  const beforeComp = JSON.stringify(existing.components);
  const afterComp = JSON.stringify(next.components);
  if (beforeComp !== afterComp) {
    out.push({
      field: "components",
      before: existing.components,
      after: next.components,
    });
  }
  return out;
}

function statsRowUnchanged(
  existing: {
    quotaSeats: number;
    applicants: number;
    passedRound1: number;
    passedRound2: number;
    maxScoreR1: number | null;
    minScoreR1: number | null;
    maxScoreR2: number | null;
    minScoreR2: number | null;
  },
  next: ParsedStatsRow,
): boolean {
  return (
    existing.quotaSeats === next.quotaSeats &&
    existing.applicants === next.applicants &&
    existing.passedRound1 === next.passedRound1 &&
    existing.passedRound2 === next.passedRound2 &&
    existing.maxScoreR1 === next.maxScoreR1 &&
    existing.minScoreR1 === next.minScoreR1 &&
    existing.maxScoreR2 === next.maxScoreR2 &&
    existing.minScoreR2 === next.minScoreR2
  );
}
