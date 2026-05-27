import { forwardRef, Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { GoogleCalendarModule } from "../integrations/google-calendar/google-calendar.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PayoutsService } from "./payouts.service";
import { RefundPolicyService } from "./refund-policy.service";
import { ZercleSlipModule } from "./zercle-slip/zercle-slip.module";

/**
 * FR-TH-18: forwardRef into BookingsModule for GroupSessionService.
 * BookingsModule → PaymentsModule has always existed (PostponeService uses
 * payments + refund); the new reverse edge lets PaymentsService dispatch
 * slip-verify → onParticipantPaid for group bookings without otherwise
 * disturbing the 1-on-1 flow.
 */
@Module({
  imports: [
    GoogleCalendarModule,
    NotificationsModule,
    ZercleSlipModule,
    forwardRef(() => BookingsModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PayoutsService, RefundPolicyService],
  exports: [PaymentsService, PayoutsService, RefundPolicyService],
})
export class PaymentsModule {}
