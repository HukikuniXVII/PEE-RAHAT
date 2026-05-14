import { z } from "zod";

// ── Enums (mirror Prisma, frontend-safe string unions) ────────────────────
export type PostponeInitiator = "student" | "tutor";
export type PostponeStatus = "negotiating" | "agreed" | "expired";
export type PostponeOutcome =
  | "agreed"
  | "no_agreement"
  | "unresponsive"
  | "tutor_initiated_no_agreement";

// ── DTOs (FR-TH-10..12) ───────────────────────────────────────────────────
export const postponeRequestSchema = z.object({
  reason: z.string().min(5).max(500),
});
export type PostponeRequestDto = z.infer<typeof postponeRequestSchema>;

export const proposeSlotSchema = z.object({
  scheduledAt: z.string().datetime(),
  durationMinutes: z.union([
    z.literal(30),
    z.literal(60),
    z.literal(90),
    z.literal(120),
  ]),
});
export type ProposeSlotDto = z.infer<typeof proposeSlotSchema>;

// ── Embedded shape on a Booking when an active negotiation exists ─────────
export interface PostponeRequest {
  id: string;
  initiatorRole: PostponeInitiator;
  reason: string;
  chatExpiresAt: string;
  status: PostponeStatus;
  proposedAt?: string;
  proposedDuration?: 30 | 60 | 90 | 120;
  wasShortNotice: boolean;
  createdAt: string;
}

// ── Response from POST /bookings/:id/postpone ─────────────────────────────
export interface PostponeOpenResult {
  requestId: string;
  threadId: string;
  chatExpiresAt: string;
}

export interface PostponeConfirmResult {
  newBookingId: string;
}
