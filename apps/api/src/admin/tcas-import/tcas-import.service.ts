import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

import { PrismaService } from "../../prisma/prisma.service";

import {
  parseCriteriaCsv,
  type ParsedCriteriaRow,
} from "./parsers";
import { TcasImportCache } from "./tcas-import.cache";
import type {
  CommitResult,
  CriteriaDiffEntry,
  CriteriaPreviewRow,
  PreviewStatus,
  PreviewSummary,
  StashedCriteriaUpload,
  StashedUpload,
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

    await this.runCommitTx(async (tx) => {
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

  // Maps Prisma's P2002 (unique constraint violation) into a 400 with a Thai
  // explanation. Anything else bubbles as a 500 — those are genuine bugs.
  private async runCommitTx<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(fn);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const target = Array.isArray(err.meta?.target)
          ? (err.meta!.target as string[]).join(", ")
          : String(err.meta?.target ?? "unknown");
        throw new BadRequestException(
          `มีข้อมูลซ้ำในไฟล์ (${target}) — กรุณาตรวจสอบและลองใหม่`,
        );
      }
      throw err;
    }
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

