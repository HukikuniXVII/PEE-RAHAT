import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TutorsController } from "./tutors.controller";
import { TutorsService } from "./tutors.service";

@Module({
  imports: [BookingsModule, NotificationsModule],
  controllers: [TutorsController],
  providers: [TutorsService],
  exports: [TutorsService],
})
export class TutorsModule {}
