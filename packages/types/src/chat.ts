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

export interface ChatMessage {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  redacted: boolean;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  studentId: string;
  tutorId: string;
  bookingId?: string;
  lastMessagePreview: string;
  lastMessageAt: string;
}

export interface SendMessageDto {
  threadId: string;
  body: string;
}
