import { Module } from "@nestjs/common";

import { ChatModule } from "../../chat/chat.module";
import { ClassStartQueue } from "./class-start.queue";
import { GoogleMeetService } from "./google-meet.service";

/**
 * FR-TH-17. Owns the Calendar API wrapper + the class-start BullMQ worker
 * that fires `GOOGLE_MEET_LEAD_MINUTES` before each paid booking. Imported
 * by PaymentsModule + AdminModule (to enqueue at payment-confirm) and by
 * BookingsModule (to cancel + re-enqueue on postpone-confirm).
 */
@Module({
  imports: [ChatModule],
  providers: [GoogleMeetService, ClassStartQueue],
  exports: [GoogleMeetService, ClassStartQueue],
})
export class GoogleMeetModule {}
