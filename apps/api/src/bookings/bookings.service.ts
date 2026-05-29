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

import { requireUserBySupabaseId } from "../common/user-lookup";
import { NotificationService } from "../notifications/notification.service";
import { SseGateway } from "../notifications/sse.gateway";
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
 * Shared Prisma include for every code path that returns a Booking DTO.
 * Centralised so adding a field (e.g. counterparty avatar) doesn't have
 * to be duplicated across listForUser / findById / create / accept /
 * cancelByStudent / rejectByTutor — every site goes through
 * `decorateBooking()` below.
 */
const BOOKING_DTO_INCLUDE = {
  review: { select: { id: true } },
  postponeRequest: true,
  chatThread: { select: { id: true } },
  student: { select: { displayName: true, avatarUrl: true } },
  tutor: {
    select: {
      userId: true,
      user: { select: { displayName: true, avatarUrl: true } },
    },
  },
  // Participants drive two things:
  //   1) FR-TH-18 rev2: `hostPaid` derivation (find the host's row,
  //      check status === "paid").
  //   2) FR-BK-12: the "ผู้เข้าเรียน" strip on group rows — needs the
  //      full roster with displayName + avatarUrl per invitee.
  // Includes every participant so both code paths can read from one
  // include. The decorator drops the array for 1-on-1 bookings so 1-on-1
  // wire payloads stay tiny.
  participants: {
    select: {
      id: true,
      studentId: true,
      student: { select: { displayName: true, avatarUrl: true } },
      role: true,
      status: true,
      invitedAt: true,
      acceptedAt: true,
      paidAt: true,
    },
    orderBy: { invitedAt: "asc" as const },
  },
} as const satisfies Prisma.BookingInclude;

type BookingWithDtoInclude = Prisma.BookingGetPayload<{
  include: typeof BOOKING_DTO_INCLUDE;
}>;

/**
 * Shape a Booking row into the wire DTO. Centralised so the hydrated
 * counterparty info + postpone projection stay consistent across every
 * listing / mutation endpoint.
 */
