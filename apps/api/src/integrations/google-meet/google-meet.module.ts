import { Module } from "@nestjs/common";

import { ChatModule } from "../../chat/chat.module";
import { GoogleMeetService } from "./google-meet.service";

/**
 * FR-TH-17. Owns the Calendar API wrapper. The service is called inline
 * on payment-confirm (PaymentsService, AdminService) and on postpone-
 * confirm (PostponeService) — there's no BullMQ scheduling layer, so this
 * module is a pure provider.
 */
@Module({
  imports: [ChatModule],
  providers: [GoogleMeetService],
  exports: [GoogleMeetService],
})
export class GoogleMeetModule {}
