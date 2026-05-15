import { Module } from "@nestjs/common";

import { GoogleCalendarModule } from "../integrations/google-calendar/google-calendar.module";
import { PaymentsModule } from "../payments/payments.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [PaymentsModule, GoogleCalendarModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
