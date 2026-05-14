"use client";

import type { Booking, PostponeRequest } from "@peerahat/types";
import { Button } from "@peerahat/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Hourglass,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

import { ProposeSlotDialog } from "./propose-slot-dialog";

interface Props {
  booking: Booking;
  request: PostponeRequest;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useCountdown(target: string): string {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return "หมดเวลา";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function PostponePanel({ booking, request }: Props) {
  const queryClient = useQueryClient();
  const [proposing, setProposing] = useState(false);

  // viewerSide === initiatorRole → caller is the initiator
  const viewerIsInitiator = booking.viewerSide === request.initiatorRole;
  const hasProposal = !!request.proposedAt;
  const countdown = useCountdown(request.chatExpiresAt);
  const initiatorLabel =
    request.initiatorRole === "student" ? "น้องขอเลื่อน" : "พี่ติวขอเลื่อน";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings", "byId", booking.id] });
    queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
    queryClient.invalidateQueries({ queryKey: ["chat", "messages"] });
  };

  const confirm = useMutation({
    mutationFn: () => createApiClient().bookings.postpone.confirm(booking.id),
    onSuccess: () => {
      toast.success("ยอมรับเวลาใหม่แล้ว — สร้างการจองใหม่เรียบร้อย");
      invalidate();
    },
  });

  const cancel = useMutation({
    mutationFn: () => createApiClient().bookings.postpone.cancel(booking.id),
    onSuccess: () => {
      toast.success("ปิดการเจรจาแล้ว");
      invalidate();
    },
  });

  return (
    <div className="px-6 py-5 border-b border-slate-100 bg-amber-50/30 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1.5">
            <CalendarX size={12} />
            {initiatorLabel}
          </p>
          <h3 className="text-base font-bold text-slate-900">
            กำลังเจรจาเลื่อนคลาส
          </h3>
          <p className="text-[11px] text-slate-500">
            เหตุผล: <span className="font-medium text-slate-700">{request.reason}</span>
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-full text-[11px] font-bold text-amber-700 tabular-nums">
          <Hourglass size={12} />
          {countdown}
        </span>
      </div>

      {request.wasShortNotice && request.initiatorRole === "student" && (
        <div className="flex items-start gap-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl px-3 py-2">
          <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" />
          <span>
            กระชั้นชิด (น้อยกว่า 12 ชม.) — ถ้าไม่ตกลงเวลาใหม่ ระบบจะแบ่ง 50% ให้พี่ติว / 10% ค่าธรรมเนียม / คืนน้อง 40%
          </span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <SlotCard
          label="เวลาเดิม"
          datetime={booking.scheduledAt}
          duration={booking.durationMinutes}
          tone="slate"
        />
        {hasProposal ? (
          <SlotCard
            label="เวลาใหม่ที่เสนอ"
            datetime={request.proposedAt!}
            duration={request.proposedDuration!}
            tone="indigo"
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-white px-4 py-3 flex items-center justify-center text-[11px] text-amber-600 font-bold">
            ยังไม่ได้เสนอเวลาใหม่
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {viewerIsInitiator && (
          <button
            type="button"
            onClick={() => setProposing(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <CalendarClock size={14} />
            {hasProposal ? "เสนอเวลาใหม่อีกครั้ง" : "เสนอเวลาใหม่"}
          </button>
        )}
        {!viewerIsInitiator && hasProposal && (
          <button
            type="button"
            onClick={() => confirm.mutate()}
            disabled={confirm.isPending}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <CheckCircle2 size={14} />
            {confirm.isPending ? "กำลังยืนยัน..." : "ยอมรับเวลาใหม่"}
          </button>
        )}
        <button
          type="button"
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending}
          className="px-4 py-2.5 bg-rose-50 text-rose-700 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all flex items-center gap-2 disabled:opacity-60"
        >
          <X size={14} />
          {cancel.isPending ? "กำลังปิดดีล..." : "ปฏิเสธ"}
        </button>
        {(confirm.error || cancel.error) && (
          <p className="text-[11px] text-rose-600 font-medium w-full">
            {(confirm.error ?? cancel.error)?.message}
          </p>
        )}
      </div>

      {proposing && (
        <ProposeSlotDialog
          bookingId={booking.id}
          tutorId={booking.tutorId}
          onClose={() => setProposing(false)}
          onProposed={() => {
            toast.success("ส่งข้อเสนอเวลาใหม่แล้ว");
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function SlotCard({
  label,
  datetime,
  duration,
  tone,
}: {
  label: string;
  datetime: string;
  duration: number;
  tone: "slate" | "indigo";
}) {
  const isIndigo = tone === "indigo";
  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 space-y-1",
        isIndigo
          ? "bg-indigo-50 border-indigo-100"
          : "bg-white border-slate-200",
      ].join(" ")}
    >
      <p
        className={[
          "text-[10px] font-bold uppercase tracking-widest",
          isIndigo ? "text-indigo-600" : "text-slate-400",
        ].join(" ")}
      >
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900">
        {formatDateTime(datetime)}
      </p>
      <p className="text-[11px] text-slate-500 font-medium">{duration} นาที</p>
    </div>
  );
}
