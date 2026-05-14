import { Injectable, Logger } from "@nestjs/common";

import type { PostponeInitiator, PostponeOutcome } from "@prisma/client";

export interface RefundPolicyInput {
  initiator: PostponeInitiator;
  wasShortNotice: boolean;
  outcome: PostponeOutcome;
  amountThb: number;
}

export interface RefundSplit {
  tutorThb: number;
  platformThb: number;
  studentRefundThb: number;
}

const DEFAULT_TUTOR_CUT_SHORT_NOTICE = 50;
const DEFAULT_PLATFORM_FEE_SHORT_NOTICE = 10;

@Injectable()
export class RefundPolicyService {
  private readonly logger = new Logger(RefundPolicyService.name);
  private readonly tutorCutShortNotice: number;
  private readonly platformFeeShortNotice: number;

  constructor() {
    this.tutorCutShortNotice = readPct(
      "POSTPONE_TUTOR_CUT_SHORT_NOTICE",
      DEFAULT_TUTOR_CUT_SHORT_NOTICE,
    );
    this.platformFeeShortNotice = readPct(
      "POSTPONE_PLATFORM_FEE_SHORT_NOTICE",
      DEFAULT_PLATFORM_FEE_SHORT_NOTICE,
    );

    if (this.tutorCutShortNotice + this.platformFeeShortNotice > 100) {
      throw new Error(
        `Postpone refund split misconfigured: POSTPONE_TUTOR_CUT_SHORT_NOTICE (${this.tutorCutShortNotice}) + POSTPONE_PLATFORM_FEE_SHORT_NOTICE (${this.platformFeeShortNotice}) exceeds 100%`,
      );
    }

    this.logger.log(
      `Short-notice split: tutor ${this.tutorCutShortNotice}% / platform ${this.platformFeeShortNotice}% / student ${
        100 - this.tutorCutShortNotice - this.platformFeeShortNotice
      }%`,
    );
  }

  computeSplit(input: RefundPolicyInput): RefundSplit {
    const { initiator, wasShortNotice, outcome, amountThb } = input;

    if (!Number.isInteger(amountThb) || amountThb < 0) {
      throw new Error(`amountThb must be a non-negative integer, got ${amountThb}`);
    }

    // Case D: agreed — no money moves. Tutor keeps the full escrow against the
    // new (cloned) booking; caller re-links the PaymentIntent.
    if (outcome === "agreed") {
      return { tutorThb: amountThb, platformThb: 0, studentRefundThb: 0 };
    }

    // Case B: tutor unresponsive (always student-initiated, >12h notice).
    if (outcome === "unresponsive") {
      return { tutorThb: 0, platformThb: 0, studentRefundThb: amountThb };
    }

    // Case C: tutor-initiated, student declines/silent.
    if (outcome === "tutor_initiated_no_agreement") {
      return { tutorThb: 0, platformThb: 0, studentRefundThb: amountThb };
    }

    // Case A: short-notice student-initiated no-agreement → 50/10/40 by default.
    if (
      outcome === "no_agreement" &&
      initiator === "student" &&
      wasShortNotice
    ) {
      const tutor = Math.round((amountThb * this.tutorCutShortNotice) / 100);
      const platform = Math.round((amountThb * this.platformFeeShortNotice) / 100);
      const refund = amountThb - tutor - platform;
      return { tutorThb: tutor, platformThb: platform, studentRefundThb: refund };
    }

    // Student-initiated no_agreement at >12h should have been re-classified
    // as "unresponsive" by the worker before reaching this method; if any
    // other shape lands here, prefer the student-protective outcome.
    return { tutorThb: 0, platformThb: 0, studentRefundThb: amountThb };
  }
}

function readPct(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error(`Env ${key}=${raw} must be a number between 0 and 100`);
  }
  return n;
}
