import { z } from "zod";

import type { PostponeRequest } from "./postpone";
import { subjectSchema } from "./tutor";

export const bookingStatusSchema = z.enum([
  "requested",
  "accepted",
  "rejected",
  "expired",
  "paid",
  "completed",
  "reported",
  "refunded",
  "cancelled",
  "postpone_pending",
  "postponed",
  "cancelled_no_agreement",
  "cancelled_tutor_unresponsive",
  "cancelled_tutor_initiated",
  // FR-TH-06: student cancelled from /bookings before payment.
  "cancelled_by_student",
]);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

// FR-TH-18: group session enums. Mirror the Prisma enums byte-for-byte so
// the DTO ↔ DB round-trip needs no string coercion.
export const sessionTypeSchema = z.enum(["one_on_one", "group"]);
export type SessionType = z.infer<typeof sessionTypeSchema>;

export const groupStatusSchema = z.enum([
  "forming",
  "tutor_review",
  "confirmed",
  "failed",
]);
export type GroupStatus = z.infer<typeof groupStatusSchema>;

export const participantRoleSchema = z.enum(["host", "invited"]);
export type ParticipantRole = z.infer<typeof participantRoleSchema>;

export const participantStatusSchema = z.enum([
  "invited",
  "accepted",
  "declined",
  "paid",
  "expired",
]);
export type ParticipantStatus = z.infer<typeof participantStatusSchema>;

// FR-TH-18: group capacity bounds. Spec is 2-10 inclusive; 1 means 1-on-1
// and is represented by sessionType="one_on_one" with capacity=1.
export const GROUP_MIN_CAPACITY = 2;
export const GROUP_MAX_CAPACITY = 10;

export interface Booking {
  id: string;
  studentId: string;
  tutorId: string;
  /** Hydrated counterparty info — saves the UI an extra round-trip just
   *  to show whose booking this is. Both sides are populated regardless
   *  of viewerSide; the row component picks whichever is "the other". */
  studentDisplayName: string;
  studentAvatarUrl?: string;
  tutorDisplayName: string;
  tutorAvatarUrl?: string;
  subject: z.infer<typeof subjectSchema>;
  status: BookingStatus;
  scheduledAt: string;
  durationMinutes: number;
  /** Per-seat price. For group bookings each participant pays this amount. */
  amountThb: number;
  acceptDeadlineAt: string;
  reportWindowEndsAt?: string;
  hasReview: boolean;
  /** Which side of the booking the calling user is on. */
  viewerSide: "student" | "tutor";
  /** Set when an active postpone negotiation exists (FR-TH-10..12). */
  postponeRequest?: PostponeRequest;
  /** Resolved chat-thread id for this booking pair, if any. */
  chatThreadId?: string;
  /** FR-TH-17: Google Meet URL, generated inline at payment-confirm. */
  meetingUrl?: string;
  /** FR-TH-17: when the Meet link was minted. */
  meetingGeneratedAt?: string;
  // FR-TH-18: group session fields. one_on_one bookings keep the defaults
  // (sessionType=one_on_one, capacity=1, every group-only field undefined)
  // so existing UI code that ignores these still renders correctly.
  sessionType: SessionType;
  capacity: number;
  groupStatus?: GroupStatus;
  /** 8-char Base32 share code; only the host + accepted invitees see this. */
  inviteCode?: string;
  /** UTC ISO. Past this point the forming group fails and refunds. */
  inviteExpiresAt?: string;
  /** Optional — only populated when the consumer requested participants. */
  participants?: BookingParticipant[];
  createdAt: string;
}

// FR-TH-18: one row per seat. For 1-on-1 bookings the host's row is the
// only one; for group bookings the host is joined by 1-9 invited rows.
export interface BookingParticipant {
  id: string;
  bookingId: string;
  studentId: string;
  /** Public display info hydrated by the service — avoids extra round-trips
   *  from the UI. studentEmail is host- and tutor-visible only. */
  displayName: string;
  avatarUrl?: string;
  /** Only included for the host and tutor in API responses. */
  email?: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  invitedAt: string;
  acceptedAt?: string;
  paidAt?: string;
}

