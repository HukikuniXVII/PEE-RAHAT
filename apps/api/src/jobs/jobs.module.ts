import { Module } from "@nestjs/common";

import { KycModule } from "../kyc/kyc.module";
import { PaymentsModule } from "../payments/payments.module";
import { JobsService } from "./jobs.service";

@Module({
  imports: [PaymentsModule, KycModule],
  providers: [JobsService],
})
export class JobsModule {}
