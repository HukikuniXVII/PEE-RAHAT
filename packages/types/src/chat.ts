import { z } from "zod";

/**
 * Anti-bypass filter (FR-PM-08).
 * Authoritative enforcement happens server-side in apps/api.
 * The client uses the same patterns only to give an inline warning before send.
 */
export const BYPASS_KEYWORDS = [
  /line/i,
  /ไอจี/i,
  /เบอร์โทร/i,
  /\big\b/i,
  /instagram/i,
  /facebook/i,
  /\bfb\b/i,
  /whatsapp/i,
  /telegram/i,
  /discord/i,
] as const;

export const TEN_DIGIT_REGEX = /\d{10}/;

export function detectBypassAttempt(body: string): boolean {
  if (TEN_DIGIT_REGEX.test(body)) return true;
  return BYPASS_KEYWORDS.some((re) => re.test(body));
}

export interface ChatMessage {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  redacted: boolean;
  /** "system" marks resolution messages (FR-TH-12); default "user". */
  kind?: "user" | "system";
  createdAt: string;
}

export interface ChatThreadCounterparty {
  displayName: string;
  avatarUrl?: string;
  role: "student" | "tutor";
  /** Set when the counterparty is a tutor — lets the threads list link to /chat/[tutorId]. */
  tutorId?: string;
  /** Free-form subtitle (e.g. "Faculty • University" for tutor counterparties). */
  subtitle?: string;
  /** V2 chat redesign: KYC-verified tutor flag for the verified checkmark
   *  next to the name. Derived from `TutorProfile.isVerified` server-side.
   *  Always false when role === "student". */
  verified?: boolean;
}

// FR-TH-18: group chat threads have no canonical "counterparty" — render
// the members list from `participants` instead. 1-on-1 threads keep using
// the single `counterparty` summary.
export interface ChatThreadParticipantSummary {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: "student" | "tutor";
}

export interface ChatThread {
  id: string;
  /** Null for group threads (FR-TH-18). Always set for 1-on-1. */
  studentId: string | null;
  tutorId: string;
  bookingId?: string;
  /** FR-TH-18: "one_on_one" | "group". Defaults to "one_on_one" so existing
   *  client code that ignores the field treats every thread as 1-on-1. */
  sessionType?: "one_on_one" | "group";
  lastMessagePreview: string;
  lastMessageAt: string;
  counterparty: ChatThreadCounterparty;
  /** Populated for group threads (FR-TH-18). Omitted for 1-on-1. */
  participants?: ChatThreadParticipantSummary[];
  /** The User.id of the calling viewer — lets the client align bubbles without knowing the role. */
  viewerUserId: string;
  /** Messages newer than the viewer's last-read timestamp, excluding their own messages. */
  unreadCount: number;
  /** Set when a postpone negotiation finalized (FR-TH-12) — hides the composer. */
  closedAt?: string;
  /** V2 chat redesign: optional joined-booking summary for the thread-row
   *  badge ("● จองแล้ว"/"● รอตอบ"/"● เสร็จแล้ว") + booked date + subject
   *  shown under the preview. Computed server-side from the linked
   *  Booking row (+ active PostponeRequest for "proposed"). Omitted when
   *  the thread has no associated booking. */
  bookingSummary?: ChatThreadBookingSummary;
}

export interface ChatThreadBookingSummary {
  /** Maps to the thread-list pill states from the handoff. "proposed" is
   *  the special case set when an active PostponeRequest exists for the
   *  booking; the booking's real status is something else. */
  status: "proposed" | "paid" | "completed" | "other";
  scheduledAt: string;   // ISO; UI formats as "25 พ.ค." / "25 พ.ค. 19:00"
  subject: string;
}

/** V2 chat redesign: booking-proposal card rendered inline in the
 *  conversation between two messages. Synthesized client-side from the
 *  thread's active PostponeRequest — not stored as a ChatMessage.
 *  Returned by GET /chat/threads/:id/proposal; null when no active
 *  proposal exists. */
export interface ChatBookingProposal {
  id: string;             // PostponeRequest.id
  fromUserId: string;
  fromDisplayName: string;
  /** Proposed start time (PostponeRequest.proposedAt). Null until the
   *  initiator submits an actual slot — pre-propose state still shows the
   *  card but with "รอเสนอเวลา" instead of a date. */
  proposedAt: string | null;
  durationMinutes: number;
  subject: string;        // from the linked Booking
  note: string;           // PostponeRequest.reason
  status: "negotiating" | "accepted" | "rejected" | "expired";
}

export const sendMessageSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
