import { Module } from "@nestjs/common";

import { GoogleMeetModule } from "../integrations/google-meet/google-meet.module";
import { PaymentsModule } from "../payments/payments.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [PaymentsModule, GoogleMeetModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
