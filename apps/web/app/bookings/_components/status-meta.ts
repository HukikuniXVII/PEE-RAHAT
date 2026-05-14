import type { BookingStatus } from "@peerahat/types";

export type StatusTone = "info" | "warn" | "ok" | "danger" | "neutral";

export const STATUS_COPY: Record<
  BookingStatus,
  { label: string; tone: StatusTone }
> = {
  requested: { label: "รอพี่ติวกดรับ", tone: "warn" },
  accepted: { label: "พี่ติวรับงานแล้ว — รอชำระเงิน", tone: "info" },
  rejected: { label: "พี่ติวปฏิเสธคำขอ", tone: "danger" },
  expired: { label: "หมดอายุ (ไม่มีการตอบใน 24 ชม.)", tone: "neutral" },
  paid: { label: "ชำระเงินแล้ว — รอเริ่มเรียน", tone: "ok" },
  completed: { label: "เรียนเสร็จแล้ว", tone: "ok" },
  reported: { label: "อยู่ระหว่างตรวจสอบ", tone: "warn" },
  refunded: { label: "คืนเงินแล้ว", tone: "neutral" },
  cancelled: { label: "ยกเลิก", tone: "neutral" },
  postpone_pending: { label: "กำลังเจรจาเลื่อนคลาส", tone: "warn" },
  postponed: { label: "เลื่อนคลาสแล้ว", tone: "neutral" },
  cancelled_no_agreement: { label: "ยกเลิก — ไม่ตกลงเวลาใหม่", tone: "danger" },
  cancelled_tutor_unresponsive: { label: "ยกเลิก — พี่ติวไม่ตอบ", tone: "danger" },
  cancelled_tutor_initiated: { label: "ยกเลิก — พี่ติวขอเลื่อน", tone: "danger" },
};

export const TONE_CLASSES: Record<StatusTone, string> = {
  info: "bg-indigo-50 text-indigo-600 border-indigo-100",
  warn: "bg-amber-50 text-amber-600 border-amber-100",
  ok: "bg-emerald-50 text-emerald-600 border-emerald-100",
  danger: "bg-rose-50 text-rose-600 border-rose-100",
  neutral: "bg-slate-50 text-slate-500 border-slate-100",
};

/**
 * Stronger fills for the schedule table — events flush-fill their cell
 * so the panel itself encodes the status (no separate chip needed).
 */
export const PANEL_CLASSES: Record<StatusTone, string> = {
  info: "bg-indigo-100 text-indigo-800",
  warn: "bg-amber-100 text-amber-900",
  ok: "bg-emerald-100 text-emerald-800",
  danger: "bg-rose-100 text-rose-800",
  neutral: "bg-slate-100 text-slate-700",
};
