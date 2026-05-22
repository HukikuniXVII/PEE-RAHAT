import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { type CreateReportDto, createReportSchema } from "@peerahat/types";

import { SupabaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { ReportsService } from "./reports.service";

/**
 * Hard memory ceiling for an evidence upload. The precise, env-configurable
 * limit (REPORT_MAX_EVIDENCE_MB) is enforced in ReportsService with a Thai
 * 413 message; this multer cap only guards against unbounded buffering.
 */
const EVIDENCE_HARD_CEILING_BYTES = 30 * 1024 * 1024;

/**
 * User-facing report endpoints (FR-CM-05 / FR-SM-07 / FR-PM-05). Filing
 * and evidence upload land here; the read endpoints (mine / :id / comment)
 * are added in a later step.
 */
@Controller("reports")
@UseGuards(SupabaseAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@CurrentUser() user: SupabaseJwtPayload, @Body() raw: unknown) {
    const dto: CreateReportDto = createReportSchema.parse(raw);
    return this.reports.create(user.sub, dto);
  }

  @Post("upload-evidence")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: EVIDENCE_HARD_CEILING_BYTES, files: 1 },
    }),
  )
  uploadEvidence(
    @CurrentUser() user: SupabaseJwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.reports.uploadEvidence(user.sub, file);
  }
}
