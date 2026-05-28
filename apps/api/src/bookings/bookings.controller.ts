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
  type InviteParticipantsDto,
  inviteParticipantsSchema,
  type PostponeRequestDto,
  postponeRequestSchema,
  type ProposeSlotDto,
  proposeSlotSchema,
  type TutorRejectGroupDto,
  tutorRejectGroupSchema,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { parseAvailabilityWindow } from "../common/availability-window";
import { UserThrottlerGuard } from "../common/user-throttler.guard";
import { PrismaService } from "../prisma/prisma.service";
import { BookingsService } from "./bookings.service";
import { GroupSessionService } from "./group-session.service";
import { PostponeService } from "./postpone.service";

@Controller("bookings")
@UseGuards(SupabaseAuthGuard)
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly postpone: PostponeService,
    private readonly groupSessions: GroupSessionService,
    private readonly prisma: PrismaService,
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

  // ── FR-TH-18: tutor approval inbox ─────────────────────────────────────
  // Lists every group booking the calling user (must be the tutor) has in
  // tutor_review. Frontend renders this as an inbox card on the dashboard.
  // Placed BEFORE :id so /bookings/group-pending doesn't get swallowed by
  // the :id catch-all route.
  @Get("group-pending")
  groupPending(@CurrentUser() user: SupabaseJwtPayload) {
    return this.groupSessions.listPendingForTutor(user.sub);
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
  // Validation goes through @peerahat/types' createBookingSchema — the
  // same schema the web client uses. AllExceptionsFilter turns the
  // ZodError into 400 + VALIDATION_ERROR + details.issues.
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

  // Tutor marks the class as finished after its scheduled end so the
  // student review form unlocks immediately (instead of waiting for the
  // daily release-for-payout cron to flip status → completed). Escrow
  // timing is unchanged — the dispute window still owns payout release.
  @Post(":id/end-session")
  endSession(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.bookings.endSession(user.sub, id);
  }

  // FR-TH-06: student cancels their own 1-on-1 booking before payment.
  // Validation lives in BookingsService — the controller is a thin pass-
  // through. Group bookings are explicitly refused at the service layer
  // (they have their own failGroup path).
  @Post(":id/cancel")
  cancel(@CurrentUser() user: SupabaseJwtPayload, @Param("id") id: string) {
    return this.bookings.cancelByStudent(user.sub, id);
  }

  // FR-TH-06: tutor explicitly rejects a request instead of letting it
  // expire silently. Only valid in `requested` state — once accepted, the
  // tutor uses postpone (FR-TH-10).
  @Post(":id/reject")
  reject(@CurrentUser() user: SupabaseJwtPayload, @Param("id") id: string) {
    return this.bookings.rejectByTutor(user.sub, id);
  }

  // ── FR-TH-18: host-side group session routes ───────────────────────────
  // Throttling: invite + extend share the same 10/min bucket as create —
  // realistic host usage stays well below.
  @Post(":id/invite")
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  inviteToGroup(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    const dto: InviteParticipantsDto = inviteParticipantsSchema.parse(raw);
    return this.groupSessions.invite(user.sub, id, dto.emails);
  }

  @Post(":id/invite/extend")
  extendInvite(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.groupSessions.extendInvite(user.sub, id);
  }

  // Tutor approves the composed group. Creates per-invitee PaymentIntents;
  // groupStatus stays tutor_review until the last invitee pays.
  @Post(":id/group-approve")
  groupApprove(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.groupSessions.approveGroup(user.sub, id);
  }

  // Tutor rejects the group → failGroup(group_rejected_by_tutor) → 100%
  // refund to host (only paid participant in tutor_review state).
  @Post(":id/group-reject")
  groupReject(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    const dto: TutorRejectGroupDto = tutorRejectGroupSchema.parse(raw);
    return this.groupSessions.rejectGroup(user.sub, id, dto.reason);
  }

  // Auth-scoped at the service: any participant (host + accepted invitees)
  // or the tutor can read; non-host/non-tutor see participant emails
  // masked. The endpoint enforces the participant-or-tutor check before
  // returning anything.
  @Get(":id/participants")
  async listParticipants(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    const me = await this.prisma.user.findUnique({
      where: { supabaseId: user.sub },
      select: { id: true },
    });
    if (!me) {
      // requireAuth at the guard level should prevent this, but guard the
      // public surface anyway — return empty rather than 500.
      return [];
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        tutor: { select: { userId: true } },
        participants: { where: { studentId: me.id }, select: { id: true } },
      },
    });
    if (!booking) {
      // 404-shaped — but throwing here would leak existence. Empty array
      // is consistent with "not yours, nothing to see".
      return [];
    }
    const isParticipant = booking.participants.length > 0;
    const isTutor = booking.tutor.userId === me.id;
    if (!isParticipant && !isTutor) return [];
    return this.groupSessions.listParticipants(id, me.id);
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
