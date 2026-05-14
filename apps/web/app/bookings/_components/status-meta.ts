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
 * Pastel surface + a colored left-edge accent — used on the schedule
 * grid so an event card reads as "soft chip with status hint" rather
 * than a flat colored block. The accent border replaces the chip pill
 * that the compact mobile card still uses.
 */
export const PANEL_CLASSES: Record<StatusTone, string> = {
  info: "bg-indigo-50 text-indigo-800 border-l-indigo-400",
  warn: "bg-amber-50 text-amber-900 border-l-amber-400",
  ok: "bg-emerald-50 text-emerald-800 border-l-emerald-400",
  danger: "bg-rose-50 text-rose-800 border-l-rose-400",
  neutral: "bg-slate-50 text-slate-700 border-l-slate-300",
};
