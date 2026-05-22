import { Module } from "@nestjs/common";

import { ReportPriorityService } from "./report-priority.service";
import { ReportRateLimitService } from "./report-rate-limit.service";
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
  controllers: [ReportsController],
  providers: [
    TargetResolverService,
    ReportPriorityService,
    ReportRateLimitService,
    ReportsService,
  ],
  exports: [
    TargetResolverService,
    ReportPriorityService,
    ReportRateLimitService,
    ReportsService,
  ],
})
export class ReportsModule {}
