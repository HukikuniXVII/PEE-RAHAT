import { Injectable } from "@nestjs/common";
import type { ReportCategory, ReportPriority, ReportTarget } from "@peerahat/types";

/**
 * Auto-priority + SLA computation for the report system (FR-CM-05 /
 * FR-SM-07 / FR-PM-05).
 *
 * Rules (a serial false-reporter downgrade overrides everything else):
 *   - category ∈ {scam, fraud, payment_issue}            → urgent
 *   - category ∈ {abuse, harassment} AND reporter <18    → urgent
 *   - booking target, status `paid`, class within 24h    → high
 *   - reporter falseReportCount ≥ 3                       → low (downgrade)
 *   - otherwise                                          → normal
 *
 * SLA windows are read from REPORT_SLA_*_HOURS env (validated at startup).
 */

const FALSE_REPORT_DOWNGRADE_THRESHOLD = 3;
const BOOKING_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const URGENT_CATEGORIES = new Set<ReportCategory>([
  "scam",
  "fraud",
  "payment_issue",
]);
const MINOR_SENSITIVE_CATEGORIES = new Set<ReportCategory>([
  "abuse",
  "harassment",
]);

export interface ComputePriorityInput {
  reporter: {
    falseReportCount: number;
    /** Whether the reporter is under 18 — drives the abuse/harassment
     *  escalation. Determined by the caller. */
    isMinor: boolean;
  };
  category: ReportCategory;
  target: {
    type: ReportTarget;
    /** Booking targets only — the booking's status + scheduled time. */
    bookingStatus?: string | null;
    bookingScheduledAt?: Date | null;
  };
  /** Defaults to `new Date()`; injectable for deterministic tests. */
  now?: Date;
}

export interface ComputePriorityResult {
  priority: ReportPriority;
  slaDeadline: Date;
}

/** Parse a positive-number SLA-hours env var, falling back to a default. */
function readSlaHours(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return n;
}

@Injectable()
export class ReportPriorityService {
  private readonly slaHours: Record<ReportPriority, number>;

  constructor() {
    this.slaHours = {
      urgent: readSlaHours("REPORT_SLA_URGENT_HOURS", 4),
      high: readSlaHours("REPORT_SLA_HIGH_HOURS", 12),
      normal: readSlaHours("REPORT_SLA_NORMAL_HOURS", 48),
      low: readSlaHours("REPORT_SLA_LOW_HOURS", 72),
    };
  }

  /** Compute the auto-priority and SLA deadline for a new report. */
  compute(input: ComputePriorityInput): ComputePriorityResult {
    const now = input.now ?? new Date();
    const priority = this.resolvePriority(input, now);
    const slaDeadline = new Date(
      now.getTime() + this.slaHours[priority] * HOUR_MS,
    );
    return { priority, slaDeadline };
  }

  private resolvePriority(
    input: ComputePriorityInput,
    now: Date,
  ): ReportPriority {
    const { reporter, category, target } = input;

    // Anti-abuse: a serial false-reporter's reports are deprioritized.
    // This overrides any category- or target-based urgency below.
    if (reporter.falseReportCount >= FALSE_REPORT_DOWNGRADE_THRESHOLD) {
      return "low";
    }

    if (URGENT_CATEGORIES.has(category)) return "urgent";

    if (MINOR_SENSITIVE_CATEGORIES.has(category) && reporter.isMinor) {
      return "urgent";
    }

    if (
      target.type === "booking" &&
      target.bookingStatus === "paid" &&
      target.bookingScheduledAt instanceof Date &&
      target.bookingScheduledAt.getTime() <
        now.getTime() + BOOKING_SOON_WINDOW_MS
    ) {
      return "high";
    }

    return "normal";
  }
}
