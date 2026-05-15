import { Module } from "@nestjs/common";

import { ChatModule } from "../../chat/chat.module";
import { GoogleMeetService } from "./google-meet.service";

/**
 * FR-TH-17. The worker is added in a follow-up commit; this module exists
 * standalone so it can be imported by both BookingsModule (postpone-confirm
 * cleanup) and the upcoming class-start worker.
 */
@Module({
  imports: [ChatModule],
  providers: [GoogleMeetService],
  exports: [GoogleMeetService],
})
export class GoogleMeetModule {}
