import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { BookingReportDto, CreateBookingDto } from "@peerahat/types";
import {
  GROUP_MAX_CAPACITY,
  GROUP_MIN_CAPACITY,
  startOfTomorrowBangkok,
} from "@peerahat/types";
import { Prisma } from "@prisma/client";
import { addHours, subHours } from "date-fns";

import { PrismaService } from "../prisma/prisma.service";

/** Prisma errors raised when a Serializable transaction is aborted because a
 *  concurrent transaction modified the same predicate (Postgres 40001).
 *  Translated to BOOKING_OVERLAP so the client sees a stable code. */
const SERIALIZATION_FAILURE_CODES = new Set(["P2034"]);

/** Statuses that consume a calendar slot for overlap purposes (FR-TH-15). */
const ACTIVE_OVERLAP_STATUSES = [
  "requested",
  "accepted",
  "paid",
  "postpone_pending",
  "postponed",
] as const;

/** FR-TH-06: Manual-Accept model — tutors have 24h to accept a booking
 *  request before it expires. Named so the FR linkage stays explicit. */
const MANUAL_ACCEPT_DEADLINE_HOURS = 24;

/** Past-only guard for 1-on-1 booking start times. The slot picker
 *  greys slots strictly before now (minLeadHours=0), so the server
 *  matches: rejects scheduledAt < now and accepts everything else.
 *  Group bookings have a separate calendar-next-day rule (FR-TH-18)
 *  that fires first. Previously held a 30-min floor that silently
 *  rejected the slot the picker happily let users pick — see commit
 *  message for that fix. */
const MIN_BOOKING_LEAD_MINUTES = 0;

/** FR-TH-18: invitee acceptance window default. The forming group fails
 *  (and the host gets a 100% refund) at min(scheduledAt - this, scheduledAt
 *  - INVITE_MIN_BUFFER_HOURS) if any seat is still unaccepted by then.
 *  Separate from the "must book in advance" guard, which uses a calendar-
 *  day boundary (startOfTomorrowBangkok). */
const GROUP_INVITE_WINDOW_HOURS = 24;

/** Floor for inviteExpiresAt — the invite must always end at least this
 *  many hours BEFORE class so invitees who haven't responded still leave
 *  the host time to react. Same-day-tomorrow bookings can't honour the
 *  24h default; they shrink to this. */
const INVITE_MIN_BUFFER_HOURS = 1;

// Crockford Base32 alphabet (no I, L, O, U). 5 random bytes (40 bits) →
// 8 characters. With 32^8 ≈ 1.1×10^12 codes, collision probability is
// negligible in practice; the @unique constraint on Booking.inviteCode
// makes any real collision throw P2002, which we'd surface as a generic
// 500 rather than retry (acceptable at this volume).
const INVITE_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function generateInviteCode(): string {
  const bytes = randomBytes(5);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += INVITE_CODE_ALPHABET[(value >>> bits) & 0x1f];
    }
  }
  return out;
}

/**
 * FR-TH-18: pick inviteExpiresAt for a group booking. Prefers the 24h
 * default, but falls back to scheduledAt - 1h when that's in the past
 * (close-to-class bookings) — never returns a timestamp <= now so the
 * invite isn't born expired.
 */
function clampInviteExpiry(scheduledAt: Date): Date {
  const defaultExpiry = subHours(scheduledAt, GROUP_INVITE_WINDOW_HOURS);
  if (defaultExpiry > new Date()) return defaultExpiry;
  return subHours(scheduledAt, INVITE_MIN_BUFFER_HOURS);
}

/**
 * Half-open interval overlap: [aStart, aEnd) intersects [bStart, bEnd).
 * Touching edges (aEnd === bStart) is NOT an overlap. This is the JS twin
 * of the Postgres predicate in assertNoOverlap so the boundary semantics
 * are exercised by unit tests.
 */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Walk the [from, to) window day-by-day and emit every concrete interval
 * implied by the weekly rules. Used by both the busy endpoint (so the
 * picker can grey cells) and assertNoOverlap (overlap rejection).
 */
