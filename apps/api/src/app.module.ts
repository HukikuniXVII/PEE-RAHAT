import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { BookingsModule } from "./bookings/bookings.module";
import { ChatModule } from "./chat/chat.module";
import { CommonModule } from "./common/common.module";
import { CommunityModule } from "./community/community.module";
import { GoogleCalendarModule } from "./integrations/google-calendar/google-calendar.module";
import { JobsModule } from "./jobs/jobs.module";
import { KycModule } from "./kyc/kyc.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QuizModule } from "./quiz/quiz.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { SheetsModule } from "./sheets/sheets.module";
import { TcasModule } from "./tcas/tcas.module";
import { TutorsModule } from "./tutors/tutors.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Default throttler tier — individual routes apply UserThrottlerGuard +
    // @Throttle() to opt in. No global guard, so unscoped routes are
    // untouched until they explicitly need rate limiting.
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 60 }]),
    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    KycModule,
    TutorsModule,
    BookingsModule,
    ReviewsModule,
    SheetsModule,
    TcasModule,
    QuizModule,
    CommunityModule,
    ChatModule,
    PaymentsModule,
    AdminModule,
    JobsModule,
    GoogleCalendarModule,
  ],
})
export class AppModule {}
