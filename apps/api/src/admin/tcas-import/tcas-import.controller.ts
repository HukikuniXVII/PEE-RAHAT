import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  programComponentsSchema,
  tcasRoundSchema,
  type AiUsageLogEntry,
  type AiUsageSummary,
  type ParsedProgramRow,
  type ProgramComponents,
  type TcasAiParseResponse,
  type TcasCommitResult,
  type TcasImportAuditEntry,
  type TcasPreviewStatus,
  type TcasPreviewSummary,
  type TcasRound,
  type TcasRowEdits,
} from "@peerahat/types";
import { createHash } from "node:crypto";
import { z } from "zod";

import { SupabaseAuthGuard } from "../../auth/auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../../auth/supabase-jwt.strategy";
import { PrismaService } from "../../prisma/prisma.service";

import {
  TcasAiParserService,
  type ParseContext,
} from "./ai/tcas-ai-parser.service";
import { TcasImportCache } from "./tcas-import.cache";

// 20 MB — matches GEMINI_MAX_PDF_MB default. The parser service does the
// authoritative pre-flight; this cap just shields Multer's buffer.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

// ─── Wire DTOs (server-internal) ────────────────────────────────────────

const parseAiMetaSchema = z.object({
  university: z.string().min(1),
  round: tcasRoundSchema,
  admissionYear: z.coerce.number().int().min(2500).max(2600),
  sourceUrl: z.string().optional(),
  allowFallback: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "string" ? v !== "false" : v)),
});

const reparseSchema = z.object({
  uploadId: z.string().uuid(),
  model: z.string().optional(),
});

