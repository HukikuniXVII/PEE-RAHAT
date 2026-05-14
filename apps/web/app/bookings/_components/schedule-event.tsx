"use client";

import type { Booking } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { Clock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { STATUS_COPY, TONE_CLASSES } from "./status-meta";

interface Props {
  booking: Booking;
  /** Compact variant for mobile day-list. */
  compact?: boolean;
}

export function ScheduleEvent({ booking, compact }: Props) {
  const status = STATUS_COPY[booking.status];
  const counterpartyLabel =
    booking.viewerSide === "student" ? "กับพี่ติว" : "กับน้อง";
  const start = new Date(booking.scheduledAt);
  const time = start.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const href = booking.chatThreadId
    ? (`/chat/thread/${booking.chatThreadId}` as Route)
    : ("/bookings" as Route);

  return (
    <Link
      href={href}
      className={cn(
        "block bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all overflow-hidden",
        compact ? "space-y-1.5" : "h-full space-y-1.5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest truncate">
          {booking.subject}
        </p>
        {compact && (
          <span className="text-[11px] font-bold text-slate-500 tabular-nums shrink-0">
            {time}
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-slate-800 truncate">
        {counterpartyLabel}
      </p>
      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
        <Clock size={10} />
        {booking.durationMinutes} นาที
      </p>
      <span
        className={cn(
          "inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
          TONE_CLASSES[status.tone],
        )}
      >
        {status.label}
      </span>
    </Link>
  );
}
