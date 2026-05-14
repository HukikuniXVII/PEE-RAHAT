"use client";

import type { Booking, BookingStatus } from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  Loader2,
  Star,
  ThumbsUp,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PaymentDialog } from "@/components/payment-dialog";
import { createApiClient } from "@/lib/api-client";

import { PostponeReasonDialog } from "./postpone-reason-dialog";
import { ReportDialog } from "./report-dialog";
import { ReviewDialog } from "./review-dialog";

interface Props {
  booking: Booking;
}

const STATUS_COPY: Record<
  BookingStatus,
  { label: string; tone: "info" | "warn" | "ok" | "danger" | "neutral" }
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

const TONE_CLASSES: Record<string, string> = {
  info: "bg-indigo-50 text-indigo-600 border-indigo-100",
  warn: "bg-amber-50 text-amber-600 border-amber-100",
  ok: "bg-emerald-50 text-emerald-600 border-emerald-100",
  danger: "bg-rose-50 text-rose-600 border-rose-100",
  neutral: "bg-slate-50 text-slate-500 border-slate-100",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingRow({ booking }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [postponing, setPostponing] = useState(false);

  const status = STATUS_COPY[booking.status];

  const isStudent = booking.viewerSide === "student";
  const reportWindowOpen =
    isStudent &&
    booking.status === "completed" &&
    !!booking.reportWindowEndsAt &&
    new Date(booking.reportWindowEndsAt).getTime() > Date.now();

  const reviewable =
    isStudent && booking.status === "completed" && !booking.hasReview;
  const acceptable =
    booking.status === "requested" && booking.viewerSide === "tutor";
  // FR-TH-10: both sides can request postpone while the class is still upcoming.
  const postponable =
    booking.status === "paid" &&
    new Date(booking.scheduledAt).getTime() > Date.now();
  const negotiating =
    booking.status === "postpone_pending" && !!booking.chatThreadId;

  const accept = useMutation({
    mutationFn: () => createApiClient().bookings.accept(booking.id),
    meta: { toast: "กดรับงานไม่สำเร็จ" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
      toast.success("รับงานเรียบร้อย รอนักเรียนชำระเงิน");
    },
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
            {booking.subject}
          </p>
          <h3 className="text-lg font-bold text-slate-900">
            Booking #{booking.id.slice(0, 8)}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium pt-1">
            <span className="flex items-center gap-1">
              <CalendarClock size={14} />
              {formatDateTime(booking.scheduledAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {booking.durationMinutes} นาที
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Amount
          </p>
          <p className="text-xl font-black text-slate-900">
            ฿{booking.amountThb.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border",
            TONE_CLASSES[status.tone],
          )}
        >
          {status.label}
        </span>

        <div className="flex items-center gap-2">
          {acceptable && (
            <Button
              variant="success"
              onClick={() => accept.mutate()}
              disabled={accept.isPending}
            >
              {accept.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ThumbsUp size={14} />
              )}
              Accept (Tutor)
            </Button>
          )}
          {booking.status === "accepted" && booking.viewerSide === "student" && (
            <Button onClick={() => setPaying(true)}>
              <Wallet size={16} />
              Pay Now
            </Button>
          )}
          {reviewable && (
            <button
              type="button"
              onClick={() => setReviewing(true)}
              className="px-4 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all flex items-center gap-2"
            >
              <Star size={14} fill="currentColor" />
              Leave Review
            </button>
          )}
          {booking.status === "completed" && booking.hasReview && (
            <span className="text-[11px] font-bold text-amber-600 inline-flex items-center gap-1.5">
              <Star size={14} fill="currentColor" />
              รีวิวแล้ว
            </span>
          )}
          {reportWindowOpen && (
            <button
              type="button"
              onClick={() => setReporting(true)}
              className="px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all flex items-center gap-2"
            >
              <AlertTriangle size={14} />
              Report Issue
            </button>
          )}
          {booking.status === "paid" && (
            <span className="text-[11px] font-bold text-emerald-600 inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Held in Escrow
            </span>
          )}
          {postponable && (
            <button
              type="button"
              onClick={() => setPostponing(true)}
              className="px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-100 transition-all flex items-center gap-2"
            >
              <CalendarX size={14} />
              ขอเลื่อนคลาส
            </button>
          )}
          {negotiating && (
            <button
              type="button"
              onClick={() => router.push(`/chat/thread/${booking.chatThreadId}`)}
              className="px-4 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all flex items-center gap-2"
            >
              <CalendarX size={14} />
              เปิดห้องเจรจา
            </button>
          )}
        </div>
      </div>

      {paying && (
        <PaymentDialog
          itemType="booking"
          itemId={booking.id}
          amountThb={booking.amountThb}
          payeeLabel={`Booking #${booking.id.slice(0, 8)}`}
          onClose={() => {
            setPaying(false);
            queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
          }}
        />
      )}

      {reporting && (
        <ReportDialog
          bookingId={booking.id}
          onClose={() => setReporting(false)}
          onReported={() =>
            queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] })
          }
        />
      )}

      {reviewing && (
        <ReviewDialog
          bookingId={booking.id}
          tutorId={booking.tutorId}
          onClose={() => setReviewing(false)}
          onReviewed={() => {
            queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
            queryClient.invalidateQueries({
              queryKey: ["tutors", "byId", booking.tutorId],
            });
          }}
        />
      )}

      {postponing && (
        <PostponeReasonDialog
          bookingId={booking.id}
          onClose={() => setPostponing(false)}
          onOpened={({ threadId }) => {
            queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
            toast.success("เปิดห้องเจรจาแล้ว — ตอบกลับภายใน 2 ชั่วโมง");
            router.push(`/chat/thread/${threadId}`);
          }}
        />
      )}
    </motion.div>
  );
}