// Row-edit values aren't validated at the zod layer — applyRowEdits + the
// per-row programComponentsSchema gate at commit time is the source of
// truth. We accept an opaque map here and cast to TcasRowEdits internally.
const commitSchema = z.object({
  uploadId: z.string().uuid(),
  rowEdits: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

// Stash kept alongside the uploadId. PDF buffer is stored base64 so reparse
// can rerun against it without forcing the admin to re-upload.
interface StashedAiUpload {
  kind: "criteria-ai";
  filename: string;
  fileHash: string;
  pdfBase64: string;
  context: ParseContext;
  rows: ParsedProgramRow[];
  summary: TcasPreviewSummary;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  parseDurationMs: number;
  estimatedCostUsd: number;
}

@Controller("admin")
@UseGuards(SupabaseAuthGuard)
export class TcasImportController {
  constructor(
    private readonly aiParser: TcasAiParserService,
    private readonly cache: TcasImportCache,
    private readonly prisma: PrismaService,
  ) {}

  // ─── AI parse ──────────────────────────────────────────────────────────

  @Post("tcas/criteria/parse-ai")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async parseAi(
    @CurrentUser() user: SupabaseJwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() raw: Record<string, string>,
  ): Promise<TcasAiParseResponse> {
    const admin = await this.assertAdmin(user.sub);
    if (!file) throw new BadRequestException("ไม่มีไฟล์ PDF แนบ");
    if (
      !file.originalname.toLowerCase().endsWith(".pdf") &&
      file.mimetype !== "application/pdf"
    ) {
      throw new BadRequestException("กรุณาแนบไฟล์ .pdf");
    }
    const meta = parseAiMetaSchema.safeParse(raw);
    if (!meta.success) {
      throw new BadRequestException(
        meta.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    }

    const ctx: ParseContext = {
      university: meta.data.university,
      round: meta.data.round as TcasRound,
      admissionYear: meta.data.admissionYear,
      sourceUrl: meta.data.sourceUrl,
      allowFallback: meta.data.allowFallback,
    };
    const result = await this.aiParser.parsePdf(file.buffer, ctx);

    const stash: StashedAiUpload = {
      kind: "criteria-ai",
      filename: file.originalname,
      fileHash: sha256(file.buffer),
      pdfBase64: file.buffer.toString("base64"),
      context: ctx,
      rows: result.rows,
      summary: summarizeRows(result.rows),
      modelUsed: result.modelUsed,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      parseDurationMs: result.parseDurationMs,
      estimatedCostUsd: result.estimatedCostUsd,
    };
    const uploadId = await this.cache.stash<StashedAiUpload>(stash);

    await this.recordAiUsage({
      adminId: admin.id,
      service: "tcas-parse",
      model: result.modelUsed,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      durationMs: result.parseDurationMs,
      fileName: file.originalname,
      rowCount: result.rows.length,
    });

    return {
      uploadId,
      rows: result.rows,
      summary: stash.summary,
      modelUsed: result.modelUsed,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      parseDurationMs: result.parseDurationMs,
      estimatedCostUsd: result.estimatedCostUsd,
    };
  }

  // ─── Reparse with a different model on the same stashed PDF ───────────

  @Post("tcas/criteria/parse-ai/reparse")
  async reparseAi(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ): Promise<TcasAiParseResponse> {
    const admin = await this.assertAdmin(user.sub);
    const dto = reparseSchema.parse(raw);
    const stash = await this.cache.fetch<StashedAiUpload>(dto.uploadId);
    if (!stash || stash.kind !== "criteria-ai") {
      throw new BadRequestException("uploadId หมดอายุหรือไม่ถูกต้อง");
    }

    const targetModel =
      dto.model ?? process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.5-pro";
    const buffer = Buffer.from(stash.pdfBase64, "base64");
    const result = await this.aiParser.reparseWith(
      targetModel,
      buffer,
      stash.context,
    );

    const updated: StashedAiUpload = {
      ...stash,
      rows: result.rows,
      summary: summarizeRows(result.rows),
      modelUsed: result.modelUsed,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      parseDurationMs: result.parseDurationMs,
      estimatedCostUsd: result.estimatedCostUsd,
    };
    // Drop the old stash key + create a new one so the UI gets a fresh
    // uploadId (defends against partial state mid-reparse).
    await this.cache.drop(dto.uploadId);
    const newUploadId = await this.cache.stash<StashedAiUpload>(updated);

    await this.recordAiUsage({
      adminId: admin.id,
      service: "tcas-parse",
      model: result.modelUsed,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      durationMs: result.parseDurationMs,
      fileName: stash.filename,
      rowCount: result.rows.length,
    });

    return {
      uploadId: newUploadId,
      rows: updated.rows,
      summary: updated.summary,
      modelUsed: updated.modelUsed,
      promptTokens: updated.promptTokens,
      completionTokens: updated.completionTokens,
      parseDurationMs: updated.parseDurationMs,
      estimatedCostUsd: updated.estimatedCostUsd,
    };
  }

  // ─── Commit — never gated by kill-switch (finalizes pending work) ─────

  @Post("tcas/criteria/commit")
  async commit(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ): Promise<TcasCommitResult> {
    const admin = await this.assertAdmin(user.sub);
    const dto = commitSchema.parse(raw);
    const stash = await this.cache.fetch<StashedAiUpload>(dto.uploadId);
    if (!stash || stash.kind !== "criteria-ai") {
      throw new BadRequestException("uploadId หมดอายุหรือไม่ถูกต้อง");
    }

    const merged = applyRowEdits(
      stash.rows,
      (dto.rowEdits ?? {}) as TcasRowEdits,
    );
    // Server-side zod gate. The admin may have edited components into an
    // invalid shape; we refuse before writing any row.
    const errors = collectInvalidRows(merged);
    if (errors.length > 0) {
      throw new BadRequestException(
        `แถวที่ผิดพลาด: ${errors.slice(0, 5).join("; ")}`,
      );
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of merged) {
        if (!row.faculty || !row.major) {
          skipped++;
          continue;
        }
        // Prisma v5 doesn't compose findUnique-where with nullable parts,
        // so we use findFirst then create/update by id.
        const existing = await tx.tcasProgram.findFirst({
          where: {
            university: stash.context.university,
            major: row.major,
            round: stash.context.round,
            admissionYear: stash.context.admissionYear,
            subTrack: row.subTrack,
            programType: row.programType,
          },
          select: { id: true },
        });
        const data = {
          university: stash.context.university,
          campus: null,
          faculty: row.faculty,
          major: row.major,
          subTrack: row.subTrack,
          programType: row.programType,
          courseCode: null as string | null,
          round: stash.context.round,
          admissionYear: stash.context.admissionYear,
          quotaSeats: row.quotaSeats ?? 0,
          components: row.components as unknown as object,
          totalMinScore: row.totalMinScore,
          tags: [] as string[],
          sourceUrl: stash.context.sourceUrl ?? null,
          sourceFile: stash.filename,
          importedAt: new Date(),
          importedBy: admin.id,
        };
        if (existing) {
          await tx.tcasProgram.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await tx.tcasProgram.create({ data });
          inserted++;
        }
      }
      await tx.tcasImportAudit.create({
        data: {
          kind: "criteria-ai",
          filename: stash.filename,
          fileHash: stash.fileHash,
          inserted,
          updated,
          skipped,
          importedBy: admin.id,
        },
      });
    });

    await this.cache.drop(dto.uploadId);
    return { inserted, updated, skipped };
  }

  // ─── Audit log + AI usage read endpoints ──────────────────────────────

  @Get("tcas/imports")
  async listImports(
    @CurrentUser() user: SupabaseJwtPayload,
  ): Promise<TcasImportAuditEntry[]> {
    await this.assertAdmin(user.sub);
    const rows = await this.prisma.tcasImportAudit.findMany({
      orderBy: { importedAt: "desc" },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      filename: r.filename,
      fileHash: r.fileHash,
      inserted: r.inserted,
      updated: r.updated,
      skipped: r.skipped,
      importedBy: r.importedBy,
      importedAt: r.importedAt.toISOString(),
    }));
  }

  @Get("ai-usage")
  async aiUsage(
    @CurrentUser() user: SupabaseJwtPayload,
    @Query("since") sinceParam?: string,
    @Query("until") untilParam?: string,
  ): Promise<{ summary: AiUsageSummary; recent: AiUsageLogEntry[] }> {
    await this.assertAdmin(user.sub);
    const since = sinceParam ? new Date(sinceParam) : firstOfMonth();
    const until = untilParam ? new Date(untilParam) : new Date();

    const rows = await this.prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: since, lte: until } },
      orderBy: { createdAt: "desc" },
    });
    const summary: AiUsageSummary = {
      service: "tcas-parse",
      parses: rows.length,
      totalCostUsd: rows.reduce((a, r) => a + r.estimatedCostUsd, 0),
      totalPromptTokens: rows.reduce((a, r) => a + r.promptTokens, 0),
      totalCompletionTokens: rows.reduce((a, r) => a + r.completionTokens, 0),
      rangeStart: since.toISOString(),
      rangeEnd: until.toISOString(),
    };
    return {
      summary,
      recent: rows.slice(0, 20).map((r) => ({
        id: r.id,
        adminId: r.adminId,
        service: r.service,
        model: r.model,
        promptTokens: r.promptTokens,
        completionTokens: r.completionTokens,
        estimatedCostUsd: r.estimatedCostUsd,
        durationMs: r.durationMs,
        fileName: r.fileName,
        rowCount: r.rowCount,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private async recordAiUsage(entry: {
    adminId: string;
    service: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
    durationMs: number;
    fileName: string | null;
    rowCount: number | null;
  }) {
    await this.prisma.aiUsageLog.create({ data: entry });
  }

  private async assertAdmin(supabaseId: string) {
    const u = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!u || u.role !== "admin") throw new ForbiddenException();
    return u;
  }
}

// ─── Free helpers ────────────────────────────────────────────────────────

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function firstOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function summarizeRows(rows: ParsedProgramRow[]): TcasPreviewSummary {
  // For AI-parsed previews we don't yet know `update` vs `new` against the
  // DB — that distinction happens at commit time. The summary here gives the
  // UI a quick health check: how many rows have schema errors / low conf?
  const out: TcasPreviewSummary = {
    total: rows.length,
    new: 0,
    update: 0,
    unchanged: 0,
    error: 0,
  };
  for (const r of rows) {
    const status = rowStatus(r);
    out[status]++;
  }
  return out;
}

function rowStatus(r: ParsedProgramRow): TcasPreviewStatus {
  if (!r.faculty || !r.major) return "error";
  const components = programComponentsSchema.safeParse(r.components);
  if (!components.success) return "error";
  if (r.confidence < 0.5) return "error";
  return "new";
}

function applyRowEdits(
  rows: ParsedProgramRow[],
  edits: TcasRowEdits,
): ParsedProgramRow[] {
  if (!edits || Object.keys(edits).length === 0) return rows;
  return rows.map((row, idx) => {
    const patch = edits[String(idx)];
    if (!patch) return row;
    // Shallow merge — admin edits replace whole fields. For components
    // we trust the patch's full ProgramComponents (the UI builds one).
    return { ...row, ...(patch as Partial<ParsedProgramRow>) };
  });
}

function collectInvalidRows(rows: ParsedProgramRow[]): string[] {
  const errors: string[] = [];
  rows.forEach((r, idx) => {
    if (!r.faculty || !r.major) {
      errors.push(`row ${idx + 1}: ขาด faculty/major`);
      return;
    }
    const parsed: ProgramComponents = r.components;
    const check = programComponentsSchema.safeParse(parsed);
    if (!check.success) {
      const msg = check.error.issues[0]?.message ?? "invalid components";
      errors.push(`row ${idx + 1}: ${msg}`);
    }
  });
  return errors;
}
