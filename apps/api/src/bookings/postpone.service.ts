import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import type {
  PostponeInitiator,
  PostponeOutcome,
  PostponeRequest,
} from "@prisma/client";
import { addHours, differenceInMilliseconds } from "date-fns";

import { ChatService } from "../chat/chat.service";
import { ClassStartQueue } from "../integrations/google-meet/class-start.queue";
import { GoogleMeetService } from "../integrations/google-meet/google-meet.service";
import { RefundPolicyService } from "../payments/refund-policy.service";
import { PrismaService } from "../prisma/prisma.service";
import { BookingsService } from "./bookings.service";
import { PostponeQueue } from "./postpone.queue";

const CHAT_WINDOW_HOURS = 2;
const SHORT_NOTICE_HOURS = 12;
const MIN_NEW_SLOT_HOURS = 24;
const ALLOWED_DURATIONS = new Set([30, 60, 90, 120]);

interface InitiateInput {
  reason: string;
}

interface ProposeInput {
  scheduledAt: string;
  durationMinutes: number;
}

@Injectable()
export class PostponeService implements OnModuleInit {
  private readonly logger = new Logger(PostponeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly refundPolicy: RefundPolicyService,
    private readonly queue: PostponeQueue,
    private readonly bookings: BookingsService,
    private readonly googleMeet: GoogleMeetService,
    private readonly classStart: ClassStartQueue,
  ) {}

  onModuleInit() {
    this.queue.setResolver((requestId) => this.resolveTimeout(requestId));
  }

  // ── initiate ───────────────────────────────────────────────────────────
  async initiate(supabaseId: string, bookingId: string, input: InitiateInput) {
    if (!input.reason || input.reason.length < 5 || input.reason.length > 500) {
      throw new BadRequestException("Reason must be 5–500 characters");
    }

    const { user, booking } = await this.loadParticipant(supabaseId, bookingId);

    if (booking.status !== "paid") {
      throw new BadRequestException(
        "Booking must be in 'paid' status to request a postpone",
      );
    }
    if (booking.scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        "Cannot postpone a booking whose scheduled time has passed",
      );
    }
    if (booking.postponeRequestId) {
      throw new BadRequestException(
        "Booking already has an active postpone request",
      );
    }

    const isStudent = booking.studentId === user.id;
    const initiatorRole: PostponeInitiator = isStudent ? "student" : "tutor";
    const now = new Date();
    const wasShortNotice =
      differenceInMilliseconds(booking.scheduledAt, now) <
      SHORT_NOTICE_HOURS * 60 * 60 * 1000;
    const chatExpiresAt = addHours(now, CHAT_WINDOW_HOURS);

    const { request, threadId } = await this.prisma.$transaction(async (tx) => {
      const request = await tx.postponeRequest.create({
        data: {
          initiatorId: user.id,
          initiatorRole,
          reason: input.reason,
          chatExpiresAt,
          wasShortNotice,
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "postpone_pending",
          postponeRequestId: request.id,
        },
      });
      const thread = await this.chat.ensureThreadForBooking(booking.id);
      return { request, threadId: thread.id };
    });

    const initiatorLabel = initiatorRole === "student" ? "น้อง" : "พี่ติว";
    const noticeChip = wasShortNotice
      ? " (ขอเลื่อนกระชั้นชิด <12 ชม.)"
      : "";
    await this.chat.postSystemMessage(
      threadId,
      `${initiatorLabel}ขอเลื่อนคลาส${noticeChip}: ${input.reason}`,
      user.id,
    );

    await this.queue.enqueueTimeout(request.id, chatExpiresAt);

