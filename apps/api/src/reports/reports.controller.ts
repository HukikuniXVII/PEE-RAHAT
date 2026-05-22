import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  type AddReportCommentDto,
  addReportCommentSchema,
  type CreateReportDto,
  createReportSchema,
  reportStatusSchema,
} from "@peerahat/types";

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
 * User-facing report endpoints (FR-CM-05 / FR-SM-07 / FR-PM-05): file a
 * report, upload evidence, list / read your own reports, and add a
 * follow-up comment while a report is still open.
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

  // `mine` is declared before `:id` so the literal segment wins the match.
  @Get("mine")
  listMine(
    @CurrentUser() user: SupabaseJwtPayload,
    @Query("status") status?: string,
  ) {
    const parsed = status ? reportStatusSchema.parse(status) : undefined;
    return this.reports.listMine(user.sub, parsed);
  }

  @Get(":id")
  getOne(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.reports.getMineDetail(user.sub, id);
  }

  @Post(":id/comment")
  addComment(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    const dto: AddReportCommentDto = addReportCommentSchema.parse(raw);
    return this.reports.addComment(user.sub, id, dto);
  }
}
