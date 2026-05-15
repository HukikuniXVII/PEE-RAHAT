import { Module } from "@nestjs/common";

import { GoogleCalendarModule } from "../integrations/google-calendar/google-calendar.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PayoutsService } from "./payouts.service";
import { RefundPolicyService } from "./refund-policy.service";
import { ZercleSlipModule } from "./zercle-slip/zercle-slip.module";

@Module({
  imports: [GoogleCalendarModule, ZercleSlipModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PayoutsService, RefundPolicyService],
  exports: [PaymentsService, PayoutsService, RefundPolicyService],
})
export class PaymentsModule {}
