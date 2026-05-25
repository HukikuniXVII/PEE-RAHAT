"use client";

import type { Booking } from "@peerahat/types";
import { Button } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, Inbox, Users, XCircle } from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initial: Booking[];
}

export function TutorGroupInbox({ initial }: Props) {
  const queryClient = useQueryClient();
  const pendingQuery = useQuery({
    queryKey: ["bookings", "group-pending"],
    queryFn: () => createApiClient().bookings.groupPending(),
    initialData: initial,
    refetchInterval: 30_000,
  });

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-500">
          Tutor
        </p>
        <h1 className="text-3xl font-bold text-violet-700 thai">
          คลาสกลุ่มที่รออนุมัติ
        </h1>
        <p className="text-sm text-neutral-500 thai">
          ทุกกลุ่มมีผู้เรียนครบจำนวนแล้ว — กดอนุมัติเพื่อให้ระบบเก็บค่าเรียน
        </p>
      </header>

      {pendingQuery.data.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-violet-100 shadow-sm p-12 text-center space-y-3">
          <Inbox size={32} className="mx-auto text-slate-400" />
          <p className="text-sm font-bold text-slate-500 thai">
            ยังไม่มีกลุ่มที่รออนุมัติ
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {pendingQuery.data.map((b) => (
            <PendingCard
              key={b.id}
              booking={b}
              onChange={() =>
                queryClient.invalidateQueries({
                  queryKey: ["bookings", "group-pending"],
                })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PendingCard({
  booking,
  onChange,
}: {
  booking: Booking;
  onChange: () => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");

  const approve = useMutation({
    mutationFn: () => createApiClient().bookings.groupApprove(booking.id),
    onSuccess: onChange,
  });

  const reject = useMutation({
    mutationFn: () =>
      createApiClient().bookings.groupReject(booking.id, {
        reason: reason.trim(),
      }),
    onSuccess: onChange,
  });

  const errorMessage =
    (approve.error as Error | null)?.message ??
    (reject.error as Error | null)?.message ??
    null;
  const scheduledDate = new Date(booking.scheduledAt);

  return (
    <li className="bg-white rounded-[28px] border border-violet-100 shadow-sm p-6 space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-grape-deep thai">
          {booking.subject} • {booking.capacity} คน
        </h2>
        <p className="text-xs text-slate-500 thai">
          {format(scheduledDate, "d MMM yyyy HH:mm")} •{" "}
          {booking.durationMinutes} นาที • คนละ ฿
          {booking.amountThb.toLocaleString()}
        </p>
      </div>

      {booking.participants && booking.participants.length > 0 && (
        <ul className="space-y-1.5">
          {booking.participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 text-xs text-slate-600"
            >
              <Users size={12} className="text-slate-400" />
              <span className="font-medium">{p.displayName}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-auto">
                {p.role === "host" ? "Host" : "Invited"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!rejectMode ? (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={approve.isPending}
            onClick={() => setRejectMode(true)}
          >
            <XCircle size={14} />
            ไม่อนุมัติ
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="default"
            disabled={approve.isPending}
            onClick={() => approve.mutate()}
          >
            <CheckCircle2 size={14} />
            {approve.isPending ? "กำลังอนุมัติ…" : "อนุมัติคลาส"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold uppercase tracking-widest text-ink-mute">
            เหตุผลที่ไม่อนุมัติ (จำเป็น)
          </label>
          <textarea
            rows={2}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น เวลาไม่สะดวก, ผู้เรียนไม่เหมาะสม"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={reject.isPending}
              onClick={() => setRejectMode(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="default"
              disabled={reject.isPending || !reason.trim()}
              onClick={() => reject.mutate()}
            >
              {reject.isPending ? "กำลังส่ง…" : "ยืนยันไม่อนุมัติ"}
            </Button>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-rose-600 font-medium text-center">
          {errorMessage}
        </p>
      )}
    </li>
  );
}
