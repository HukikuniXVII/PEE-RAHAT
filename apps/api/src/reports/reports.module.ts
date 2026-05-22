import { Module } from "@nestjs/common";

import { TargetResolverService } from "./target-resolver.service";

/**
 * Report system (FR-CM-05 / FR-SM-07 / FR-PM-05).
 *
 * Built incrementally per the execution order. Phase 2 wires only
 * TargetResolverService — controllers, ReportsService, priority /
 * rate-limit / resolution services are added in later steps.
 *
 * PrismaModule is global, so it is not imported here.
 */
@Module({
  providers: [TargetResolverService],
  exports: [TargetResolverService],
})
export class ReportsModule {}
