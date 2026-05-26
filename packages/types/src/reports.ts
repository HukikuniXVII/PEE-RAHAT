import { z } from "zod";

/**
 * Report system (FR-CM-05 / FR-SM-07 / FR-PM-05).
 *
 * Polymorphic moderation reports across booking / chat / sheet / review /
 * community-post targets. A reporter files; the resolved target owner is
 * notified WITHOUT the reporter's identity; an admin manually reviews and
 * resolves. Nothing is automatic except priority/SLA computation, rate
 * limits, and the chat-bypass category nudge.
 *
 * Mirrors the Prisma enums in apps/api/prisma/schema.prisma 1:1.
 */

// ─── Enums ─────────────────────────────────────────────────────────────────

export const reportTargetSchema = z.enum([
  "booking",
  "chat_message",
  "sheet",
  "review",
  "community_post",
]);
export type ReportTarget = z.infer<typeof reportTargetSchema>;

export const reportCategorySchema = z.enum([
  "no_show",
  "fraud",
  "abuse",
  "harassment",
  "scam",
  "off_platform_solicitation",
  "fake_credentials",
  "impersonation",
  "inappropriate_content",
  "pirated_content",
  "quality_issue",
  "payment_issue",
  "spam",
  "misinformation",
  "other",
]);
export type ReportCategory = z.infer<typeof reportCategorySchema>;