export function expandWeeklyRules(
  rules: Array<{ weekday: number; startMinute: number; endMinute: number }>,
  from: Date,
  to: Date,
): BusySlot[] {
  if (rules.length === 0) return [];
  const out: BusySlot[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor < to) {
    const weekday = cursor.getDay();
    for (const r of rules) {
      if (r.weekday !== weekday) continue;
      const start = new Date(cursor);
      start.setMinutes(r.startMinute);
      const end = new Date(cursor);
      end.setMinutes(r.endMinute);
      if (start < to && end > from) {
        out.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export interface BusySlot {
  start: string;
  end: string;
}

interface RawOverlapRow {
  id: string;
  scheduledAt: Date;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listForUser(supabaseId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) return [];
    const rows = await this.prisma.booking.findMany({
      where: {
        OR: [
          { studentId: user.id },
          { tutor: { userId: user.id } },
        ],
      },
      include: {
        review: { select: { id: true } },
        postponeRequest: true,
        chatThread: { select: { id: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });
    return rows.map(({ review, postponeRequest, chatThread, ...b }) => ({
      ...b,
      hasReview: !!review,
      viewerSide:
        b.studentId === user.id ? ("student" as const) : ("tutor" as const),
      chatThreadId: chatThread?.id,
      postponeRequest: postponeRequest
        ? {
            id: postponeRequest.id,
            initiatorRole: postponeRequest.initiatorRole,
            reason: postponeRequest.reason,
            chatExpiresAt: postponeRequest.chatExpiresAt.toISOString(),
            status: postponeRequest.status,
            proposedAt: postponeRequest.proposedAt?.toISOString(),
            proposedDuration: postponeRequest.proposedDuration ?? undefined,
            wasShortNotice: postponeRequest.wasShortNotice,
            createdAt: postponeRequest.createdAt.toISOString(),
          }
        : undefined,
    }));
  }

  async findById(supabaseId: string, bookingId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const row = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        review: { select: { id: true } },
        tutor: { select: { userId: true } },
        postponeRequest: true,
        chatThread: { select: { id: true } },
      },
    });
    if (!row) throw new NotFoundException();
    if (row.studentId !== user.id && row.tutor.userId !== user.id) {
      throw new ForbiddenException();
    }
    const { review, postponeRequest, chatThread, tutor: _tutor, ...b } = row;
    return {
      ...b,
      hasReview: !!review,
      viewerSide:
        b.studentId === user.id ? ("student" as const) : ("tutor" as const),
      chatThreadId: chatThread?.id,
      postponeRequest: postponeRequest
        ? {
            id: postponeRequest.id,
            initiatorRole: postponeRequest.initiatorRole,
            reason: postponeRequest.reason,
            chatExpiresAt: postponeRequest.chatExpiresAt.toISOString(),
            status: postponeRequest.status,
            proposedAt: postponeRequest.proposedAt?.toISOString(),
            proposedDuration: postponeRequest.proposedDuration ?? undefined,
            wasShortNotice: postponeRequest.wasShortNotice,
            createdAt: postponeRequest.createdAt.toISOString(),
          }
        : undefined,
    };
  }

  async create(supabaseId: string, input: CreateBookingDto) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: input.tutorId },
      include: { user: { select: { suspendedUntil: true } } },
    });
    if (!tutor) throw new NotFoundException();
    if (tutor.userId === user.id) {
      throw new ForbiddenException("ไม่สามารถจองคลาสของตัวเองได้");
    }
    // FR-CM-05: no new bookings against a currently-suspended tutor.
    if (
      tutor.user.suspendedUntil &&
      tutor.user.suspendedUntil.getTime() > Date.now()
    ) {
      throw new ForbiddenException("ติวเตอร์รายนี้ถูกพักการใช้งานชั่วคราว");
    }
    // FR-TH-04: tutors who skipped the intro-video step at onboarding
    // stay booking-disabled until they upload one. tutors.search also
    // excludes them, so this guard is mostly defence in depth — a
    // deep-link or stale id could still reach here.
    if (!tutor.introVideoUrl) {
      throw new ForbiddenException(
        "ติวเตอร์รายนี้ยังไม่ได้เปิดรับการจอง (รอคลิปแนะนำตัว)",
      );
    }

    // Past-only guard for 1-on-1 (group has the stricter next-day-BKK
    // check below). MIN_BOOKING_LEAD_MINUTES=0 means scheduledAt just
    // has to be > now — the picker already enforces this at the UI.
    const minStart = new Date(Date.now() + MIN_BOOKING_LEAD_MINUTES * 60_000);
    if (new Date(input.scheduledAt) < minStart) {
      throw new BadRequestException(
        "เวลาเริ่มคลาสต้องเป็นเวลาในอนาคต",
      );
    }

    // FR-TH-18: amountThb is per-seat. A group booking with capacity=4 and
    // duration 60min charges `tutor.hourlyRate` to each of the 4 participants
    // individually — never the sum.
    const amountThb = Math.round(
      tutor.hourlyRate * (input.durationMinutes / 60),
    );

    // FR-TH-18: branch on sessionType. Default (undefined or "one_on_one")
    // keeps every existing 1-on-1 caller behaviourally unchanged. For
    // "group" we additionally set capacity / groupStatus / inviteCode /
    // inviteExpiresAt and create the host BookingParticipant inside the
    // same Serializable transaction so the invariant "every booking has
    // at least the host participant" holds from creation onward (1-on-1
    // bookings also get a single host participant — keeps the schema
    // shape uniform for downstream code).
    const sessionType = input.sessionType ?? "one_on_one";
    const isGroup = sessionType === "group";
    const capacity = isGroup
      ? (input.capacity ?? GROUP_MIN_CAPACITY)
      : 1;
    if (isGroup) {
      // Defensive — the zod schema's superRefine already enforces this.
      if (capacity < GROUP_MIN_CAPACITY || capacity > GROUP_MAX_CAPACITY) {
        throw new BadRequestException(
          `จำนวนคนในกลุ่มต้องอยู่ระหว่าง ${GROUP_MIN_CAPACITY}-${GROUP_MAX_CAPACITY} คน`,
        );
      }
      // FR-TH-18: group classes must be booked at least one calendar day
      // ahead (Asia/Bangkok). At 23:00 BKK you can still book for 00:30 the
      // next day; at 01:00 BKK you can't book anything later today. The 24h
      // invitee-acceptance window (inviteExpiresAt below) is a separate rule.
      if (new Date(input.scheduledAt) < startOfTomorrowBangkok()) {
        throw new BadRequestException(
          "คลาสกลุ่มต้องเริ่มตั้งแต่วันพรุ่งนี้เป็นต้นไป",
        );
      }
    }

    // FR-TH-15: the overlap SELECTs and the INSERT must share one transaction
    // with Serializable isolation. Without it, two concurrent POSTs for the
    // same slot can both see "no overlap" and both insert. Postgres aborts
    // the second tx with 40001 when its read predicate is invalidated by
    // the first commit; we map that to the same BOOKING_OVERLAP code so the
    // client sees a stable error envelope either way.
    try {
      const created = await this.prisma.$transaction(
        async (tx) => {
          await this.assertNoOverlap(
            user.id,
            input.scheduledAt,
            input.durationMinutes,
            undefined,
            tx,
          );
          await this.assertNoOverlap(
            tutor.userId,
            input.scheduledAt,
            input.durationMinutes,
            undefined,
            tx,
          );
          const booking = await tx.booking.create({
            data: {
              studentId: user.id,
              tutorId: input.tutorId,
              subject: input.subject,
              scheduledAt: new Date(input.scheduledAt),
              durationMinutes: input.durationMinutes,
              amountThb,
              acceptDeadlineAt: addHours(new Date(), MANUAL_ACCEPT_DEADLINE_HOURS),
              status: "requested",
              sessionType,
              capacity,
              ...(isGroup
                ? {
                    groupStatus: "forming",
                    inviteCode: generateInviteCode(),
                    // Default to 24h before class, but clamp so the window
                    // never ends in the past (close-to-class bookings) or
                    // closer to class than INVITE_MIN_BUFFER_HOURS. Example:
                    // tomorrow 09:00 booked today 10:00 → default would
                    // be today 09:00 (1h ago), so we shrink to tomorrow
                    // 08:00 instead (22h window).
                    inviteExpiresAt: clampInviteExpiry(
                      new Date(input.scheduledAt),
                    ),
                  }
                : {}),
            },
          });
          // FR-TH-18: host participant row created inline. Status "accepted"
          // mirrors the migration backfill (booking exists ⇒ host committed,
          // payment to follow). PaymentIntent linkage happens in step 7 when
          // slip verification flips status → "paid".
          await tx.bookingParticipant.create({
            data: {
              bookingId: booking.id,
              studentId: user.id,
              role: "host",
              status: "accepted",
              acceptedAt: new Date(),
            },
          });
          return booking;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      this.logger.log(
        JSON.stringify({
          event: "booking_created",
          bookingId: created.id,
          tutorId: created.tutorId,
          studentId: created.studentId,
          subject: created.subject,
          scheduledAt: created.scheduledAt.toISOString(),
          durationMinutes: created.durationMinutes,
          amountThb: created.amountThb,
          sessionType: created.sessionType,
          capacity: created.capacity,
          groupStatus: created.groupStatus,
        }),
      );
      return { ...created, hasReview: false, viewerSide: "student" as const };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        SERIALIZATION_FAILURE_CODES.has(err.code)
      ) {
        this.logger.warn(
          JSON.stringify({
            event: "booking_overlap_rejected",
            source: "serialization_failure",
            tutorId: input.tutorId,
            studentId: user.id,
            scheduledAt: input.scheduledAt,
            durationMinutes: input.durationMinutes,
          }),
        );
        throw new ConflictException({ code: "BOOKING_OVERLAP" });
      }
      throw err;
    }
  }

  /**
   * FR-TH-15: throws ConflictException(409) when the [scheduledAt, +duration)
   * interval intersects any active booking — or any active postpone proposal —
   * for the given User. Touching edges (one ends at 14:00, next starts at
   * 14:00) is NOT an overlap; the predicate uses half-open intervals.
   *
   * Raw SQL is used because Prisma cannot express the `+ interval N minutes`
   * arithmetic in its query builder. The User is matched as either the student
   * directly (Booking.studentId) or as the tutor (Booking.tutorId →
   * TutorProfile.userId).
   */
  async assertNoOverlap(
    userId: string,
    scheduledAt: string | Date,
    durationMinutes: number,
    excludeBookingId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const newStart = new Date(scheduledAt);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60_000);
    const statuses = Prisma.join(ACTIVE_OVERLAP_STATUSES);
    const exclude = excludeBookingId
      ? Prisma.sql`AND b.id <> ${excludeBookingId}`
      : Prisma.empty;

    // 1) overlap with another booking's own scheduledAt window.
    const bookingHits = await db.$queryRaw<RawOverlapRow[]>(
      Prisma.sql`
        SELECT b.id, b."scheduledAt"
        FROM "Booking" b
        LEFT JOIN "TutorProfile" t ON t.id = b."tutorId"
        WHERE (b."studentId" = ${userId} OR t."userId" = ${userId})
          AND b.status::text IN (${statuses})
          ${exclude}
          AND b."scheduledAt" < ${newEnd}
          AND b."scheduledAt" + (b."durationMinutes" || ' minutes')::interval > ${newStart}
        LIMIT 1
      `,
    );
    if (bookingHits.length > 0) {
      const hit = bookingHits[0]!;
      this.logger.warn(
        JSON.stringify({
          event: "booking_overlap_rejected",
          source: "existing_booking",
          userId,
          conflictingBookingId: hit.id,
          conflictingScheduledAt: hit.scheduledAt.toISOString(),
          requestedScheduledAt: newStart.toISOString(),
          requestedDurationMinutes: durationMinutes,
        }),
      );
      throw new ConflictException({
        code: "BOOKING_OVERLAP",
        conflictingBookingId: hit.id,
        conflictingScheduledAt: hit.scheduledAt.toISOString(),
      });
    }

    // 2) overlap with an active postpone proposal (postpone_pending bookings
    //    reserve BOTH their original slot AND the proposed new slot).
    const proposalHits = await db.$queryRaw<RawOverlapRow[]>(
      Prisma.sql`
        SELECT b.id, pr."proposedAt" AS "scheduledAt"
        FROM "Booking" b
        JOIN "PostponeRequest" pr ON pr.id = b."postponeRequestId"
        LEFT JOIN "TutorProfile" t ON t.id = b."tutorId"
        WHERE (b."studentId" = ${userId} OR t."userId" = ${userId})
          AND pr.status::text = 'negotiating'
          AND pr."proposedAt" IS NOT NULL
          AND pr."proposedDuration" IS NOT NULL
          ${exclude}
          AND pr."proposedAt" < ${newEnd}
          AND pr."proposedAt" + (pr."proposedDuration" || ' minutes')::interval > ${newStart}
        LIMIT 1
      `,
    );
    if (proposalHits.length > 0) {
      const hit = proposalHits[0]!;
      this.logger.warn(
        JSON.stringify({
          event: "booking_overlap_rejected",
          source: "postpone_proposal",
          userId,
          conflictingBookingId: hit.id,
          conflictingScheduledAt: hit.scheduledAt.toISOString(),
          requestedScheduledAt: newStart.toISOString(),
          requestedDurationMinutes: durationMinutes,
        }),
      );
      throw new ConflictException({
        code: "BOOKING_OVERLAP",
        conflictingBookingId: hit.id,
        conflictingScheduledAt: hit.scheduledAt.toISOString(),
      });
    }

    // 3) FR-TH-16: if the User is a tutor, also reject overlaps with their
    //    own recurring unavailability windows. Same BOOKING_OVERLAP code —
    //    the student-facing toast doesn't need to distinguish the cause.
    const tutorProfile = await db.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (tutorProfile) {
      const rules = await db.tutorUnavailability.findMany({
        where: { tutorId: tutorProfile.id },
      });
      if (rules.length > 0) {
        for (const interval of expandWeeklyRules(rules, newStart, newEnd)) {
          const blockStart = new Date(interval.start);
          const blockEnd = new Date(interval.end);
          if (intervalsOverlap(newStart, newEnd, blockStart, blockEnd)) {
            this.logger.warn(
              JSON.stringify({
                event: "booking_overlap_rejected",
                source: "tutor_unavailability",
                userId,
                tutorProfileId: tutorProfile.id,
                conflictingScheduledAt: blockStart.toISOString(),
                requestedScheduledAt: newStart.toISOString(),
                requestedDurationMinutes: durationMinutes,
              }),
            );
            throw new ConflictException({
              code: "BOOKING_OVERLAP",
              conflictingBookingId: tutorProfile.id,
              conflictingScheduledAt: blockStart.toISOString(),
            });
          }
        }
      }
    }
  }

  /**
   * Lists every busy interval [start, end) for the calling user across the
   * [from, to] window — both their own bookings and active postpone proposals.
   * Used by the slot picker to grey out conflicting cells client-side.
   */
  async listBusyForUser(
    supabaseId: string,
    from: Date,
    to: Date,
  ): Promise<BusySlot[]> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) return [];
    return this.collectBusyForUserId(user.id, from, to);
  }

  /** Internal: shared between BookingsService.listBusyForUser and the tutor
   *  availability endpoint (which resolves the tutor's User.id first).
   *  Includes (1) existing bookings, (2) active postpone proposals, and
   *  (3) FR-TH-16 tutor unavailability rules expanded across [from, to). */
  async collectBusyForUserId(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<BusySlot[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { in: [...ACTIVE_OVERLAP_STATUSES] },
        scheduledAt: { lt: to },
        OR: [
          { studentId: userId },
          { tutor: { userId } },
        ],
      },
      include: { postponeRequest: true },
    });
    const busy: BusySlot[] = [];
    for (const b of bookings) {
      const start = b.scheduledAt;
      const end = new Date(start.getTime() + b.durationMinutes * 60_000);
      // include only intervals that intersect [from, to)
      if (end > from) busy.push({ start: start.toISOString(), end: end.toISOString() });
      if (
        b.postponeRequest?.status === "negotiating" &&
        b.postponeRequest.proposedAt &&
        b.postponeRequest.proposedDuration
      ) {
        const pStart = b.postponeRequest.proposedAt;
        const pEnd = new Date(
          pStart.getTime() + b.postponeRequest.proposedDuration * 60_000,
        );
        if (pStart < to && pEnd > from) {
          busy.push({ start: pStart.toISOString(), end: pEnd.toISOString() });
        }
      }
    }

    // FR-TH-16: expand tutor weekly unavailability rules into concrete
    // intervals across the requested window.
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (tutor) {
      const rules = await this.prisma.tutorUnavailability.findMany({
        where: { tutorId: tutor.id },
      });
      if (rules.length > 0) {
        for (const interval of expandWeeklyRules(rules, from, to)) {
          busy.push(interval);
        }
      }
    }

    return busy;
  }

  /**
   * FR-TH-06: student cancels a 1-on-1 booking BEFORE payment lands.
   * Allowed only while booking.status ∈ {requested, accepted}. Once paid,
   * the only escape is postpone (FR-TH-10) or report (FR-PM-05).
   *
   * Group bookings explicitly route through GroupSessionService.failGroup
   * (so refunds, invitee notifications, and groupStatus all stay
   * consistent) — students can't use this method on a group booking.
   */
  async cancelByStudent(supabaseId: string, bookingId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException();
    if (booking.studentId !== user.id) throw new ForbiddenException();
    if (booking.sessionType === "group") {
      throw new BadRequestException(
        "คลาสกลุ่มยกเลิกผ่านระบบกลุ่ม — กรุณาติดต่อแอดมินหรือรอให้คำเชิญหมดอายุ",
      );
    }
    if (booking.status !== "requested" && booking.status !== "accepted") {
      throw new BadRequestException(
        "ยกเลิกได้เฉพาะคลาสที่ยังไม่ได้ชำระเงินเท่านั้น",
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled_by_student" },
    });
    this.logger.log(
      JSON.stringify({
        event: "booking_cancelled_by_student",
        bookingId: updated.id,
        previousStatus: booking.status,
        tutorId: updated.tutorId,
        studentId: updated.studentId,
        scheduledAt: updated.scheduledAt.toISOString(),
      }),
    );
    return { ...updated, hasReview: false, viewerSide: "student" as const };
  }

  async accept(supabaseId: string, bookingId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.tutor.userId !== user.id) throw new ForbiddenException();
    if (booking.status !== "requested") {
      throw new BadRequestException("Booking is not in requested state");
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "accepted" },
    });
    this.logger.log(
      JSON.stringify({
        event: "booking_accepted",
        bookingId: updated.id,
        tutorId: updated.tutorId,
        studentId: updated.studentId,
        tutorUserId: user.id,
      }),
    );
    return { ...updated, hasReview: false, viewerSide: "tutor" as const };
  }

  /**
   * FR-PM-05: student report inside the 24h window. Creates the Report
   * row and immediately freezes the linked escrow so admin has time to
   * review before the release timer fires. Mirrors AdminService.freezeBooking
   * for the payment-side effects but is owner-scoped (only the booking's
   * student can call this).
   */
  async report(
    supabaseId: string,
    bookingId: string,
    dto: BookingReportDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { paymentIntent: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.studentId !== user.id) throw new ForbiddenException();
    if (
      !booking.reportWindowEndsAt ||
      booking.reportWindowEndsAt.getTime() < Date.now()
    ) {
      throw new BadRequestException("Report window is not open");
    }

    await this.prisma.$transaction(async (tx) => {
      // INTERIM (report system): the legacy booking-report endpoint is
      // superseded by the unified POST /reports (step 8). Until then it
      // writes a valid new-schema row with a default category + 48h SLA.
      await tx.report.create({
        data: {
          reporterId: user.id,
          targetType: "booking",
          targetId: bookingId,
          category: "other",
          description: `[${dto.reason}] ${dto.details}`,
          slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
          linkedBookingId: bookingId,
        },
      });
      // Only freeze if escrow is still holding. If it already released
      // into a payout (FR-PM-06) or was refunded, the dispute is handled
      // out-of-band by admin via the existing /admin/bookings/:id/freeze
      // path which has wider authority.
      if (booking.paymentIntent?.status === "held_in_escrow") {
        await tx.paymentIntent.update({
          where: { id: booking.paymentIntent.id },
          data: { status: "disputed" },
        });
      }
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "reported" },
      });
    });
  }
}
