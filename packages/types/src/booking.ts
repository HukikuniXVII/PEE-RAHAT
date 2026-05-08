import type { Subject } from "./tutor";

export type BookingStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "expired"
  | "paid"
  | "completed"
  | "reported"
  | "refunded"
  | "cancelled";

export interface Booking {
  id: string;
  studentId: string;
  tutorId: string;
  subject: Subject;
  status: BookingStatus;
  scheduledAt: string;
  durationMinutes: number;
  amountThb: number;
  acceptDeadlineAt: string;
  reportWindowEndsAt?: string;
  createdAt: string;
}

export interface CreateBookingDto {
  tutorId: string;
  subject: Subject;
  scheduledAt: string;
  durationMinutes: number;
}
