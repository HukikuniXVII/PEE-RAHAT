import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { InviteSummaryDto } from "@peerahat/types";
import type { RefundReason } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { addHours, subHours } from "date-fns";

import { ChatService } from "../chat/chat.service";
import { requireUserBySupabaseId } from "../common/user-lookup";
import { GoogleCalendarService } from "../integrations/google-calendar/google-calendar.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { BookingsService } from "./bookings.service";

/**
 * FR-TH-18 rev2 — controller for the group-session lifecycle:
 *
 *   forming      → host invited people; invitees accepting/declining; host
 *                  can pay anytime (no payment required to invite)
 *   tutor_review → every seat accepted; tutor decides go / no-go. Tutor
 *                  approval is blocked until the host has paid.
 *   confirmed    → tutor approved AND host paid; Meet generated
 *   failed       → any failure mode; 100% refund to the host if they paid
 *
 * Payment model: the HOST pays the full class total (booking.amountThb,
 * which is hourlyRate × hours × capacity for groups). Invitees only RSVP
 * — they never see a payment dialog. Tutor receives the full class total
 * (minus commission) on a single payout, same as 1-on-1.
 */
@Injectable()
export class GroupSessionService {
  private readonly logger = new Logger(GroupSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly notifications: NotificationService,
    private readonly chat: ChatService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  // ── Host: invite a batch of emails ────────────────────────────────────
  /**
   * Host invokes /bookings/:id/invite with a list of emails. Already-invited
   * or already-accepted emails are silently skipped (idempotent). Self-invite
   * + over-capacity get hard rejected so the host sees the constraint.
   */
  async invite(supabaseId: string, bookingId: string, emailsRaw: string[]) {
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { participants: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.sessionType !== "group") {
      throw new BadRequestException("Booking is not a group session");
    }
    if (booking.studentId !== user.id) {
      throw new ForbiddenException("Only the host can invite");
    }
    if (booking.groupStatus !== "forming") {
      throw new BadRequestException(
        "Invitations only accepted while the group is forming",
      );
    }

    const existingEmails = new Set<string>();
    for (const p of booking.participants) {
      const u = await this.prisma.user.findUnique({
        where: { id: p.studentId },
        select: { email: true },
      });
      if (u) existingEmails.add(u.email.toLowerCase());
    }

    const dedupedEmails = normalizeInviteEmails(emailsRaw, {
      hostEmail: user.email,
      alreadyParticipating: existingEmails,
    });

    // Capacity guard: existing seats + new invites mustn't exceed capacity.
    // host counts as one seat.
    const seatsTaken = booking.participants.length;
    if (seatsTaken + dedupedEmails.length > booking.capacity) {
      throw new BadRequestException(
        `เกินจำนวนที่นั่ง (${booking.capacity}) — ตอนนี้มี ${seatsTaken} คน เชิญเพิ่มได้อีก ${booking.capacity - seatsTaken}`,
      );
    }

    // Resolve emails → User rows. Emails that don't match a registered user
    // are rejected for now — the spec says invitees view /invite/{code} with
    // a "log in to accept" prompt, so unregistered emails can't accept
    // anyway. Future: pre-create a placeholder user or accept emails before
    // signup. For step 4 we keep it strict so the invariant
    // "BookingParticipant.studentId is always a real User.id" holds.
    const users = await this.prisma.user.findMany({
      where: { email: { in: dedupedEmails } },
      select: { id: true, email: true, suspendedUntil: true },
    });
    const foundEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const unknown = dedupedEmails.filter((e) => !foundEmails.has(e));
    if (unknown.length > 0) {
      throw new BadRequestException({
        code: "INVITE_UNKNOWN_EMAILS",
        message: "อีเมลต่อไปนี้ยังไม่มีบัญชี Pee Rahat",
        unknownEmails: unknown,
      });
    }

    const now = new Date();
    const suspended = users.filter(
      (u) => u.suspendedUntil && u.suspendedUntil.getTime() > Date.now(),
    );
    if (suspended.length > 0) {
      throw new BadRequestException({
        code: "INVITE_SUSPENDED_USERS",
        message: "ไม่สามารถเชิญผู้ใช้ที่ถูกพักการใช้งานได้",
        suspendedEmails: suspended.map((u) => u.email),
      });
    }

    await this.prisma.bookingParticipant.createMany({
      data: users.map((u) => ({
        bookingId: booking.id,
        studentId: u.id,
        role: "invited" as const,
        status: "invited" as const,
        invitedAt: now,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      JSON.stringify({
        event: "group_invitees_added",
        bookingId: booking.id,
        added: users.length,
        capacity: booking.capacity,
      }),
    );

    return this.listParticipants(booking.id);
  }

  // ── Invitee: accept ───────────────────────────────────────────────────
  /**
   * Authed invitee clicks accept on /invite/{code}. Personal overlap check
   * fires here (tutor's slot was already locked at booking-create time).
   * If every seat now reads 'accepted', this also advances groupStatus to
   * 'tutor_review' inside the same Serializable transaction.
   */
  async acceptInvite(supabaseId: string, code: string) {
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
    const booking = await this.requireBookingByInviteCode(code);
    if (booking.groupStatus !== "forming") {
      throw new BadRequestException(
        "การเชิญนี้ปิดรับแล้ว (กลุ่มได้ผ่านขั้นตอน Forming ไปแล้ว)",
      );
    }
    if (booking.inviteExpiresAt && booking.inviteExpiresAt < new Date()) {
      throw new BadRequestException("การเชิญนี้หมดอายุแล้ว");
    }
    const participant = booking.participants.find(
      (p) => p.studentId === user.id,
    );
    if (!participant) {
      throw new ForbiddenException("คุณไม่ได้รับการเชิญสำหรับคลาสนี้");
    }
    if (participant.status === "accepted" || participant.status === "paid") {
      // Idempotent — accepting twice is a no-op, not an error
      return this.toParticipantRow(participant, user);
    }
    if (participant.status === "declined" || participant.status === "expired") {
      throw new ConflictException(
        "คุณได้ปฏิเสธหรือเลิกใช้งานการเชิญนี้ไปแล้ว",
      );
    }

    // FR-TH-15: invitee's personal overlap check. Reuses BookingsService so
    // the predicate matches the host-side check exactly (including unavail
    // rules, postpone proposals, etc.).
    await this.bookings.assertNoOverlap(
      user.id,
      booking.scheduledAt,
      booking.durationMinutes,
    );

    const { updated, movedToTutorReview } = await this.prisma.$transaction(
      async (tx) => {
        const next = await tx.bookingParticipant.update({
          where: { id: participant.id },
          data: { status: "accepted", acceptedAt: new Date() },
        });
        const all = await tx.bookingParticipant.findMany({
          where: { bookingId: booking.id },
        });
        const moved = shouldMoveToTutorReview(all, booking.capacity);
        if (moved) await this.moveToTutorReview(tx, booking.id);
        return { updated: next, movedToTutorReview: moved };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(
      JSON.stringify({
        event: "group_invite_accepted",
        bookingId: booking.id,
        participantId: updated.id,
        userId: user.id,
        movedToTutorReview,
      }),
    );

    // Notifications are best-effort (notify swallows errors) — fired post-tx
    // so a delivery failure can never roll back the accept.
    await this.notifications.notify({
      userId: booking.studentId, // host
      type: "group_invite_responded",
      title: "เพื่อนตอบรับคำเชิญแล้ว",
      body: `${user.displayName} เข้าร่วมคลาสกลุ่มของคุณ`,
      actionUrl: `/bookings/${booking.id}/group`,
      sourceType: "booking",
      sourceId: booking.id,
    });

    if (movedToTutorReview) {
      const tutor = await this.prisma.tutorProfile.findUnique({
        where: { id: booking.tutorId },
        select: { userId: true },
      });
      if (tutor) {
        await this.notifications.notify({
          userId: tutor.userId,
          type: "group_ready_for_review",
          title: "กลุ่มพร้อมรอตรวจสอบ",
          body: "กลุ่มของผู้ใช้รายหนึ่งครบจำนวนแล้ว — โปรดพิจารณาอนุมัติ",
          actionUrl: `/bookings/${booking.id}`,
          sourceType: "booking",
          sourceId: booking.id,
        });
      }
    }

    return this.toParticipantRow(updated, user);
  }

  // ── Invitee: decline ──────────────────────────────────────────────────
  async declineInvite(supabaseId: string, code: string, reason?: string) {
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
    const booking = await this.requireBookingByInviteCode(code);
    if (booking.groupStatus !== "forming") {
      throw new BadRequestException(
        "การเชิญนี้ปิดรับแล้ว",
      );
    }
    const participant = booking.participants.find(
      (p) => p.studentId === user.id,
    );
    if (!participant) {
      throw new ForbiddenException("คุณไม่ได้รับการเชิญสำหรับคลาสนี้");
    }
    if (participant.role === "host") {
      throw new BadRequestException("Host cannot decline their own group");
    }
    if (participant.status === "declined") {
      return this.toParticipantRow(participant, user);
    }
    if (participant.status === "paid") {
      throw new ConflictException(
        "คุณชำระเงินไปแล้ว — กรุณาติดต่อแอดมินเพื่อขอคืนเงิน",
      );
    }

    const updated = await this.prisma.bookingParticipant.update({
      where: { id: participant.id },
      data: { status: "declined" },
    });

    this.logger.log(
      JSON.stringify({
        event: "group_invite_declined",
        bookingId: booking.id,
        participantId: updated.id,
        userId: user.id,
        reason: reason ?? null,
      }),
    );

    await this.notifications.notify({
      userId: booking.studentId, // host
      type: "group_invite_responded",
      title: "เพื่อนปฏิเสธคำเชิญ",
      body: reason
        ? `${user.displayName} ปฏิเสธคำเชิญ: ${reason}`
        : `${user.displayName} ปฏิเสธคำเชิญเข้าร่วมคลาสกลุ่มของคุณ`,
      actionUrl: `/bookings/${booking.id}/group`,
      sourceType: "booking",
      sourceId: booking.id,
    });

    return this.toParticipantRow(updated, user);
  }

  // ── Internal: forming → tutor_review ──────────────────────────────────
  /** Caller must be inside a transaction. Idempotent. */
  private async moveToTutorReview(
    tx: Prisma.TransactionClient,
    bookingId: string,
  ) {
    await tx.booking.update({
      where: { id: bookingId },
      data: { groupStatus: "tutor_review" },
    });
    this.logger.log(
      JSON.stringify({ event: "group_tutor_review", bookingId }),
    );
  }

  // ── Tutor: approve ────────────────────────────────────────────────────
  /**
   * FR-TH-18 rev2: tutor approves the group composition. The host is the
   * sole payer (invitees just RSVP) so approval is gated on host having
   * paid — without that, there's nothing to escrow. Once both conditions
   * hold (host paid + tutor approved), the group flips straight to
   * confirmed in this transaction; no more "waiting for invitees to pay"
   * intermediate state.
   */
  async approveGroup(supabaseId: string, bookingId: string) {
    const tutorUser = await this.prisma.user.findUnique({
      where: { supabaseId },
    });
    if (!tutorUser) throw new BadRequestException();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: { select: { userId: true } },
        participants: true,
      },
    });
    if (!booking) throw new NotFoundException();
    if (booking.sessionType !== "group") {
      throw new BadRequestException("Not a group booking");
    }
    if (booking.tutor.userId !== tutorUser.id) {
      throw new ForbiddenException("Only the tutor can approve this group");
    }
    if (booking.groupStatus !== "tutor_review") {
      throw new BadRequestException(
        "Group is not awaiting tutor review",
      );
    }

    const hostParticipant = booking.participants.find((p) => p.role === "host");
    if (!hostParticipant || hostParticipant.status !== "paid") {
      throw new BadRequestException(
        "ผู้จัดกลุ่มยังไม่ได้ชำระเงิน — กรุณารอให้ชำระเสร็จก่อนกดอนุมัติ",
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        await this.confirmGroup(tx, bookingId);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(
      JSON.stringify({
        event: "group_tutor_approved",
        bookingId,
      }),
    );

    return this.listParticipants(booking.id);
  }

  // ── Tutor: reject ─────────────────────────────────────────────────────
  async rejectGroup(supabaseId: string, bookingId: string, reason: string) {
    const tutorUser = await this.prisma.user.findUnique({
      where: { supabaseId },
    });
    if (!tutorUser) throw new BadRequestException();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: { select: { userId: true } } },
    });
    if (!booking) throw new NotFoundException();
    if (booking.tutor.userId !== tutorUser.id) {
      throw new ForbiddenException("Only the tutor can reject this group");
    }
    if (booking.groupStatus !== "tutor_review") {
      throw new BadRequestException("Group is not awaiting tutor review");
    }

    this.logger.log(
      JSON.stringify({
        event: "group_tutor_rejected",
        bookingId,
        reason,
      }),
    );

    // failGroup writes refund rows + marks the booking cancelled. Notify
    // the host with the tutor's reason after the refund has been recorded
    // so the link doesn't dead-end if the host taps it immediately.
    await this.failGroup(bookingId, "group_rejected_by_tutor");
    await this.notifications.notify({
      userId: booking.studentId,
      type: "group_decision",
      title: "ติวเตอร์ไม่อนุมัติคลาสกลุ่ม",
      body: `เหตุผล: ${reason} — คุณจะได้รับเงินคืนเต็มจำนวนภายใน 1-3 วันทำการ`,
      actionUrl: `/bookings/${bookingId}`,
      sourceType: "booking",
      sourceId: bookingId,
    });
  }

  // ── Slip-verify worker callback ───────────────────────────────────────
  /**
   * FR-TH-18 rev2: called when a host's group PaymentIntent flips to
   * held_in_escrow (auto via ZercleSlip or manual via admin.approveSlip).
   * Marks the host's BookingParticipant as paid + links the intent.
   * Does NOT advance groupStatus — that's the tutor's job via
   * approveGroup. Idempotent; safe to call multiple times for the same
   * intent.
   */
  async onParticipantPaid(paymentIntentId: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
    });
    if (!intent || !intent.bookingId) return;

    const booking = await this.prisma.booking.findUnique({
      where: { id: intent.bookingId },
      include: { participants: { where: { role: "host" } } },
    });
    if (!booking || booking.sessionType !== "group") return;

    const hostParticipant = booking.participants.find(
      (p) => p.role === "host" && p.studentId === intent.payerId,
    );
    if (!hostParticipant) return;
    if (hostParticipant.status === "paid") return; // idempotent

    await this.prisma.bookingParticipant.update({
      where: { id: hostParticipant.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        paymentIntentId: intent.id,
      },
    });

    this.logger.log(
      JSON.stringify({
        event: "group_host_paid",
        bookingId: booking.id,
        participantId: hostParticipant.id,
      }),
    );
  }

  // ── Internal: tutor_review → confirmed ────────────────────────────────
  /**
   * The tx flips groupStatus + booking.status synchronously. Chat thread
   * creation + Meet generation run AFTER the tx commits via
   * triggerGroupConfirmedSideEffects — both are best-effort and must not
   * roll back the confirmation: a Google Calendar outage or Prisma error
   * on the thread create would otherwise leave the group stuck in
   * tutor_review with every seat paid, which is worse than a missing Meet
   * link (admin can regenerate the Meet via the existing /admin route).
   */
  private async confirmGroup(tx: Prisma.TransactionClient, bookingId: string) {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        groupStatus: "confirmed",
        status: "paid",
        reportWindowEndsAt: addHours(new Date(), 24),
      },
    });
    this.logger.log(
      JSON.stringify({ event: "group_confirmed", bookingId }),
    );
    // Side effects fire post-tx — see method note above.
    // schedule via Promise so the caller's tx commit isn't blocked.
    void this.triggerGroupConfirmedSideEffects(bookingId);
  }

  /**
   * Idempotent. Runs after confirmGroup's tx commits:
   *   1. Create the group ChatThread (host + paid invitees + tutor).
   *   2. Mint the Meet link with every participant + tutor as attendees,
   *      and post the auto link-message into the new thread.
   * Both calls are safe to retry; admin can also force-regenerate the Meet
   * via /admin/bookings/:id/regenerate-meet if Google was down.
   */
  private async triggerGroupConfirmedSideEffects(bookingId: string) {
    try {
      await this.chat.createGroupThread(bookingId);
    } catch (err) {
      this.logger.error(
        `group_thread_create_failed bookingId=${bookingId} err=${String(err)}`,
      );
    }
    try {
      await this.googleCalendar.attachToBooking(bookingId);
    } catch (err) {
      this.logger.error(
        `group_meet_generate_failed bookingId=${bookingId} err=${String(err)}`,
      );
    }
    // Best-effort fan-out notification to host + invitees.
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        participants: { where: { status: "paid" }, select: { studentId: true } },
      },
    });
    if (!booking) return;
    for (const p of booking.participants) {
      await this.notifications.notify({
        userId: p.studentId,
        type: "group_status_changed",
        title: "คลาสกลุ่มของคุณได้รับการยืนยันแล้ว",
        body: "ทุกคนชำระเงินครบ — กดดูลิงก์ห้องเรียนในแชทกลุ่ม",
        actionUrl: `/bookings/${bookingId}`,
        sourceType: "booking",
        sourceId: bookingId,
      });
    }
  }

  // ── Public: any → failed ──────────────────────────────────────────────
  /**
   * FR-TH-18 rev2: writes a 100% RefundLedger row for the HOST if they
   * paid (host is the only payer in the new model), cancels any pending
   * host intent, and flips groupStatus=failed + booking.status=cancelled.
   * No tutor defectCount increment — group failures are operational, not
   * tutor misconduct.
   */
  async failGroup(bookingId: string, reason: RefundReason) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { paymentIntent: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.groupStatus === "failed") return; // idempotent

    const hostIntent = booking.paymentIntent;
    const wasPaid = hostIntent?.status === "held_in_escrow";

    await this.prisma.$transaction(async (tx) => {
      if (hostIntent) {
        if (wasPaid) {
          await tx.refundLedger.create({
            data: {
              paymentIntentId: hostIntent.id,
              bookingId: booking.id,
              originalAmountThb:
                hostIntent.originalAmountThb ?? hostIntent.amountThb,
              studentRefundThb: hostIntent.amountThb,
              tutorThb: 0,
              platformThb: 0,
              reasonCode: reason,
            },
          });
          await tx.paymentIntent.update({
            where: { id: hostIntent.id },
            data: { status: "refunded", amountThb: 0 },
          });
        } else if (
          ["pending_transfer", "slip_uploaded", "verifying"].includes(
            hostIntent.status,
          )
        ) {
          await tx.paymentIntent.update({
            where: { id: hostIntent.id },
            data: { status: "failed" },
          });
        }
      }
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          groupStatus: "failed",
          status: "cancelled",
        },
      });
    });

    this.logger.log(
      JSON.stringify({
        event: "group_failed",
        bookingId,
        reason,
        refundedHost: wasPaid,
      }),
    );
  }

  // ── Public landing: GET /invites/:code ────────────────────────────────
  /**
   * Thin payload for the public /invites/:code page. Intentionally PDPA-safe:
   * NO participant emails, NO participant list — only the host's display
   * name + the class details an invitee needs to decide.
   */
  async getInviteSummary(code: string): Promise<InviteSummaryDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { inviteCode: code },
      include: {
        student: { select: { displayName: true, avatarUrl: true } },
        tutor: {
          select: {
            id: true,
            university: true,
            faculty: true,
            user: { select: { displayName: true, avatarUrl: true } },
          },
        },
        participants: { select: { status: true } },
      },
    });
    if (!booking || !booking.inviteCode || !booking.inviteExpiresAt) {
      throw new NotFoundException("Invite not found");
    }
    if (booking.sessionType !== "group" || !booking.groupStatus) {
      throw new NotFoundException("Invite not found");
    }
    return {
      inviteCode: booking.inviteCode,
      bookingId: booking.id,
      groupStatus: booking.groupStatus,
      scheduledAt: booking.scheduledAt.toISOString(),
      durationMinutes: booking.durationMinutes,
      amountThb: booking.amountThb,
      subject: booking.subject as InviteSummaryDto["subject"],
      capacity: booking.capacity,
      acceptedCount: booking.participants.filter(
        (p) => p.status === "accepted" || p.status === "paid",
      ).length,
      inviteExpiresAt: booking.inviteExpiresAt.toISOString(),
      host: {
        displayName: booking.student?.displayName ?? "",
        avatarUrl: booking.student?.avatarUrl ?? undefined,
      },
      tutor: {
        tutorId: booking.tutor.id,
        displayName: booking.tutor.user.displayName,
        avatarUrl: booking.tutor.user.avatarUrl ?? undefined,
        university: booking.tutor.university,
        faculty: booking.tutor.faculty,
      },
    };
  }

  // ── Host: extend invite expiry ────────────────────────────────────────
  /**
   * Bumps inviteExpiresAt by +24h, capped at scheduledAt (an invite that
   * extends past the class start time would be useless). Host-only;
   * forming-state only.
   */
  async extendInvite(supabaseId: string, bookingId: string) {
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException();
    if (booking.studentId !== user.id) {
      throw new ForbiddenException("Only the host can extend the invite");
    }
    if (booking.sessionType !== "group") {
      throw new BadRequestException("Not a group booking");
    }
    if (booking.groupStatus !== "forming") {
      throw new BadRequestException(
        "Can only extend while the group is forming",
      );
    }
    if (!booking.inviteExpiresAt) {
      throw new BadRequestException("Invite has no expiry to extend");
    }

    // Cap at scheduledAt - 1h: an invite that runs to within an hour of the
    // class would land paid invitees on a Meet they barely planned for.
    const ceiling = subHours(booking.scheduledAt, 1);
    const proposed = addHours(booking.inviteExpiresAt, 24);
    const next = proposed > ceiling ? ceiling : proposed;
    if (next <= booking.inviteExpiresAt) {
      throw new BadRequestException(
        "การเชิญใกล้ถึงเวลาคลาสแล้ว ไม่สามารถขยายเวลาได้",
      );
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { inviteExpiresAt: next },
    });
    return { inviteExpiresAt: next.toISOString() };
  }

  // ── Cron sweepers (registered by JobsService) ─────────────────────────
  /**
   * FR-TH-18 cron — fail every `forming` group whose inviteExpiresAt is in
   * the past. Refund any host who already paid (only the host can be
   * 'paid' at forming-stage; invitees haven't had a PaymentIntent yet).
   * Idempotent — calling failGroup on a `failed` booking is a no-op.
   */
  async runInviteExpirySweep(now: Date = new Date()) {
    const candidates = await this.prisma.booking.findMany({
      where: {
        sessionType: "group",
        groupStatus: "forming",
        inviteExpiresAt: { lt: now },
      },
      select: { id: true },
    });
    for (const b of candidates) {
      try {
        await this.failGroup(b.id, "group_invite_expired");
      } catch (err) {
        this.logger.error(
          `invite_expiry_sweep_failed bookingId=${b.id} err=${String(err)}`,
        );
      }
    }
    return { failed: candidates.length };
  }

  /**
   * FR-TH-18 rev2 cron — fail every `tutor_review` group that the tutor
   * hasn't acted on within 24h of the last invitee accept. Triggers a
   * full refund to the host (if they paid). "Last invitee accept" is the
   * proxy for "group landed in tutor_review", since the latest invitee
   * acceptance is what flipped the state.
   */
  async runPaymentDeadlineSweep(now: Date = new Date()) {
    const cutoff = subHours(now, 24);
    const candidates = await this.prisma.booking.findMany({
      where: {
        sessionType: "group",
        groupStatus: "tutor_review",
        participants: {
          every: {
            OR: [
              { role: "host" },
              { acceptedAt: { lt: cutoff, not: null } },
              { status: "declined" },
              { status: "expired" },
            ],
          },
        },
      },
      select: { id: true },
    });
    let failed = 0;
    for (const b of candidates) {
      try {
        await this.failGroup(b.id, "group_payment_incomplete");
        failed++;
      } catch (err) {
        this.logger.error(
          `payment_deadline_sweep_failed bookingId=${b.id} err=${String(err)}`,
        );
      }
    }
    return { failed };
  }

  // ── Tutor inbox: GET /bookings/group-pending ──────────────────────────
  /**
   * Lists every group booking the calling tutor currently has in
   * tutor_review. Returns the same Booking shape as listForUser/findById
   * so the frontend can reuse its existing booking-row components.
   */
  async listPendingForTutor(supabaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true, tutorProfile: { select: { id: true } } },
    });
    if (!user?.tutorProfile) return [];
    const rows = await this.prisma.booking.findMany({
      where: {
        tutorId: user.tutorProfile.id,
        sessionType: "group",
        groupStatus: "tutor_review",
      },
      include: {
        // student + tutor included so the tutor-side inbox can show
        // counterparty info just like the regular /bookings list does.
        student: { select: { displayName: true, avatarUrl: true } },
        tutor: {
          select: {
            user: { select: { displayName: true, avatarUrl: true } },
          },
        },
        participants: {
          include: {
            student: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
    return rows.map((b) => ({
      ...b,
      hasReview: false,
      viewerSide: "tutor" as const,
      studentDisplayName: b.student.displayName,
      studentAvatarUrl: b.student.avatarUrl ?? undefined,
      tutorDisplayName: b.tutor.user.displayName,
      tutorAvatarUrl: b.tutor.user.avatarUrl ?? undefined,
      participants: b.participants.map((p) => ({
        id: p.id,
        bookingId: p.bookingId,
        studentId: p.studentId,
        displayName: p.student.displayName,
        avatarUrl: p.student.avatarUrl ?? undefined,
        // tutor sees emails — but listPendingForTutor doesn't include them
        // in this projection by default (the tutor doesn't strictly need
        // them on the inbox card; the detail view loads them via
        // /bookings/:id/participants which does include emails for tutor).
        email: undefined,
        role: p.role,
        status: p.status,
        invitedAt: p.invitedAt.toISOString(),
        acceptedAt: p.acceptedAt?.toISOString(),
        paidAt: p.paidAt?.toISOString(),
      })),
    }));
  }

  // ── helpers ───────────────────────────────────────────────────────────
  private async requireBookingByInviteCode(code: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { inviteCode: code },
      include: { participants: true },
    });
    if (!booking) throw new NotFoundException("Invite not found");
    return booking;
  }

  /**
   * Public participant listing. Auth-scoped at the controller layer — host
   * + tutor see emails; accepted/paid invitees see other rows but with
   * emails masked.
   */
  async listParticipants(bookingId: string, viewerUserId?: string) {
    const rows = await this.prisma.bookingParticipant.findMany({
      where: { bookingId },
      include: { student: true },
      orderBy: [{ role: "asc" }, { invitedAt: "asc" }],
    });
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: { select: { userId: true } } },
    });
    const isHostOrTutor =
      viewerUserId &&
      booking &&
      (booking.studentId === viewerUserId ||
        booking.tutor.userId === viewerUserId);
    return rows.map((r) => {
      const row = this.toParticipantRow(r, r.student);
      // Privacy: only host + tutor see invitee emails. Even paid invitees
      // see participant names + statuses but not each other's emails.
      if (!isHostOrTutor) {
        return { ...row, email: undefined };
      }
      return row;
    });
  }

  private toParticipantRow(
    p: { id: string; bookingId: string; studentId: string; role: "host" | "invited"; status: "invited" | "accepted" | "declined" | "paid" | "expired"; invitedAt: Date; acceptedAt: Date | null; paidAt: Date | null },
    student: { displayName: string; avatarUrl: string | null; email: string },
  ) {
    return {
      id: p.id,
      bookingId: p.bookingId,
      studentId: p.studentId,
      displayName: student.displayName,
      avatarUrl: student.avatarUrl ?? undefined,
      email: student.email,
      role: p.role,
      status: p.status,
      invitedAt: p.invitedAt.toISOString(),
      acceptedAt: p.acceptedAt?.toISOString(),
      paidAt: p.paidAt?.toISOString(),
    };
  }
}

