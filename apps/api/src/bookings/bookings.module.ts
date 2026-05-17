import { Module } from "@nestjs/common";

import { ChatModule } from "../chat/chat.module";
import { GoogleCalendarModule } from "../integrations/google-calendar/google-calendar.module";
import { PaymentsModule } from "../payments/payments.module";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { PostponeQueue } from "./postpone.queue";
import { PostponeService } from "./postpone.service";

/**
 * Module graph (downstream-only; verified acyclic):
 *
 *   BookingsModule
 *   ├── ChatModule         → PostponeService.chat (system messages)
 *   ├── PaymentsModule     → PostponeService.payments (refund handling)
 *   └── GoogleCalendarModule → PostponeService.googleCalendar (Meet cleanup)
 *
 * Reverse imports: only AppModule (root) and TutorsModule. Nothing in
 * Payments/Chat/GoogleCalendar points back to BookingsModule, so no
 * forwardRef is needed. If a future change introduces a cycle, prefer
 * extracting the shared piece into its own module over forwardRef.
 */
@Module({
  imports: [ChatModule, PaymentsModule, GoogleCalendarModule],
  controllers: [BookingsController],
  providers: [BookingsService, PostponeService, PostponeQueue],
  exports: [BookingsService, PostponeService],
})
export class BookingsModule {}
