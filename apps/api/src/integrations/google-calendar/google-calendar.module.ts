import { Module } from "@nestjs/common";

import { AuthModule } from "../../auth/auth.module";
import { ChatModule } from "../../chat/chat.module";
import { GoogleCalendarController } from "./google-calendar.controller";
import { GoogleCalendarService } from "./google-calendar.service";
import { GoogleOAuthService } from "./google-oauth.service";

/**
 * FR-TH-17 rev3. Owns per-tutor Google OAuth + the Calendar API wrapper.
 *
 *  - Controller exposes /auth/google/{connect,callback,disconnect,status}
 *  - GoogleOAuthService handles the dance + token storage + lookups
 *  - GoogleCalendarService.createMeetLink is called inline at payment-
 *    confirm and on postpone-confirm; deleteEvent does cleanup.
 *
 * CryptoService comes from the global CommonModule.
 */
@Module({
  imports: [AuthModule, ChatModule],
  controllers: [GoogleCalendarController],
  providers: [GoogleOAuthService, GoogleCalendarService],
  exports: [GoogleOAuthService, GoogleCalendarService],
})
export class GoogleCalendarModule {}
