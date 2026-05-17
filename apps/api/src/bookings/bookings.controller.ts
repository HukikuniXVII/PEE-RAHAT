import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsIn, IsInt, IsString, MaxLength, MinLength } from "class-validator";
import { createBookingSchema, type CreateBookingDto } from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { parseAvailabilityWindow } from "../common/availability-window";
import { UserThrottlerGuard } from "../common/user-throttler.guard";
import { BookingsService } from "./bookings.service";
import { PostponeService } from "./postpone.service";

// Postpone proposals keep 30-min granularity for the chat negotiation flow.
// New-booking durations live in @peerahat/types' createBookingSchema.
const PROPOSE_DURATIONS = [30, 60, 90, 120] as const;

class ReportDto {
  @IsString() reason!: string;
  @IsString() details!: string;
}

class PostponeDto {
  @IsString() @MinLength(5) @MaxLength(500) reason!: string;
}

class ProposeSlotDto {
  @IsString() scheduledAt!: string;
  @IsInt()
  @IsIn(PROPOSE_DURATIONS)
  durationMinutes!: number;
}

@Controller("bookings")
@UseGuards(SupabaseAuthGuard)
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly postpone: PostponeService,
  ) {}

  @Get()
  mine(@CurrentUser() user: SupabaseJwtPayload) {
    return this.bookings.listForUser(user.sub);
  }

  @Get("mine/busy")
  mineBusy(
    @CurrentUser() user: SupabaseJwtPayload,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    const { fromDate, toDate } = parseAvailabilityWindow(from, to);
    return this.bookings
      .listBusyForUser(user.sub, fromDate, toDate)
      .then((busy) => ({ busy }));
  }

  @Get(":id")
  byId(@CurrentUser() user: SupabaseJwtPayload, @Param("id") id: string) {
    return this.bookings.findById(user.sub, id);
  }

  // FR-TH-06: cap booking-create at 10/min per Supabase user. The class-level
  // SupabaseAuthGuard populates req.user before UserThrottlerGuard runs, so
  // the throttle bucket is per-user rather than per-IP (which would
  // rate-limit shared-IP students against each other).
  //
  // Validation goes through @peerahat/types' createBookingSchema (single
  // source of truth, also used by the web client) instead of a duplicate
  // class-validator DTO. Catches Subject-enum violations the old @IsString
  // DTO would have let through to Prisma as a 500.
  @Post()
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() user: SupabaseJwtPayload, @Body() raw: unknown) {
    const parsed = createBookingSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid booking request",
        issues: parsed.error.issues,
      });
    }
    const dto: CreateBookingDto = parsed.data;
    return this.bookings.create(user.sub, dto);
  }

  @Post(":id/accept")
  accept(@CurrentUser() user: SupabaseJwtPayload, @Param("id") id: string) {
    return this.bookings.accept(user.sub, id);
  }

  @Post(":id/report")
  report(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() dto: ReportDto,
  ) {
    return this.bookings.report(user.sub, id, dto);
  }

  @Post(":id/postpone")
  postponeInitiate(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() dto: PostponeDto,
  ) {
    return this.postpone.initiate(user.sub, id, dto);
  }

  @Post(":id/postpone/propose")
  postponePropose(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() dto: ProposeSlotDto,
  ) {
    return this.postpone.propose(user.sub, id, dto);
  }

  @Post(":id/postpone/confirm")
  postponeConfirm(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.postpone.confirm(user.sub, id);
  }

  @Post(":id/postpone/cancel")
  postponeCancel(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.postpone.cancel(user.sub, id);
  }
}
