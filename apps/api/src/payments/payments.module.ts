import { Module } from "@nestjs/common";

import { GoogleMeetModule } from "../integrations/google-meet/google-meet.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PayoutsService } from "./payouts.service";
import { RefundPolicyService } from "./refund-policy.service";
import { SlipOkClient } from "./slip-ok.client";

@Module({
  imports: [GoogleMeetModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PayoutsService, RefundPolicyService, SlipOkClient],
  exports: [PaymentsService, PayoutsService, RefundPolicyService],
})
export class PaymentsModule {}