export const createBookingSchema = z
  .object({
    tutorId: z.string().min(1),
    subject: subjectSchema,
    scheduledAt: z
      .string()
      .min(1)
      .refine((v) => !Number.isNaN(Date.parse(v)), {
        message: "Invalid datetime",
      }),
    // New-booking durations: 30-min was dropped from the booking flow; the
    // postpone propose path keeps it via proposeSlotSchema.
    durationMinutes: z.union([
      z.literal(60),
      z.literal(90),
      z.literal(120),
    ]),
    // FR-TH-18: optional so existing 1-on-1 clients stay valid. When omitted
    // the service defaults to one_on_one + capacity=1.
    sessionType: sessionTypeSchema.optional(),
    capacity: z.number().int().min(1).max(GROUP_MAX_CAPACITY).optional(),
  })
  .superRefine((value, ctx) => {
    const sessionType = value.sessionType ?? "one_on_one";
    const capacity = value.capacity ?? (sessionType === "group" ? GROUP_MIN_CAPACITY : 1);
    if (sessionType === "one_on_one" && capacity !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "1-on-1 bookings must have capacity 1",
        path: ["capacity"],
      });
    }
    if (
      sessionType === "group" &&
      (capacity < GROUP_MIN_CAPACITY || capacity > GROUP_MAX_CAPACITY)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Group capacity must be between ${GROUP_MIN_CAPACITY} and ${GROUP_MAX_CAPACITY}`,
        path: ["capacity"],
      });
    }
  });

export type CreateBookingDto = z.infer<typeof createBookingSchema>;
export type BookingDurationMinutes = NonNullable<
  CreateBookingDto["durationMinutes"]
>;

// FR-TH-18: host invites by email. Emails are lower-cased + de-duplicated
// by the service; this schema only enforces shape + per-call quota.
export const inviteParticipantsSchema = z.object({
  emails: z
    .array(z.string().trim().email())
    .min(1, "ระบุอีเมลอย่างน้อย 1 อีเมล")
    .max(GROUP_MAX_CAPACITY - 1),
});
export type InviteParticipantsDto = z.infer<typeof inviteParticipantsSchema>;

// FR-TH-18: invitee can decline with an optional reason that lands in the
// host's notification. No reason = silent decline.
export const declineInviteSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type DeclineInviteDto = z.infer<typeof declineInviteSchema>;

// FR-TH-18: tutor must give a reason on reject so the host (and the
// refunded invitees, later) can see why the group fell through.
export const tutorRejectGroupSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type TutorRejectGroupDto = z.infer<typeof tutorRejectGroupSchema>;

// FR-TH-18: public landing payload for GET /invites/:code. Intentionally
// thin — no PII beyond the host's display name + the class details the
// invitee needs to decide.
export interface InviteSummaryDto {
  inviteCode: string;
  bookingId: string;
  groupStatus: GroupStatus;
  scheduledAt: string;
  durationMinutes: number;
  amountThb: number;
  subject: z.infer<typeof subjectSchema>;
  capacity: number;
  acceptedCount: number;
  inviteExpiresAt: string;
  host: {
    displayName: string;
    avatarUrl?: string;
  };
  tutor: {
    tutorId: string;
    displayName: string;
    avatarUrl?: string;
    university: string;
    faculty: string;
  };
}

export const bookingReportSchema = z.object({
  reason: z.string().min(1),
  details: z.string().min(1).max(2000),
});

export type BookingReportDto = z.infer<typeof bookingReportSchema>;

/** Half-open interval [start, end) — used by /tutors/:id/availability and
 *  /bookings/mine/busy so the picker can grey out conflicting 30-min cells. */
export interface BusySlot {
  start: string;
  end: string;
}

export interface AvailabilityResult {
  busy: BusySlot[];
}

/** Body returned by 409 when assertNoOverlap rejects a create/propose/confirm. */
export interface BookingOverlapError {
  code: "BOOKING_OVERLAP";
  conflictingBookingId: string;
  conflictingScheduledAt: string;
}
