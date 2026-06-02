import { Module } from "@nestjs/common";

import { AdminBugReportsController } from "./admin-bug-reports.controller";
import { BugReportCronService } from "./bug-report-cron.service";
import { BugReportRateLimitService } from "./bug-report-rate-limit.service";
import { BugReportsController } from "./bug-reports.controller";
import { BugReportsService } from "./bug-reports.service";

/**
 * Bug report system (product feedback). PrismaModule + CommonModule
 * (StorageService) are global, so they aren't imported here.
 */
@Module({
  controllers: [BugReportsController, AdminBugReportsController],
  providers: [
    BugReportsService,
    BugReportRateLimitService,
    BugReportCronService,
  ],
  exports: [BugReportsService, BugReportCronService],
})
export class BugReportsModule {}