export const reportStatusSchema = z.enum([
  "pending",
  "under_review",
  "escalated",
  "resolved",
  "rejected",
  "duplicate",
]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

/**
 * Terminal statuses for a report — no further state changes expected.
 * Centralised so the admin queue's `notIn`, the resolution-guard's
 * "already closed" check, and the overdue flag all agree on the set.
 */
export const REPORT_CLOSED_STATUSES: readonly ReportStatus[] = [
  "resolved",
  "rejected",
  "duplicate",
];

export const reportPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type ReportPriority = z.infer<typeof reportPrioritySchema>;

export const reportResolutionSchema = z.enum([
  "no_action",
  "warning_issued",
  "suspension_temp",
  "suspension_perm",
  "refund_partial",
  "refund_full",
  "content_removed",
  "account_banned",
  "reporter_warned",
]);
export type ReportResolution = z.infer<typeof reportResolutionSchema>;

export const reportEventKindSchema = z.enum([
  "reporter_comment",
  "admin_note",
  "status_change",
  "assignment",
  "resolution",
]);
export type ReportEventKind = z.infer<typeof reportEventKindSchema>;

export const notificationTypeSchema = z.enum([
  "report_filed",
  "report_under_review",
  "report_resolved",
  "report_warning",
  "report_suspension",
  "report_content_removed",
  "report_reporter_warned",
  "report_sla_overdue",
  // FR-TH-18 — group session lifecycle. host & invitee & tutor see these
  // in their in-app notification feed; the in-app deep link points back
  // at the booking or /invite/{code} as appropriate.
  "group_invite_responded",
  "group_ready_for_review",
  "group_decision",
  "group_status_changed",
  // FR-CM-08 — canonical types for the rewritten notification system.
  // New code should prefer these names; the report_* / group_* values
  // above stay for backwards compatibility with old rows + callers.
  "booking_requested",
  "booking_accepted",
  "booking_rejected",
  "booking_paid",
  "booking_meeting_ready",
  "booking_starting_soon",
  "group_invite",
  "group_approval_needed",
  "group_confirmed",
  "group_failed",
  "payment_verified",
  "payment_failed",
  "payout_processed",
  "postpone_requested",
  "postpone_proposal",
  "postpone_agreed",
  "postpone_expired",
  "report_received",
  "review_received",
  "chat_new_message",
  "account_warning",
  "account_suspended",
  "kyc_approved",
  "kyc_rejected",
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

// FR-CM-08 — every NotificationType maps to exactly one category, used
// by the settings accordion to group the per-type preference toggles
// and by the notification panel to render a category-appropriate icon.
export const notificationCategorySchema = z.enum([
  "bookings",
  "payments",
  "chat",
  "reports",
  "reviews",
  "account",
  "system",
]);
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;

/**
 * FR-CM-08 — static map every NotificationType → category. Used by
 * NotificationsService.notify() so callers don't have to remember to
 * pass a category arg, and by the settings UI to group toggles into
 * accordion sections. Legacy report_* and group_* values are slotted
 * into "reports" and "bookings" respectively.
 */
export const NOTIFICATION_CATEGORY_BY_TYPE: Record<
  NotificationType,
  NotificationCategory
> = {
  // Legacy report system → reports
  report_filed: "reports",
  report_under_review: "reports",
  report_resolved: "reports",
  report_warning: "reports",
  report_suspension: "reports",
  report_content_removed: "reports",
  report_reporter_warned: "reports",
  report_sla_overdue: "reports",
  // Legacy group session lifecycle → bookings
  group_invite_responded: "bookings",
  group_ready_for_review: "bookings",
  group_decision: "bookings",
  group_status_changed: "bookings",
  // FR-CM-08 canonical buckets
  booking_requested: "bookings",
  booking_accepted: "bookings",
  booking_rejected: "bookings",
  booking_paid: "bookings",
  booking_meeting_ready: "bookings",
  booking_starting_soon: "bookings",
  group_invite: "bookings",
  group_approval_needed: "bookings",
  group_confirmed: "bookings",
  group_failed: "bookings",
  payment_verified: "payments",
  payment_failed: "payments",
  payout_processed: "payments",
  postpone_requested: "bookings",
  postpone_proposal: "bookings",
  postpone_agreed: "bookings",
  postpone_expired: "bookings",
  report_received: "reports",
  review_received: "reviews",
  chat_new_message: "chat",
  account_warning: "account",
  account_suspended: "account",
  kyc_approved: "account",
  kyc_rejected: "account",
};

// ─── Category filtering by target type ─────────────────────────────────────
// The ReportDialog category dropdown is filtered by targetType; the server
// re-validates the pair in createReportSchema so a crafted request can't
// file e.g. `pirated_content` against a booking.

export const CATEGORIES_BY_TARGET: Record<
  ReportTarget,
  readonly ReportCategory[]
> = {
  booking: [
    "no_show",
    "quality_issue",
    "payment_issue",
    "fraud",
    "inappropriate_content",
    "other",
  ],
  chat_message: [
    "off_platform_solicitation",
    "scam",
    "abuse",
    "harassment",
    "spam",
    "other",
  ],
  sheet: [
    "pirated_content",
    "misinformation",
    "inappropriate_content",
    "spam",
    "other",
  ],
  review: ["harassment", "misinformation", "fake_credentials", "spam", "other"],
  community_post: [
    "spam",
    "abuse",
    "misinformation",
    "inappropriate_content",
    "other",
  ],
};

// ─── Thai display labels (user-facing copy) ────────────────────────────────

export const REPORT_TARGET_LABELS: Record<ReportTarget, string> = {
  booking: "การจองเรียน",
  chat_message: "ข้อความแชท",
  sheet: "ชีทสรุป",
  review: "รีวิว",
  community_post: "โพสต์ในคอมมูนิตี้",
};

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  no_show: "ไม่มาสอน / ไม่มาเรียน",
  fraud: "ฉ้อโกง",
  abuse: "พฤติกรรมไม่เหมาะสม",
  harassment: "คุกคาม",
  scam: "หลอกลวง",
  off_platform_solicitation: "ชักชวนออกนอกแพลตฟอร์ม",
  fake_credentials: "คุณวุฒิปลอม",
  impersonation: "แอบอ้างเป็นผู้อื่น",
  inappropriate_content: "เนื้อหาไม่เหมาะสม",
  pirated_content: "ละเมิดลิขสิทธิ์",
  quality_issue: "ปัญหาคุณภาพการสอน",
  payment_issue: "ปัญหาการชำระเงิน",
  spam: "สแปม",
  misinformation: "ข้อมูลเป็นเท็จ",
  other: "อื่น ๆ",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "รอตรวจสอบ",
  under_review: "กำลังตรวจสอบ",
  escalated: "ยกระดับความสำคัญ",
  resolved: "ดำเนินการแล้ว",
  rejected: "ปฏิเสธ",
  duplicate: "รายงานซ้ำ",
};

export const REPORT_PRIORITY_LABELS: Record<ReportPriority, string> = {
  low: "ต่ำ",
  normal: "ปกติ",
  high: "สูง",
  urgent: "เร่งด่วน",
};

export const REPORT_RESOLUTION_LABELS: Record<ReportResolution, string> = {
  no_action: "ไม่ดำเนินการ",
  warning_issued: "ออกคำเตือน",
  suspension_temp: "พักบัญชีชั่วคราว",
  suspension_perm: "พักบัญชีถาวร",
  refund_partial: "คืนเงินบางส่วน",
  refund_full: "คืนเงินเต็มจำนวน",
  content_removed: "ซ่อนเนื้อหา",
  account_banned: "แบนบัญชี",
  reporter_warned: "เตือนผู้รายงาน",
};

// ─── Constraints ───────────────────────────────────────────────────────────

export const REPORT_DESCRIPTION_MIN = 20;
export const REPORT_DESCRIPTION_MAX = 2000;
export const REPORT_MAX_EVIDENCE_FILES = 5;

const evidenceKeysSchema = z
  .array(z.string().min(1))
  .max(REPORT_MAX_EVIDENCE_FILES)
  .default([]);

// ─── User-facing input DTOs ────────────────────────────────────────────────

export const createReportSchema = z
  .object({
    targetType: reportTargetSchema,
    targetId: z.string().min(1),
    category: reportCategorySchema,
    description: z
      .string()
      .trim()
      .min(REPORT_DESCRIPTION_MIN)
      .max(REPORT_DESCRIPTION_MAX),
    evidenceKeys: evidenceKeysSchema,
  })
  .superRefine((val, ctx) => {
    if (!CATEGORIES_BY_TARGET[val.targetType].includes(val.category)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "หมวดหมู่ไม่ถูกต้องสำหรับสิ่งที่รายงาน",
      });
    }
  });
