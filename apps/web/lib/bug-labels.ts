import type {
  BugCategory,
  BugPriority,
  BugSeverity,
  BugStatus,
} from "@peerahat/types";

// Thai labels + colour tokens shared by the bug-report dialog, the admin
// queue, and the my-bugs page. Colour is never the only signal — every
// chip carries its label too (a11y).

export const BUG_CATEGORY_LABELS: Record<BugCategory, string> = {
  ui: "หน้าตา/การแสดงผล",
  broken_link: "ลิงก์เสีย",
  payment: "การชำระเงิน",
  booking: "การจองคลาส",
  chat: "แชท",
  performance: "ความเร็ว/ประสิทธิภาพ",
  other: "อื่นๆ",
};

export const BUG_SEVERITY_LABELS: Record<BugSeverity, string> = {
  minor: "ไม่ค่อยกระทบ",
  normal: "กระทบการใช้งาน",
  blocker: "ใช้ไม่ได้เลย",
};

/** Segmented-control + chip colours for severity (slate / amber / rose). */
export const BUG_SEVERITY_PILL: Record<BugSeverity, string> = {
  minor: "bg-slate-100 text-slate-600",
  normal: "bg-amber-50 text-amber-700",
  blocker: "bg-rose-50 text-rose-600",
};

/** Active (selected) state for the severity segmented control. */
export const BUG_SEVERITY_ACTIVE: Record<BugSeverity, string> = {
  minor: "bg-slate-700 text-white",
  normal: "bg-amber-500 text-white",
  blocker: "bg-rose-600 text-white",
};

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  open: "เปิดอยู่",
  in_progress: "กำลังแก้ไข",
  fixed: "แก้ไขแล้ว",
  wont_fix: "ไม่แก้ไข",
  duplicate: "ซ้ำ",
};

export const BUG_STATUS_PILL: Record<BugStatus, string> = {
  open: "bg-slate-100 text-slate-600",
  in_progress: "bg-indigo-50 text-indigo-600",
  fixed: "bg-emerald-50 text-emerald-600",
  wont_fix: "bg-slate-100 text-slate-500",
  duplicate: "bg-amber-50 text-amber-600",
};

export const BUG_PRIORITY_LABELS: Record<BugPriority, string> = {
  low: "ต่ำ",
  normal: "ปกติ",
  high: "สูง",
  urgent: "ด่วน",
};

export const BUG_PRIORITY_PILL: Record<BugPriority, string> = {
  low: "bg-slate-100 text-slate-500",
  normal: "bg-slate-100 text-slate-600",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-rose-50 text-rose-600",
};
