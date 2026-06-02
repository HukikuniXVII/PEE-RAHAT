import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  type AdminUpdateBugReportDto,
  adminUpdateBugReportSchema,
  bugCategorySchema,
  bugSeveritySchema,
  bugStatusSchema,
} from "@peerahat/types";

import { AdminGuard } from "../auth/admin.guard";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import { BugReportsService } from "./bug-reports.service";

/** Admin triage queue for bug reports — separate from /admin/reports. */
@Controller("admin/bug-reports")
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class AdminBugReportsController {
  constructor(private readonly bugReports: BugReportsService) {}

  @Get("queue")
  queue(
    @Query("status") status?: string,
    @Query("severity") severity?: string,
    @Query("category") category?: string,
  ) {
    return this.bugReports.adminQueue({
      status: status ? bugStatusSchema.parse(status) : undefined,
      severity: severity ? bugSeveritySchema.parse(severity) : undefined,
      category: category ? bugCategorySchema.parse(category) : undefined,
    });
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.bugReports.adminDetail(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() raw: unknown) {
    const dto: AdminUpdateBugReportDto = adminUpdateBugReportSchema.parse(raw);
    return this.bugReports.adminUpdate(id, dto);
  }
}