    return {
      threadId,
      chatExpiresAt: chatExpiresAt.toISOString(),
      requestId: request.id,
    };
  }

  // ── propose ────────────────────────────────────────────────────────────
  async propose(supabaseId: string, bookingId: string, input: ProposeInput) {
    if (!ALLOWED_DURATIONS.has(input.durationMinutes)) {
      throw new BadRequestException("durationMinutes must be 60, 90, or 120");
    }
    const proposedAt = new Date(input.scheduledAt);
    if (Number.isNaN(proposedAt.getTime())) {
      throw new BadRequestException("scheduledAt is not a valid datetime");
    }
    const minRunAt = addHours(new Date(), MIN_NEW_SLOT_HOURS);
    if (proposedAt.getTime() < minRunAt.getTime()) {
      throw new BadRequestException(
        `Proposed slot must be at least ${MIN_NEW_SLOT_HOURS}h in the future`,
      );
    }

    const { user, booking, request } = await this.loadActiveRequest(
      supabaseId,
      bookingId,
    );
    if (request.initiatorId !== user.id) {
      throw new ForbiddenException("Only the initiator can propose a new slot");
    }

    // FR-TH-15: proposed slot can't double-book either side, but the booking
    // we're postponing is allowed to "free" itself — excludeBookingId.
    const tutorUserId = booking.tutor.userId;
    await this.bookings.assertNoOverlap(
      booking.studentId,
      proposedAt.toISOString(),
      input.durationMinutes,
      booking.id,
    );
    await this.bookings.assertNoOverlap(
      tutorUserId,
      proposedAt.toISOString(),
      input.durationMinutes,
      booking.id,
    );

    await this.prisma.postponeRequest.update({
      where: { id: request.id },
      data: {
        proposedAt,
        proposedDuration: input.durationMinutes,
      },
    });

    const thread = await this.chat.ensureThreadForBooking(booking.id);
    const role = request.initiatorRole === "student" ? "น้อง" : "พี่ติว";
    await this.chat.postSystemMessage(
      thread.id,
      `${role}เสนอเวลาใหม่: ${proposedAt.toLocaleString("th-TH")} (${input.durationMinutes} นาที)`,
      user.id,
    );

    return { ok: true };
  }

  // ── confirm ────────────────────────────────────────────────────────────
  async confirm(supabaseId: string, bookingId: string) {
    const { user, booking, request } = await this.loadActiveRequest(
      supabaseId,
      bookingId,
    );
    if (!request.proposedAt || !request.proposedDuration) {
      throw new BadRequestException(
        "No new slot has been proposed yet — initiator must propose first",
      );
    }
    if (request.initiatorId === user.id) {
      throw new ForbiddenException(
        "Initiator cannot confirm their own proposal — counterparty must accept",
      );
    }

    // FR-TH-15: re-check overlap at confirm time — the slot could have been
    // taken by another booking in the 2h negotiation window. The booking
    // being postponed is allowed to free itself via excludeBookingId.
    await this.bookings.assertNoOverlap(
      booking.studentId,
      request.proposedAt.toISOString(),
      request.proposedDuration,
      booking.id,
    );
    await this.bookings.assertNoOverlap(
      booking.tutor.userId,
      request.proposedAt.toISOString(),
      request.proposedDuration,
      booking.id,
    );

    // FR-TH-17: stash the old event id before the transaction so we can
    // tell Calendar to delete it after the clone succeeds. Avoiding the
    // delete-inside-transaction pattern means a 4xx from Google can't
    // roll back the DB writes.
    const oldCalendarEventId = booking.googleCalendarEventId;

    const newBooking = await this.prisma.$transaction(async (tx) => {
      // 1. mark request agreed
      await tx.postponeRequest.update({
        where: { id: request.id },
        data: {
          status: "agreed",
          resolvedAs: "agreed",
          resolvedAt: new Date(),
        },
      });

      // 2. clone booking with proposed slot, paid status
      const created = await tx.booking.create({
        data: {
          studentId: booking.studentId,
          tutorId: booking.tutorId,
          subject: booking.subject,
          status: "paid",
          scheduledAt: request.proposedAt!,
          durationMinutes: request.proposedDuration!,
          amountThb: booking.amountThb,
          // acceptDeadlineAt is a NOT NULL leftover from the requested→accepted
          // flow; no longer meaningful for a paid clone — set to the new slot.
          acceptDeadlineAt: request.proposedAt!,
        },
      });

      // 3. move PaymentIntent to the new booking (escrow stays held)
      if (!booking.paymentIntent) {
        throw new BadRequestException("Original booking has no PaymentIntent");
      }
      await tx.paymentIntent.update({
        where: { id: booking.paymentIntent.id },
        data: { bookingId: created.id },
      });

      // 4. mark original as postponed (soft-delete for audit, NFR-05) and
      //    scrub its meet fields so /bookings/mine doesn't show a stale
      //    join button against a moved-away slot.
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "postponed",
          meetLink: null,
          meetGeneratedAt: null,
          googleCalendarEventId: null,
        },
      });

      return created;
    });

    const thread = await this.chat.ensureThreadForBooking(booking.id);
    await this.chat.postSystemMessage(
      thread.id,
      `ตกลงเลื่อนคลาสไปยัง ${request.proposedAt!.toLocaleString("th-TH")} (${request.proposedDuration} นาที) — สร้างการจองใหม่แล้ว`,
      user.id,
    );
    await this.chat.closeThread(thread.id);
    await this.queue.cancelTimeout(request.id);

    // FR-TH-17: cancel the old class-start job (a no-op if the link was
    // already minted), drop the prior calendar event (non-fatal on 404),
    // and enqueue a fresh job for the cloned booking's new slot.
    await this.classStart.cancelForBooking(booking.id);
    if (oldCalendarEventId) {
      await this.googleMeet.deleteEvent(oldCalendarEventId);
    }
    await this.classStart.enqueueForBooking(newBooking.id, newBooking.scheduledAt);

    return { newBookingId: newBooking.id };
  }

  // ── cancel (either side) ───────────────────────────────────────────────
  async cancel(supabaseId: string, bookingId: string) {
    const { user, booking, request } = await this.loadActiveRequest(
      supabaseId,
      bookingId,
    );
    const outcome: PostponeOutcome =
      request.initiatorRole === "tutor"
        ? "tutor_initiated_no_agreement"
        : "no_agreement";

    await this.applyResolution(booking, request, outcome, user.id);
    return { ok: true };
  }

  // ── resolveTimeout (called by BullMQ worker) ───────────────────────────
  async resolveTimeout(requestId: string): Promise<void> {
    const request = await this.prisma.postponeRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.status !== "negotiating") {
      // already resolved (agreed or cancelled) — nothing to do.
      return;
    }
    const booking = await this.prisma.booking.findFirst({
      where: { postponeRequestId: requestId },
      include: { paymentIntent: true, tutor: true },
    });
    if (!booking) {
      this.logger.warn(
        `Postpone request ${requestId} has no linked booking — skipping`,
      );
      return;
    }

    const counterpartyUserId =
      request.initiatorRole === "student"
        ? booking.tutor.userId
        : booking.studentId;
    const thread = await this.prisma.chatThread.findFirst({
      where: {
        studentId: booking.studentId,
        tutorId: booking.tutorId,
      },
      select: { id: true },
    });
    const counterpartyEngaged = thread
      ? await this.chat.counterpartyHasMessagedSince(
          thread.id,
          counterpartyUserId,
          request.createdAt,
        )
      : false;

    let outcome: PostponeOutcome;
    if (counterpartyEngaged) {
      outcome = "no_agreement";
    } else if (request.initiatorRole === "student") {
      outcome = "unresponsive";
    } else {
      outcome = "tutor_initiated_no_agreement";
    }

    // Use the initiator as the system-message actor since the worker has no
    // human caller.
    await this.applyResolution(booking, request, outcome, request.initiatorId);
  }

  // ── applyResolution (shared cancel + timeout path) ─────────────────────
  private async applyResolution(
    booking: Awaited<ReturnType<PostponeService["loadActiveRequest"]>>["booking"],
    request: PostponeRequest,
    outcome: Exclude<PostponeOutcome, "agreed">,
    actorUserId: string,
  ): Promise<void> {
    if (!booking.paymentIntent) {
      throw new BadRequestException("Booking has no PaymentIntent — cannot resolve");
    }

    const originalAmount = booking.paymentIntent.amountThb;
    const split = this.refundPolicy.computeSplit({
      initiator: request.initiatorRole,
      wasShortNotice: request.wasShortNotice,
      outcome,
      amountThb: originalAmount,
    });

    const cancelledStatus = (() => {
      switch (outcome) {
        case "no_agreement":
          return "cancelled_no_agreement" as const;
        case "unresponsive":
          return "cancelled_tutor_unresponsive" as const;
        case "tutor_initiated_no_agreement":
          return "cancelled_tutor_initiated" as const;
      }
    })();
    const reasonCode = (() => {
      switch (outcome) {
        case "no_agreement":
          return "postpone_short_notice_no_agreement" as const;
        case "unresponsive":
          return "postpone_unresponsive" as const;
        case "tutor_initiated_no_agreement":
          return "postpone_tutor_initiated_no_agreement" as const;
      }
    })();
    const incrementDefect =
      outcome === "unresponsive" ||
      outcome === "tutor_initiated_no_agreement";

    await this.prisma.$transaction(async (tx) => {
      // Reduce intent in place; tutor portion (>0) is flagged as 'released'
      // so payouts.computeForPeriod picks it up in the next 15th/30th batch.
      // Zero-tutor cases mark the intent fully refunded.
      const intentUpdate =
        split.tutorThb > 0
          ? {
              amountThb: split.tutorThb,
              status: "released_for_payout" as const,
              releasedAt: new Date(),
            }
          : {
              amountThb: 0,
              status: "refunded" as const,
            };
      await tx.paymentIntent.update({
        where: { id: booking.paymentIntent!.id },
        data: intentUpdate,
      });

      await tx.refundLedger.create({
        data: {
          paymentIntentId: booking.paymentIntent!.id,
          bookingId: booking.id,
          originalAmountThb: originalAmount,
          studentRefundThb: split.studentRefundThb,
          tutorThb: split.tutorThb,
          platformThb: split.platformThb,
          reasonCode,
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: cancelledStatus },
      });

      await tx.postponeRequest.update({
        where: { id: request.id },
        data: {
          status: "expired",
          resolvedAs: outcome,
          resolvedAt: new Date(),
        },
      });

      if (incrementDefect) {
        await tx.tutorProfile.update({
          where: { id: booking.tutorId },
          data: { defectCount: { increment: 1 } },
        });
      }
    });

    const thread = await this.chat.ensureThreadForBooking(booking.id);
    const summary = this.formatResolutionMessage(outcome, split, originalAmount);
    await this.chat.postSystemMessage(thread.id, summary, actorUserId);
    await this.chat.closeThread(thread.id);
    await this.queue.cancelTimeout(request.id);
  }

  private formatResolutionMessage(
    outcome: Exclude<PostponeOutcome, "agreed">,
    split: { tutorThb: number; platformThb: number; studentRefundThb: number },
    originalAmount: number,
  ): string {
    switch (outcome) {
      case "unresponsive":
        return `ปิดดีล — พี่ติวไม่ตอบกลับใน 2 ชม. คืนเงินน้อง 100% (฿${originalAmount.toLocaleString()})`;
      case "tutor_initiated_no_agreement":
        return `ปิดดีล — น้องไม่ตกลงเวลาใหม่ที่พี่ติวเสนอ คืนเงินน้อง 100% (฿${originalAmount.toLocaleString()})`;
      case "no_agreement":
        return `ปิดดีล — ไม่ตกลงเวลาใหม่ คืนเงินน้อง ฿${split.studentRefundThb.toLocaleString()} • ค่าตอบแทนพี่ติว ฿${split.tutorThb.toLocaleString()} • ค่าธรรมเนียม ฿${split.platformThb.toLocaleString()}`;
    }
  }

  // ── helpers ────────────────────────────────────────────────────────────
  private async loadParticipant(supabaseId: string, bookingId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: true, paymentIntent: true },
    });
    if (!booking) throw new NotFoundException();
    const isParticipant =
      booking.studentId === user.id || booking.tutor.userId === user.id;
    if (!isParticipant) throw new ForbiddenException();
    return { user, booking };
  }

  private async loadActiveRequest(supabaseId: string, bookingId: string) {
    const { user, booking } = await this.loadParticipant(supabaseId, bookingId);
    if (!booking.postponeRequestId) {
      throw new BadRequestException("No active postpone request for this booking");
    }
    const request = await this.prisma.postponeRequest.findUniqueOrThrow({
      where: { id: booking.postponeRequestId },
    });
    if (request.status !== "negotiating") {
      throw new BadRequestException(
        `Postpone request is ${request.status}, not negotiating`,
      );
    }
    return { user, booking, request };
  }
}
