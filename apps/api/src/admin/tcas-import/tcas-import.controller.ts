import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { tcasRoundSchema, type TcasRound } from "@peerahat/types";
import type { Response } from "express";
import { z } from "zod";

import { SupabaseAuthGuard } from "../../auth/auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../../auth/supabase-jwt.strategy";
import { PrismaService } from "../../prisma/prisma.service";

import { EXAM_CATALOGUE } from "../../tcas/exam-catalogue";
import { TcasImportService } from "./tcas-import.service";
import { TcasPdfParseService } from "./tcas-pdf-parse.service";

// 5 MB. Criteria CSVs are well under 1 MB even with hundreds of programs;
// the headroom is for very-wide components DSL strings.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const commitSchema = z.object({ uploadId: z.string().uuid() });
type CommitDto = z.infer<typeof commitSchema>;

const parsePdfMetaSchema = z.object({
  university: z.string().min(1),
  round: tcasRoundSchema,
  admissionYear: z.coerce.number().int().min(2500).max(2600),
  sourceUrl: z.string().optional(),
});

@Controller("admin/tcas")
@UseGuards(SupabaseAuthGuard)
export class TcasImportController {
  constructor(
    private readonly importer: TcasImportService,
    private readonly pdfParser: TcasPdfParseService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Criteria ──────────────────────────────────────────────────────────

  @Post("criteria/preview")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async previewCriteria(
    @CurrentUser() user: SupabaseJwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.assertAdmin(user.sub);
    if (!file) throw new BadRequestException("ไม่มีไฟล์แนบ");
    return this.importer.previewCriteria(file.originalname, file.buffer);
  }

  @Post("criteria/commit")
  async commitCriteria(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const admin = await this.assertAdmin(user.sub);
    const dto: CommitDto = commitSchema.parse(raw);
    return this.importer.commitCriteria(dto.uploadId, admin.id);
  }

  // ─── PDF → CSV assist (preview-only; never writes to DB) ──────────────

  @Post("criteria/parse-pdf")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async parseCriteriaPdf(
    @CurrentUser() user: SupabaseJwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() raw: Record<string, string>,
    @Res({ passthrough: false }) res: Response,
  ) {
    await this.assertAdmin(user.sub);
    if (!file) throw new BadRequestException("ไม่มีไฟล์ PDF แนบ");
    if (
      !file.originalname.toLowerCase().endsWith(".pdf") &&
      file.mimetype !== "application/pdf"
    ) {
      throw new BadRequestException("กรุณาแนบไฟล์ .pdf");
    }
    const meta = parsePdfMetaSchema.safeParse(raw);
    if (!meta.success) {
      throw new BadRequestException(
        meta.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    }

    const csv = await this.pdfParser.parsePdfToCsv(file.buffer, {
      university: meta.data.university,
      round: meta.data.round as TcasRound,
      admissionYear: meta.data.admissionYear,
      sourceUrl: meta.data.sourceUrl,
    });

    const base = file.originalname.replace(/\.pdf$/i, "");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${base || "tcas-criteria"}-draft.csv"`,
    );
    res.send(csv);
  }

  // ─── Audit log ────────────────────────────────────────────────────────

  @Get("imports")
  async imports(@CurrentUser() user: SupabaseJwtPayload) {
    await this.assertAdmin(user.sub);
    return this.importer.listImports();
  }

  // ─── Catalogue (admin-gated, used by import UI dropdowns) ─────────────

  @Get("exam-catalogue")
  examCatalogue() {
    return Object.entries(EXAM_CATALOGUE).map(([key, value]) => ({
      key,
      system: value.system,
      nameTh: value.nameTh,
    }));
  }

  private async assertAdmin(supabaseId: string) {
    const u = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!u || u.role !== "admin") throw new ForbiddenException();
    return u;
  }
}
