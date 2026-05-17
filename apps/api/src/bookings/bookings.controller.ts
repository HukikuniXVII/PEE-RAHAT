import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  type BookingReportDto,
  bookingReportSchema,
  createBookingSchema,
  type CreateBookingDto,
  type PostponeRequestDto,
  postponeRequestSchema,
  type ProposeSlotDto,
  proposeSlotSchema,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { parseAvailabilityWindow } from "../common/availability-window";
import { UserThrottlerGuard } from "../common/user-throttler.guard";
import { BookingsService } from "./bookings.service";
import { PostponeService } from "./postpone.service";

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
  // DTO would have let through to Prisma as a 500. AllExceptionsFilter
  // turns the ZodError into a 400 + VALIDATION_ERROR + details.issues.
  @Post()
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() user: SupabaseJwtPayload, @Body() raw: unknown) {
    const dto: CreateBookingDto = createBookingSchema.parse(raw);
    return this.bookings.create(user.sub, dto);
  }

  @Post(":id/accept")
  accept(@CurrentUser() user: SupabaseJwtPayload, @Param("id") id: string) {
    return this.bookings.accept(user.sub, id);
  }

  // FR-PM-05: student-reported booking inside the 24h report window.
  // Validation via @peerahat/types' bookingReportSchema (shared with the
  // web report dialog). AllExceptionsFilter normalizes ZodError → 400.
  @Post(":id/report")
  report(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    const dto: BookingReportDto = bookingReportSchema.parse(raw);
    return this.bookings.report(user.sub, id, dto);
  }

  // FR-TH-10..12: open a 2h postpone negotiation. postponeRequestSchema
  // enforces reason 5-500 chars at the boundary; the service keeps the
  // same range check as defense-in-depth for non-HTTP callers.
  @Post(":id/postpone")
  postponeInitiate(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    const dto: PostponeRequestDto = postponeRequestSchema.parse(raw);
    return this.postpone.initiate(user.sub, id, dto);
  }

  // FR-TH-10..12: propose a concrete new slot inside the negotiation.
  // proposeSlotSchema enforces ISO 8601 and duration ∈ {30,60,90,120}.
  @Post(":id/postpone/propose")
  postponePropose(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    const dto: ProposeSlotDto = proposeSlotSchema.parse(raw);
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
