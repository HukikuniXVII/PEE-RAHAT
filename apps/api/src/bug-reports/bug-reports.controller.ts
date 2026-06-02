import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  type CreateBugReportDto,
  createBugReportSchema,
} from "@peerahat/types";

import { SupabaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSupabaseAuthGuard } from "../auth/optional-auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { BugReportsService } from "./bug-reports.service";

/** Hard multer ceiling; the precise 5MB limit + Thai 413 lives in the
 *  service. */
const SCREENSHOT_HARD_CEILING_BYTES = 15 * 1024 * 1024;

/**
 * User-facing bug report endpoints. create + upload-evidence use the
 * optional auth guard so logged-out users can also file bugs (reporterId
 * resolves to null); `mine` requires a real session.
 */
@Controller("bug-reports")
export class BugReportsController {
  constructor(private readonly bugReports: BugReportsService) {}

  @Post()
  @UseGuards(OptionalSupabaseAuthGuard)
  create(
    @CurrentUser() user: SupabaseJwtPayload | undefined,
    @Body() raw: unknown,
    @Ip() ip: string,
  ) {
    const dto: CreateBugReportDto = createBugReportSchema.parse(raw);
    return this.bugReports.create(user?.sub, dto, ip);
  }

  @Post("upload-evidence")
  @UseGuards(OptionalSupabaseAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: SCREENSHOT_HARD_CEILING_BYTES, files: 1 },
    }),
  )
  uploadEvidence(@UploadedFile() file?: Express.Multer.File) {
    return this.bugReports.uploadScreenshot(file);
  }

  @Get("mine")
  @UseGuards(SupabaseAuthGuard)
  listMine(@CurrentUser() user: SupabaseJwtPayload) {
    return this.bugReports.listMine(user.sub);
  }
}