// ─── Pure helpers (exported for unit tests) ────────────────────────────────

/**
 * Lower-case + trim + dedupe emails. Throws on self-invite or already-
 * participating emails so the host gets a precise error. Returns the
 * cleaned list ready for User lookup.
 */
export function normalizeInviteEmails(
  raw: string[],
  ctx: { hostEmail: string; alreadyParticipating: Set<string> },
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const hostEmail = ctx.hostEmail.toLowerCase().trim();
  for (const r of raw) {
    const e = r.toLowerCase().trim();
    if (!e) continue;
    if (e === hostEmail) {
      throw new BadRequestException("ไม่สามารถเชิญตัวเองเข้ากลุ่มได้");
    }
    if (ctx.alreadyParticipating.has(e)) {
      throw new BadRequestException(
        `อีเมล ${e} อยู่ในกลุ่มนี้แล้ว`,
      );
    }
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

/**
 * True when every seat in the group has been accepted (host's row counts
 * as accepted from booking-create time). Used to advance forming →
 * tutor_review.
 */
export function shouldMoveToTutorReview(
  participants: ReadonlyArray<{ status: string }>,
  capacity: number,
): boolean {
  if (participants.length < capacity) return false;
  return participants.every(
    (p) => p.status === "accepted" || p.status === "paid",
  );
}


