import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { AdminReportsController } from "./admin-reports.controller";
import { AdminReportsService } from "./admin-reports.service";
import { ReportCronService } from "./report-cron.service";
import { ReportPriorityService } from "./report-priority.service";
import { ReportRateLimitService } from "./report-rate-limit.service";
import { ReportResolutionService } from "./report-resolution.service";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { TargetResolverService } from "./target-resolver.service";

/**
 * Report system (FR-CM-05 / FR-SM-07 / FR-PM-05).
 *
 * Built incrementally per the execution order. Wired so far: target
 * resolution, auto-priority/SLA, anti-abuse rate limiting, and the
 * user-facing file + evidence-upload endpoints — read endpoints, the
 * admin surface and the resolution service follow.
 *
 * PrismaModule and CommonModule (StorageService) are global, so they
 * are not imported here.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [ReportsController, AdminReportsController],
  providers: [
    TargetResolverService,
    ReportPriorityService,
    ReportRateLimitService,
    ReportResolutionService,
    ReportsService,
    AdminReportsService,
    ReportCronService,
  ],
  exports: [
    TargetResolverService,
    ReportPriorityService,
    ReportRateLimitService,
    ReportResolutionService,
    ReportsService,
    ReportCronService,
  ],
})
export class ReportsModule {}
