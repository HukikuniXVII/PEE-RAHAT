import { Module } from "@nestjs/common";

import { KycModule } from "../kyc/kyc.module";
import { PaymentsModule } from "../payments/payments.module";
import { ReportsModule } from "../reports/reports.module";
import { JobsService } from "./jobs.service";

@Module({
  imports: [PaymentsModule, KycModule, ReportsModule],
  providers: [JobsService],
})
export class JobsModule {}
