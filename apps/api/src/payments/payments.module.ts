import { Module } from "@nestjs/common";

import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { SlipOkClient } from "./slip-ok.client";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, SlipOkClient],
})
export class PaymentsModule {}
