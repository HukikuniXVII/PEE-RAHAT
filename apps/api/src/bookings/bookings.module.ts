import { forwardRef, Module } from "@nestjs/common";

import { ChatModule } from "../chat/chat.module";
import { GoogleCalendarModule } from "../integrations/google-calendar/google-calendar.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsModule } from "../payments/payments.module";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { GroupSessionService } from "./group-session.service";
import { InvitesController } from "./invites.controller";
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
 *
 * FR-TH-18: GroupSessionService is colocated here because it depends on
 * BookingsService (overlap check for invitees) and shares the same
 * BookingParticipant / Booking schema surface. Step 7 will make
 * PaymentsService call it back from uploadSlip — that's safe because
 * PaymentsModule still doesn't import BookingsModule (the call routes
 * through a forwardRef at that point).
 */
@Module({
  imports: [
    ChatModule,
    forwardRef(() => PaymentsModule),
    GoogleCalendarModule,
    NotificationsModule,
  ],
  controllers: [BookingsController, InvitesController],
  providers: [BookingsService, GroupSessionService, PostponeService, PostponeQueue],
  exports: [BookingsService, GroupSessionService, PostponeService],
})
export class BookingsModule {}
