/**
 * Anti-bypass chat filter for Phase 1.
 * Blocks "Line", "ไอจี", "เบอร์โทร", and any 10-digit number sequence.
 */

const BLOCKED_KEYWORDS = [/line/i, /ไอจี/i, /เบอร์โทร/i, /ig/i, /instagram/i, /facebook/i, /fb/i];
const TEN_DIGIT_REGEX = /\d{10}/;

export function filterMessage(text: string): { filteredText: string; isBlocked: boolean } {
  let isBlocked = false;
  let filteredText = text;

  // Check keywords
  for (const regex of BLOCKED_KEYWORDS) {
    if (regex.test(text)) {
      isBlocked = true;
      filteredText = filteredText.replace(regex, '[REDACTED]');
    }
  }

  // Check 10-digit numbers
  if (TEN_DIGIT_REGEX.test(text)) {
    isBlocked = true;
    filteredText = filteredText.replace(TEN_DIGIT_REGEX, '[CONTACT REDACTED]');
  }

  return { filteredText, isBlocked };
}

export const BYPASS_WARNING = 'การแลกเปลี่ยนช่องทางติดต่อภายนอกอาจทำให้คุณไม่ได้รับความคุ้มครองจากระบบ Escrow ของเรา';