export type CreateReportDto = z.infer<typeof createReportSchema>;

export const addReportCommentSchema = z.object({
  text: z.string().trim().min(1).max(REPORT_DESCRIPTION_MAX),
  evidenceKeys: evidenceKeysSchema,
});
export type AddReportCommentDto = z.infer<typeof addReportCommentSchema>;

// ─── Admin input DTOs ──────────────────────────────────────────────────────

export const assignReportSchema = z.object({
  adminId: z.string().min(1),
});
export type AssignReportDto = z.infer<typeof assignReportSchema>;

export const updateReportStatusSchema = z.object({
  status: reportStatusSchema,
  note: z.string().trim().max(REPORT_DESCRIPTION_MAX).optional(),
});
export type UpdateReportStatusDto = z.infer<typeof updateReportStatusSchema>;

/** Refund split percentages for a refund_partial booking-dispute resolution.
 *  Must sum to exactly 100. */
export const refundSplitSchema = z
  .object({
    studentPct: z.number().int().min(0).max(100),
    tutorPct: z.number().int().min(0).max(100),
    platformPct: z.number().int().min(0).max(100),
  })
  .refine((v) => v.studentPct + v.tutorPct + v.platformPct === 100, {
    message: "สัดส่วนเงินคืนต้องรวมกันได้ 100%",
    path: ["studentPct"],
  });
export type RefundSplitDto = z.infer<typeof refundSplitSchema>;