function decorateBooking(
  row: BookingWithDtoInclude,
  viewerSide: "student" | "tutor",
) {
  const { review, postponeRequest, chatThread, student, tutor, participants, ...b } = row;
  const hostPaid =
    row.sessionType === "group" &&
    participants.some((p) => p.role === "host" && p.status === "paid");
  // FR-BK-12: only group rows carry the participant roster on the wire.
  // 1-on-1 bookings keep `participants` undefined per the DTO contract.
  const participantsDto =
    row.sessionType === "group"
      ? participants.map((p) => ({
          id: p.id,
          bookingId: row.id,
          studentId: p.studentId,
          displayName: p.student.displayName,
          avatarUrl: p.student.avatarUrl ?? undefined,
          role: p.role,
          status: p.status,
          invitedAt: p.invitedAt.toISOString(),
          acceptedAt: p.acceptedAt?.toISOString(),
          paidAt: p.paidAt?.toISOString(),
        }))
      : undefined;
  return {
    ...b,
    hasReview: !!review,
    viewerSide,
    chatThreadId: chatThread?.id,
    studentDisplayName: student.displayName,
    studentAvatarUrl: student.avatarUrl ?? undefined,
    tutorDisplayName: tutor.user.displayName,
    tutorAvatarUrl: tutor.user.avatarUrl ?? undefined,
    hostPaid,
    participants: participantsDto,
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly sse: SseGateway,
  ) {}

  /**
   * FR-CM-08 rev2: fan an SSE cache-invalidation event at every userId
   * touched by a booking mutation so their /bookings list, /bookings/[id]
   * detail, and (for groups) participant roster auto-refresh without a
   * manual reload. Always safe to call — empty audiences are a no-op
   * inside SseGateway.publishInvalidate.
   *
   * Pass the row right out of decorateBooking's BOOKING_DTO_INCLUDE
   * shape (tutor.userId + participants[].studentId already populated).
   */
  private fanoutBookingChange(row: BookingWithDtoInclude): void {
    const audience = Array.from(
      new Set<string>([
        row.studentId,
        row.tutor.userId,
        ...row.participants.map((p) => p.studentId),
      ]),
    );
    if (audience.length === 0) return;
    // Prefix-invalidate the whole bookings domain so /bookings/mine,
    // /bookings/group-pending, /bookings/byId/:id, and the participant
    // roster all refresh in one SSE write. React Query's
    // invalidateQueries({queryKey: ["bookings"]}) matches every key
    // that starts with that prefix.
    this.sse.publishInvalidate(audience, ["bookings"]);
  }

  /**
   * Public id-based variant for callers (GroupSessionService, PostponeService)
   * that hold a booking id but not the BOOKING_DTO_INCLUDE row. Uses a
   * compact select that only pulls the user-id columns needed for the
   * fanout — does NOT load chat-thread, postpone, review relations the
   * decorateBooking shape needs.
   */
  async fanoutBookingChangeById(bookingId: string): Promise<void> {
    const row = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        studentId: true,
        tutor: { select: { userId: true } },
        participants: { select: { studentId: true } },
      },
    });
    if (!row) return;
    const audience = Array.from(
      new Set<string>([
        row.studentId,
        row.tutor.userId,
        ...row.participants.map((p) => p.studentId),
      ]),
    );
    if (audience.length === 0) return;
    // See fanoutBookingChange — single umbrella ["bookings"] key.
    this.sse.publishInvalidate(audience, ["bookings"]);
  }

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
      include: BOOKING_DTO_INCLUDE,
      orderBy: { scheduledAt: "desc" },
    });
    return rows.map((row) =>
      decorateBooking(row, row.studentId === user.id ? "student" : "tutor"),
    );
  }

  async findById(supabaseId: string, bookingId: string) {
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
    const row = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: BOOKING_DTO_INCLUDE,
    });
    if (!row) throw new NotFoundException();
    if (row.studentId !== user.id && row.tutor.userId !== user.id) {
      throw new ForbiddenException();
    }
    return decorateBooking(row, row.studentId === user.id ? "student" : "tutor");
  }

  async create(supabaseId: string, input: CreateBookingDto) {
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
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
    // FR-TH-04 rev2: intro-video gate sunset — bookings are open to
    // any applied tutor regardless of intro-video upload state. KYC
    // verification is purely a cosmetic badge (see tutors.search and
    // FR-TH-02 / TutorCard).

    // Past-only guard for 1-on-1 (group has the stricter next-day-BKK
    // check below). MIN_BOOKING_LEAD_MINUTES=0 means scheduledAt just
    // has to be > now — the picker already enforces this at the UI.
    const minStart = new Date(Date.now() + MIN_BOOKING_LEAD_MINUTES * 60_000);
    if (new Date(input.scheduledAt) < minStart) {
      throw new BadRequestException(
        "เวลาเริ่มคลาสต้องเป็นเวลาในอนาคต",
      );
    }

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

    // FR-TH-18 rev2: amountThb is the TOTAL class cost. 1-on-1 keeps
    // `hourlyRate × hours` (capacity=1). Group bookings multiply by
    // capacity — the host fronts the full class cost for everyone and
    // invitees only RSVP (they never see a payment dialog). This matches
    // the user-visible total the host is committing to when they book.
    const amountThb = Math.round(
      tutor.hourlyRate * (input.durationMinutes / 60) * capacity,
    );
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
      // Re-read with the shared include so the response carries the
      // tutor/student display names + avatars — saves the UI a round-trip
      // to render the new booking row.
      const hydrated = await this.prisma.booking.findUniqueOrThrow({
        where: { id: created.id },
        include: BOOKING_DTO_INCLUDE,
      });
      // FR-CM-08: tutor gets a feed entry the moment a request lands.
      // Group bookings have their own notification path in
      // GroupSessionService; only fire for 1-on-1 here to avoid doubling.
      if (!isGroup) {
        await this.notifications.notify({
          userId: tutor.userId,
          type: "booking_requested",
          title: "มีคำขอจองคลาสใหม่",
          body: `${hydrated.student.displayName} ขอจอง "${hydrated.subject}"`,
          actionUrl: "/bookings",
          sourceType: "booking",
          sourceId: hydrated.id,
        });
      }
      this.fanoutBookingChange(hydrated);
      return decorateBooking(hydrated, "student");
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
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
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
      include: BOOKING_DTO_INCLUDE,
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
    this.fanoutBookingChange(updated);
    return decorateBooking(updated, "student");
  }

  /**
   * FR-TH-06: tutor rejects a 1-on-1 booking still in `requested`
   * state. After the tutor accepts (`accepted`), the only way to back
   * out is postpone (FR-TH-10) — same constraint that applies to the
   * student-cancel path. Group bookings go through GroupSessionService.
   */
  async rejectByTutor(supabaseId: string, bookingId: string) {
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: { select: { userId: true } } },
    });
    if (!booking) throw new NotFoundException();
    if (booking.tutor.userId !== user.id) throw new ForbiddenException();
    if (booking.sessionType === "group") {
      throw new BadRequestException(
        "คลาสกลุ่มปฏิเสธผ่านระบบกลุ่ม (ใช้ปุ่ม “ไม่อนุมัติ” ในกล่องรอตรวจสอบ)",
      );
    }
    if (booking.status !== "requested") {
      throw new BadRequestException(
        "ปฏิเสธได้เฉพาะคำขอที่ยังไม่ได้รับงานเท่านั้น",
      );
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "rejected" },
      include: BOOKING_DTO_INCLUDE,
    });
    this.logger.log(
      JSON.stringify({
        event: "booking_rejected_by_tutor",
        bookingId: updated.id,
        tutorId: updated.tutorId,
        studentId: updated.studentId,
        tutorUserId: user.id,
        scheduledAt: updated.scheduledAt.toISOString(),
      }),
    );
    // FR-CM-08: tell the student their request was declined.
    await this.notifications.notify({
      userId: updated.studentId,
      type: "booking_rejected",
      title: "คำขอจองถูกปฏิเสธ",
      body: `${updated.tutor.user.displayName} ปฏิเสธคำขอจอง "${updated.subject}"`,
      actionUrl: "/bookings",
      sourceType: "booking",
      sourceId: updated.id,
    });
    this.fanoutBookingChange(updated);
    return decorateBooking(updated, "tutor");
  }

  async accept(supabaseId: string, bookingId: string) {
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.tutor.userId !== user.id) throw new ForbiddenException();
    if (booking.status !== "requested") {
      throw new BadRequestException("Booking is not in requested state");
    }
    // FR-TH-18 rev3: groups go through approveGroup() — accepting one here
    // would flip status to "accepted" without stamping tutorApprovedAt,
    // leaving the host's Pay button permanently hidden.
    if (booking.sessionType === "group") {
      throw new BadRequestException(
        "ใช้ /bookings/group-pending เพื่ออนุมัติคลาสกลุ่ม",
      );
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "accepted" },
      include: BOOKING_DTO_INCLUDE,
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
    // FR-CM-08: tell the student to upload a slip — accept doesn't itself
    // collect payment.
    await this.notifications.notify({
      userId: updated.studentId,
      type: "booking_accepted",
      title: "คำขอจองได้รับการอนุมัติ",
      body: `${updated.tutor.user.displayName} ตอบรับคลาส "${updated.subject}" แล้ว — โอนเงินเพื่อยืนยันการจอง`,
      actionUrl: "/bookings",
      sourceType: "booking",
      sourceId: updated.id,
    });
    this.fanoutBookingChange(updated);
    return decorateBooking(updated, "tutor");
  }

  /**
   * Tutor presses "ปิดคลาส" after the scheduled session ends. Sets
   * `Booking.sessionEndedAt = now()` so the student review form unlocks
   * immediately (TutorsService.createReview now accepts either
   * status=completed OR sessionEndedAt!=null). Idempotent — calling
   * twice keeps the first timestamp. Escrow timing (FR-PM-05) is
   * untouched; the daily release-for-payout cron still owns money.
   */
  async endSession(supabaseId: string, bookingId: string) {
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: { select: { userId: true } } },
    });
    if (!booking) throw new NotFoundException();
    if (booking.tutor.userId !== user.id) {
      throw new ForbiddenException("Only the tutor can end a session");
    }
    if (booking.status !== "paid" && booking.status !== "completed") {
      throw new BadRequestException(
        "Session can only be ended on a paid or completed booking",
      );
    }
    const sessionEnd =
      booking.scheduledAt.getTime() + booking.durationMinutes * 60_000;
    if (sessionEnd > Date.now()) {
      throw new BadRequestException(
        "ยังไม่สามารถปิดคลาสได้ — รอจนคลาสจบก่อน",
      );
    }
    // Idempotent: if already closed, just return the current row.
    if (booking.sessionEndedAt) {
      const current = await this.prisma.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: BOOKING_DTO_INCLUDE,
      });
      return decorateBooking(current, "tutor");
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { sessionEndedAt: new Date() },
      include: BOOKING_DTO_INCLUDE,
    });
    this.logger.log(
      JSON.stringify({
        event: "booking_session_ended",
        bookingId: updated.id,
        tutorId: updated.tutorId,
        studentId: updated.studentId,
        sessionEndedAt: updated.sessionEndedAt?.toISOString(),
      }),
    );
    // FR-CM-08: nudge the student to leave a review now that it's unlocked.
    await this.notifications.notify({
      userId: updated.studentId,
      type: "booking_meeting_ready", // closest existing type until we add one
      title: "ติวเตอร์ปิดคลาสแล้ว",
      body: `รีวิวคลาส "${updated.subject}" ของพี่ ${updated.tutor.user.displayName} ได้เลย`,
      actionUrl: "/bookings",
      sourceType: "booking",
      sourceId: updated.id,
    });
    this.fanoutBookingChange(updated);
    return decorateBooking(updated, "tutor");
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
    const user = await requireUserBySupabaseId(this.prisma, supabaseId);
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
