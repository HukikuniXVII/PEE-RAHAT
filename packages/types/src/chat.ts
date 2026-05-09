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
  createdAt: string;
}

export interface ChatThreadCounterparty {
  displayName: string;
  avatarUrl?: string;
  role: "student" | "tutor";
  /** Set when the counterparty is a tutor — lets the threads list link to /chat/[tutorId]. */
  tutorId?: string;
}

export interface ChatThread {
  id: string;
  studentId: string;
  tutorId: string;
  bookingId?: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  counterparty: ChatThreadCounterparty;
}

export const sendMessageSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
