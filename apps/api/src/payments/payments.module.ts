import { Module } from "@nestjs/common";

import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PayoutsService } from "./payouts.service";
import { SlipOkClient } from "./slip-ok.client";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PayoutsService, SlipOkClient],
  exports: [PayoutsService],
})
export class PaymentsModule {}
