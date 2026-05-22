import { Module } from "@nestjs/common";

import { ReportPriorityService } from "./report-priority.service";
import { ReportRateLimitService } from "./report-rate-limit.service";
import { TargetResolverService } from "./target-resolver.service";

/**
 * Report system (FR-CM-05 / FR-SM-07 / FR-PM-05).
 *
 * Built incrementally per the execution order. Wired so far: target
 * resolution, auto-priority/SLA, and anti-abuse rate limiting —
 * controllers, ReportsService and the resolution service follow.
 *
 * PrismaModule is global, so it is not imported here.
 */
@Module({
  providers: [
    TargetResolverService,
    ReportPriorityService,
    ReportRateLimitService,
  ],
  exports: [
    TargetResolverService,
    ReportPriorityService,
    ReportRateLimitService,
  ],
})
export class ReportsModule {}
