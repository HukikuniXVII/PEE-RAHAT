import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { tcasRoundSchema, type TcasRound } from "@peerahat/types";
import { z } from "zod";

import { SupabaseAuthGuard } from "../../auth/auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../../auth/supabase-jwt.strategy";
import { PrismaService } from "../../prisma/prisma.service";

import { EXAM_CATALOGUE } from "../../tcas/exam-catalogue";
import { TcasImportService } from "./tcas-import.service";

// 5 MB. CUPT xlsx files are ~200 KB; this leaves headroom for a many-program
// criteria CSV without inviting denial-of-service upload abuse.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const commitSchema = z.object({ uploadId: z.string().uuid() });
type CommitDto = z.infer<typeof commitSchema>;

const statsMetaSchema = z.object({
  year: z.coerce.number().int().min(2500).max(2600),
  round: tcasRoundSchema,
});

@Controller("admin/tcas")
@UseGuards(SupabaseAuthGuard)
export class TcasImportController {
  constructor(
    private readonly importer: TcasImportService,
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

  // ─── Stats ─────────────────────────────────────────────────────────────

  @Post("stats/preview")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async previewStats(
    @CurrentUser() user: SupabaseJwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() raw: Record<string, string>,
  ) {
    await this.assertAdmin(user.sub);
    if (!file) throw new BadRequestException("ไม่มีไฟล์แนบ");
    const meta = statsMetaSchema.safeParse(raw);
    if (!meta.success) {
      throw new BadRequestException(
        `ต้องระบุ year + round (${meta.error.issues.map((i) => i.message).join("; ")})`,
      );
    }
    return this.importer.previewStats(file.originalname, file.buffer, {
      year: meta.data.year,
      round: meta.data.round as TcasRound,
    });
  }

  @Post("stats/commit")
  async commitStats(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const admin = await this.assertAdmin(user.sub);
    const dto: CommitDto = commitSchema.parse(raw);
    return this.importer.commitStats(dto.uploadId, admin.id);
  }

  // ─── Audit log ────────────────────────────────────────────────────────

  @Get("imports")
  async imports(@CurrentUser() user: SupabaseJwtPayload) {
    await this.assertAdmin(user.sub);
    return this.importer.listImports();
  }

  // ─── Catalogue (read-only; not behind admin since UIs everywhere may use it) ──

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