export const resolveReportSchema = z
  .object({
    resolution: reportResolutionSchema,
    resolutionNote: z.string().trim().min(1).max(REPORT_DESCRIPTION_MAX),
    publicResponse: z.string().trim().max(REPORT_DESCRIPTION_MAX).optional(),
    /** Required when resolution = refund_partial. */
    refundSplit: refundSplitSchema.optional(),
    /** Required when resolution = content_removed — shown to the content owner. */
    removedReason: z.string().trim().min(1).max(500).optional(),
    /** refund_full: whether the tutor is at fault (drives defectCount++). */
    tutorAtFault: z.boolean().optional(),
    /** suspension_temp: number of days (default 7, max 90). */
    suspensionDays: z.number().int().min(1).max(90).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.resolution === "refund_partial" && !val.refundSplit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["refundSplit"],
        message: "ต้องระบุสัดส่วนเงินคืน",
      });
    }
    if (val.resolution === "content_removed" && !val.removedReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["removedReason"],
        message: "ต้องระบุเหตุผลการซ่อนเนื้อหา",
      });
    }
  });
export type ResolveReportDto = z.infer<typeof resolveReportSchema>;

export const markDuplicateSchema = z.object({
  parentReportId: z.string().min(1),
});
export type MarkDuplicateDto = z.infer<typeof markDuplicateSchema>;

/** Free-form admin-only internal note on a report. */
export const addReportNoteSchema = z.object({
  text: z.string().trim().min(1).max(REPORT_DESCRIPTION_MAX),
});
export type AddReportNoteDto = z.infer<typeof addReportNoteSchema>;

// ─── Response shapes ───────────────────────────────────────────────────────

/** Returned by POST /reports. */
export interface CreateReportResult {
  id: string;
  status: ReportStatus;
  slaDeadline: string;
}

/** Returned by POST /reports/upload-evidence. */
export interface ReportEvidenceUploadResult {
  objectKey: string;
}

/** One entry in a report's activity log. `authorLabel` is a role label
 *  ("คุณ" / "แอดมิน") — never the reporter's name or identity. */
export interface ReportEventView {
  id: string;
  kind: ReportEventKind;
  authorLabel: string;
  text: string | null;
  evidenceUrls: string[];
  createdAt: string;
}

/** A row in the reporter's own "my reports" list. */
export interface ReportListItem {
  id: string;
  targetType: ReportTarget;
  category: ReportCategory;
  status: ReportStatus;
  slaDeadline: string;
  createdAt: string;
  resolvedAt: string | null;
}

/** Reporter-facing report detail. Admin-only internal notes are stripped
 *  server-side; `events` carries only timeline + the reporter's comments. */
export interface ReportDetail {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  category: ReportCategory;
  description: string;
  evidenceUrls: string[];
  status: ReportStatus;
  slaDeadline: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: ReportResolution | null;
  publicResponse: string | null;
  events: ReportEventView[];
  /** Whether the reporter may still add a follow-up comment
   *  (status pending / under_review). */
  canComment: boolean;
}

/** Reporter summary shown on admin surfaces. Never exposed to a target user. */
export interface AdminReportReporter {
  id: string;
  displayName: string;
  role: string;
  accountAgeDays: number;
  reportsFiled: number;
  falseReportCount: number;
  warningCount: number;
}

/** The resolved target owner — drives suspension display + the third-strike
 *  helper on chat-message reports. */
export interface AdminReportTargetUser {
  id: string;
  displayName: string;
  warningCount: number;
  suspendedUntil: string | null;
}

/** Typed target context for the admin detail right column. `kind: "missing"`
 *  means the target row no longer exists (deleted or a migrated stub). */
