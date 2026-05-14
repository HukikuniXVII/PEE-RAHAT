import { Module } from "@nestjs/common";

import { ChatModule } from "../chat/chat.module";
import { PaymentsModule } from "../payments/payments.module";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { PostponeQueue } from "./postpone.queue";
import { PostponeService } from "./postpone.service";

@Module({
  imports: [ChatModule, PaymentsModule],
  controllers: [BookingsController],
  providers: [BookingsService, PostponeService, PostponeQueue],
  exports: [PostponeService],
})
export class BookingsModule {}
