import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { TutorsController } from "./tutors.controller";
import { TutorsService } from "./tutors.service";

@Module({
  imports: [BookingsModule],
  controllers: [TutorsController],
  providers: [TutorsService],
  exports: [TutorsService],
})
export class TutorsModule {}
