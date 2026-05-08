import { Injectable } from "@nestjs/common";
import { BYPASS_KEYWORDS, TEN_DIGIT_REGEX } from "@peerahat/types";

export interface FilterResult {
  body: string;
  redacted: boolean;
}

@Injectable()
export class BypassFilterService {
  /**
   * Server-authoritative enforcement of FR-PM-08.
   * Redacts contact-bypass attempts before persisting chat messages.
   */
  filter(text: string): FilterResult {
    let redacted = false;
    let body = text;
    for (const re of BYPASS_KEYWORDS) {
      if (re.test(body)) {
        body = body.replace(re, "[REDACTED]");
        redacted = true;
      }
    }
    if (TEN_DIGIT_REGEX.test(body)) {
      body = body.replace(TEN_DIGIT_REGEX, "[CONTACT REDACTED]");
      redacted = true;
    }
    return { body, redacted };
  }
}
