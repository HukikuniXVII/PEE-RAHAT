import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { KycModule } from "../kyc/kyc.module";
import { PaymentsModule } from "../payments/payments.module";
import { ReportsModule } from "../reports/reports.module";
import { JobsService } from "./jobs.service";

/**
 * FR-TH-18: BookingsModule import gives JobsService access to
 * GroupSessionService so the two group-failure sweepers (invite expiry,
 * payment deadline) can run on a cron without disturbing the existing
 * release-for-payout / kyc-archive / report-* job set.
 */
@Module({
  imports: [PaymentsModule, KycModule, ReportsModule, BookingsModule],
  providers: [JobsService],
})
export class JobsModule {}
