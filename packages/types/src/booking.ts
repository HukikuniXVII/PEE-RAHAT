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
]);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export interface Booking {
  id: string;
  studentId: string;
  tutorId: string;
  subject: z.infer<typeof subjectSchema>;
  status: BookingStatus;
  scheduledAt: string;
  durationMinutes: number;
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
  createdAt: string;
}

export const createBookingSchema = z.object({
  tutorId: z.string().min(1),
  subject: subjectSchema,
  scheduledAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "Invalid datetime",
    }),
  durationMinutes: z.number().int().min(30).max(240),
});

export type CreateBookingDto = z.infer<typeof createBookingSchema>;

export const bookingReportSchema = z.object({
  reason: z.string().min(1),
  details: z.string().min(1).max(2000),
});

export type BookingReportDto = z.infer<typeof bookingReportSchema>;