export type ReportTargetContext =
  | { kind: "missing" }
  | {
      kind: "booking";
      bookingId: string;
      subject: string;
      status: string;
      scheduledAt: string;
      amountThb: number;
      escrowStatus: string | null;
      tutorDefectCount: number;
      studentName: string;
      tutorName: string;
    }
  | {
      kind: "chat_message";
      messageId: string;
      bookingId: string | null;
      bypassMatch: boolean;
      thread: {
        id: string;
        authorLabel: string;
        body: string;
        createdAt: string;
        isReported: boolean;
      }[];
    }
  | {
      kind: "sheet";
      sheetId: string;
      title: string;
      subject: string;
      priceThb: number;
      salesCount: number;
      authorId: string;
      authorName: string;
      removed: boolean;
    }
  | {
      kind: "review";
      reviewId: string;
      rating: number;
      text: string;
      bookingId: string;
      studentName: string;
      tutorName: string;
      removed: boolean;
    }
  | {
      kind: "community_post";
      postId: string;
      title: string;
      content: string;
      authorId: string;
      authorName: string;
      removed: boolean;
    };

/** A row in the admin reports queue. */
export interface AdminReportQueueItem {
  id: string;
  targetType: ReportTarget;
  category: ReportCategory;
  priority: ReportPriority;
  status: ReportStatus;
  slaDeadline: string;
  overdue: boolean;
  description: string;
  reporter: AdminReportReporter;
  assignedToId: string | null;
  assignedToName: string | null;
  /** Chat-bypass regex hit — renders the "🚩 ระบบตรวจพบ: บายพาส" chip. */
  bypassFlagged: boolean;
  createdAt: string;
}

/** A related report against the same target. */
export interface RelatedReportItem {
  id: string;
  category: ReportCategory;
  status: ReportStatus;
  priority: ReportPriority;
  createdAt: string;
}

/** Full admin report detail. `events` includes admin-only internal notes. */
export interface AdminReportDetail {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  targetUserId: string | null;
  category: ReportCategory;
  description: string;
  evidenceUrls: string[];
  status: ReportStatus;
  priority: ReportPriority;
  slaDeadline: string;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolution: ReportResolution | null;
  resolutionNote: string | null;
  publicResponse: string | null;
  linkedBookingId: string | null;
  parentReportId: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  bypassFlagged: boolean;
  reporter: AdminReportReporter;
  targetUser: AdminReportTargetUser | null;
  targetContext: ReportTargetContext;
  events: ReportEventView[];
  related: RelatedReportItem[];
}

/** An in-app notification row. FR-CM-08 added category + icon + source
 *  pointer + renamed linkUrl → actionUrl. linkUrl kept as a deprecated
 *  alias on the wire so old client builds still find the deep link. */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  iconKind: string | null;
  actionUrl: string | null;
  /** @deprecated FR-CM-08 — same value as actionUrl, kept until every
   *  client is on the new field. New code should read actionUrl. */
  linkUrl: string | null;
  sourceType: string | null;
  sourceId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Cursor-paginated notification feed for the bell panel and the
 *  /account/notifications page. `nextCursor` is the createdAt ISO of
 *  the oldest row in the current page; clients pass it back as `before`
 *  to load the next chunk. Null when no more rows exist. */
export interface NotificationFeedPage {
  items: NotificationItem[];
  nextCursor: string | null;
}

/** FR-CM-08 — per-user notification preferences. typeOverrides maps a
 *  NotificationType to a boolean; missing keys = type is enabled.
 *  pushEnabled + quietHours* are inert until the Phase-3 push PR. */
export interface NotificationPreferenceDto {
  pushEnabled: boolean;
  typeOverrides: Partial<Record<NotificationType, boolean>>;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  timezone: string;
}

export const updateNotificationPreferenceSchema = z.object({
  pushEnabled: z.boolean().optional(),
  typeOverrides: z
    .record(notificationTypeSchema, z.boolean())
    .optional(),
  quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
  quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
  timezone: z.string().min(1).max(64).optional(),
});
export type UpdateNotificationPreferenceDto = z.infer<
  typeof updateNotificationPreferenceSchema
>;
