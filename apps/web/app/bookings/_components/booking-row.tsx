"use client";

import type { Booking } from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  Loader2,
  Star,
  ThumbsUp,
  Trash2,
  Video,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ReportButton } from "@/app/_components/report-button";
import { PaymentDialog } from "@/components/payment-dialog";
import { createApiClient } from "@/lib/api-client";

import { PostponeReasonDialog } from "./postpone-reason-dialog";
import { ReviewDialog } from "./review-dialog";
import { STATUS_COPY, TONE_CLASSES } from "./status-meta";

interface Props {
  booking: Booking;
}

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
  const [reviewing, setReviewing] = useState(false);
  const [postponing, setPostponing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

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
  // FR-TH-17 rev2: the Meet link is generated at payment-confirm, so it's
  // present on the booking from the moment escrow opens. The button is
  // disabled while scheduledAt is more than 24h away — keeps students from
  // clicking too early and finding an empty room — then becomes active for
  // the ≤24h window and stays clickable through to a few hours past start.
  const minutesFromStart =
    (new Date(booking.scheduledAt).getTime() - Date.now()) / 60_000;
  const within24hWindow =
    booking.status === "paid" &&
    minutesFromStart <= 24 * 60 &&
    minutesFromStart >= -180; // 3h past start so latecomers can still join
  const hasMeetingUrl = !!booking.meetingUrl;
  const readyToStart =
    booking.status === "paid" &&
    minutesFromStart <= 5 &&
    minutesFromStart >= -5;

  const accept = useMutation({
    mutationFn: () => createApiClient().bookings.accept(booking.id),
    meta: { toast: "กดรับงานไม่สำเร็จ" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
      toast.success("รับงานเรียบร้อย รอนักเรียนชำระเงิน");
    },
  });

  // FR-TH-06: student-side cancel for pre-payment 1-on-1 bookings.
  // Group bookings are blocked at the server (they use failGroup).
  const cancelStudent = useMutation({
    mutationFn: () => createApiClient().bookings.cancel(booking.id),
    onSuccess: () => {
      setConfirmingCancel(false);
      queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
      toast.success("ยกเลิกการจองเรียบร้อย");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "ยกเลิกไม่สำเร็จ");
    },
  });
  const studentCancelable =
    isStudent &&
    booking.sessionType !== "group" &&
    (booking.status === "requested" || booking.status === "accepted");

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
            readyToStart
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : TONE_CLASSES[status.tone],
          )}
        >
          {readyToStart ? "พร้อมเริ่มคลาส" : status.label}
        </span>

        <div className="flex items-center gap-2">
          {hasMeetingUrl && booking.status === "paid" && (
            within24hWindow ? (
              <a
                href={booking.meetingUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all flex items-center gap-2"
              >
                <Video size={14} />
                เข้าห้องเรียนออนไลน์
              </a>
            ) : (
              <span
                title="ลิงก์จะใช้งานได้เมื่อใกล้ถึงเวลาเรียน (ภายใน 24 ชม.)"
                className="px-4 py-2.5 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed flex items-center gap-2"
              >
                <Video size={14} />
                เข้าห้องเรียนออนไลน์
              </span>
            )
          )}
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
          {studentCancelable && (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all flex items-center gap-2"
            >
              <Trash2 size={14} />
              ยกเลิกการจอง
            </button>
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
            <ReportButton
              targetType="booking"
              targetId={booking.id}
              label="แจ้งปัญหา"
              className="px-4 py-2.5"
              onReported={() =>
                queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] })
              }
            />
          )}
          {booking.status === "paid" && (
            <span className="text-[11px] font-bold text-emerald-600 inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              พักเงินไว้แล้ว
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

      {confirmingCancel && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() =>
            !cancelStudent.isPending && setConfirmingCancel(false)
          }
        >
          <div
            className="bg-white rounded-[28px] shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                ยืนยันยกเลิกการจอง?
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                คุณกำลังจะยกเลิกคลาส {booking.subject} วันที่{" "}
                {formatDateTime(booking.scheduledAt)}. การยกเลิกจะแจ้งพี่รหัสและ
                ปลดบล็อกตารางเวลาทั้งสองฝ่าย — กดยืนยันแล้วจะไม่สามารถย้อนกลับได้
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cancelStudent.isPending}
                onClick={() => setConfirmingCancel(false)}
                className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 disabled:opacity-40"
              >
                ไม่ยกเลิก
              </button>
              <button
                type="button"
                disabled={cancelStudent.isPending}
                onClick={() => cancelStudent.mutate()}
                className="px-4 py-3 rounded-2xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {cancelStudent.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
