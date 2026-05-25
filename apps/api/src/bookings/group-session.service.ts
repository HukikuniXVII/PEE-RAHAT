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

import { NotificationService } from "../notifications/notification.service";
import { encodePromptPayPayload } from "../payments/promptpay";
import { PrismaService } from "../prisma/prisma.service";
import { BookingsService } from "./bookings.service";

/**
 * FR-TH-18 — controller for the group-session lifecycle:
 *
 *   forming      → host paid + invitees still accepting/declining
 *   tutor_review → every seat accepted; tutor decides go / no-go
 *   confirmed    → tutor approved AND every invitee paid; Meet generated
 *                  (Meet + group thread land in step 8)
 *   failed       → any failure mode; 100% refund to every paid participant
 *
 * Everything that mutates groupStatus or participant.status routes through
 * this service so the state machine stays auditable in one place.
 */
@Injectable()
export class GroupSessionService {
  private readonly logger = new Logger(GroupSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Host: invite a batch of emails ────────────────────────────────────
  /**
   * Host invokes /bookings/:id/invite with a list of emails. Already-invited
   * or already-accepted emails are silently skipped (idempotent). Self-invite
   * + over-capacity get hard rejected so the host sees the constraint.
   */
  async invite(supabaseId: string, bookingId: string, emailsRaw: string[]) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();

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
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
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
      linkUrl: `/bookings/${booking.id}/group`,
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
          linkUrl: `/bookings/${booking.id}`,
        });
      }
    }

    return this.toParticipantRow(updated, user);
  }

  // ── Invitee: decline ──────────────────────────────────────────────────
  async declineInvite(supabaseId: string, code: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
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
      linkUrl: `/bookings/${booking.id}/group`,
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
   * Tutor approves the group composition. Creates a PaymentIntent per
   * invitee (host already has theirs from when they paid at create-time).
   * groupStatus stays 'tutor_review' until the last invitee pays; that
   * triggers confirmGroup.
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

    // Invitees who accepted but have no PaymentIntent yet.
    const invitees = booking.participants.filter(
      (p) => p.role === "invited" && p.status === "accepted" && !p.paymentIntentId,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const p of invitees) {
        const intent = await tx.paymentIntent.create({
          data: {
            payerId: p.studentId,
            itemType: "booking",
            // bookingId stays NULL for invitee intents — the host's intent
            // is the canonical one linked via @unique. Invitees join the
            // booking through BookingParticipant.paymentIntentId.
            bookingId: null,
            amountThb: booking.amountThb,
            promptPayQrPayload: buildPromptPayPayload(booking.amountThb),
            expiresAt: addHours(new Date(), 24),
          },
        });
        await tx.bookingParticipant.update({
          where: { id: p.id },
          data: { paymentIntentId: intent.id },
        });
      }
    });

    this.logger.log(
      JSON.stringify({
        event: "group_tutor_approved",
        bookingId,
        intentsCreated: invitees.length,
      }),
    );

    // Notify host that the tutor approved. Each invitee is also notified
    // so they know to pay; reusing group_decision keeps the surface small.
    await this.notifications.notify({
      userId: booking.studentId,
      type: "group_decision",
      title: "ติวเตอร์อนุมัติคลาสกลุ่มแล้ว",
      body: "เพื่อนของคุณกำลังชำระเงิน — คลาสจะยืนยันเมื่อทุกคนชำระครบ",
      linkUrl: `/bookings/${bookingId}/group`,
    });
    for (const p of invitees) {
      await this.notifications.notify({
        userId: p.studentId,
        type: "group_decision",
        title: "ติวเตอร์อนุมัติคลาสกลุ่มแล้ว",
        body: "ชำระเงินภายใน 24 ชั่วโมงเพื่อยืนยันที่นั่งของคุณ",
        linkUrl: `/bookings/${bookingId}/group`,
      });
    }

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
      linkUrl: `/bookings/${bookingId}`,
    });
  }

  // ── Slip-verify worker callback (wired in step 7) ─────────────────────
  /**
   * Called when an invitee (or the host) successfully verifies a slip and
   * their PaymentIntent flips to held_in_escrow. Idempotent — re-calls on
   * the same intent are no-ops.
   *
   * NOTE: not yet wired. PaymentsService.uploadSlip will dispatch here in
   * step 7. For 1-on-1 bookings (sessionType=one_on_one) this returns
   * early; the existing PaymentsService path still flips booking.status.
   */
  async onParticipantPaid(paymentIntentId: string) {
    const participant = await this.prisma.bookingParticipant.findUnique({
      where: { paymentIntentId },
      include: { booking: true },
    });
    if (!participant) return; // 1-on-1 host intent — no participant link
    if (participant.booking.sessionType !== "group") return;
    if (participant.status === "paid") return; // idempotent

    await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.bookingParticipant.update({
          where: { id: participant.id },
          data: { status: "paid", paidAt: new Date() },
        });
        const all = await tx.bookingParticipant.findMany({
          where: { bookingId: participant.bookingId },
        });
        if (shouldConfirmGroup(all, participant.booking.capacity)) {
          await this.confirmGroup(tx, participant.bookingId);
        }
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(
      JSON.stringify({
        event: "group_participant_paid",
        bookingId: participant.bookingId,
        participantId: participant.id,
      }),
    );
  }

  // ── Internal: tutor_review → confirmed (step 8 adds chat + Meet) ──────
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
    // TODO step 8: ChatService.createGroupThread(bookingId) + Meet generation.
  }

  // ── Public: any → failed ──────────────────────────────────────────────
  /**
   * Writes 100% RefundLedger rows for every PAID participant, marks every
   * other pending intent failed, sets groupStatus=failed +
   * booking.status=cancelled. No tutor defectCount increment (group
   * failures are operational, not tutor misconduct).
   */
  async failGroup(bookingId: string, reason: RefundReason) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        participants: {
          include: { paymentIntent: true },
        },
      },
    });
    if (!booking) throw new NotFoundException();
    if (booking.groupStatus === "failed") return; // idempotent

    await this.prisma.$transaction(async (tx) => {
      for (const p of booking.participants) {
        if (!p.paymentIntent) continue;
        if (p.status === "paid") {
          // 100% refund — no tutor cut, no platform cut. RefundLedger.bookingId
          // is required so we set it from the participant even though the
          // invitee's PaymentIntent.bookingId may be null (invariant: host
          // intent links to booking, invitee intent does not — see schema
          // comment in step 1).
          await tx.refundLedger.create({
            data: {
              paymentIntentId: p.paymentIntent.id,
              bookingId: booking.id,
              originalAmountThb:
                p.paymentIntent.originalAmountThb ?? p.paymentIntent.amountThb,
              studentRefundThb: p.paymentIntent.amountThb,
              tutorThb: 0,
              platformThb: 0,
              reasonCode: reason,
            },
          });
          await tx.paymentIntent.update({
            where: { id: p.paymentIntent.id },
            data: { status: "refunded", amountThb: 0 },
          });
        } else if (
          ["pending_transfer", "slip_uploaded", "verifying"].includes(
            p.paymentIntent.status,
          )
        ) {
          // Pending intent gets cancelled — never paid, no refund needed.
          await tx.paymentIntent.update({
            where: { id: p.paymentIntent.id },
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
        refunded: booking.participants.filter((p) => p.status === "paid")
          .length,
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
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
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

/**
 * True when every seat in the group has paid. Used to advance
 * tutor_review → confirmed once the last invitee's slip verifies.
 */
export function shouldConfirmGroup(
  participants: ReadonlyArray<{ status: string }>,
  capacity: number,
): boolean {
  if (participants.length < capacity) return false;
  return participants.every((p) => p.status === "paid");
}

// PromptPay payload — duplicated from PaymentsService.buildPromptPayPayload
// to avoid a circular dep with PaymentsService. Both call the same shared
// encoder; a future refactor can extract the env-stub logic to promptpay.ts
// and have both services use that. ~5 lines of duplication.
function buildPromptPayPayload(amountThb: number): string {
  const merchantId = process.env.PROMPTPAY_MERCHANT_ID;
  if (merchantId) return encodePromptPayPayload({ merchantId, amountThb });
  return `promptpay-stub:amount=${amountThb}`;
}
