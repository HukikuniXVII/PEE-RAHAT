import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { GoogleCalendarModule } from "../integrations/google-calendar/google-calendar.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsModule } from "../payments/payments.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    PaymentsModule,
    BookingsModule, // FR-TH-18 rev2: approveSlip delegates to GroupSessionService for group bookings
    GoogleCalendarModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
