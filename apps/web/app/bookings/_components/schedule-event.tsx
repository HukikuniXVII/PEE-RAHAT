"use client";

import type { Booking } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { Clock, Video } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PANEL_CLASSES, STATUS_COPY, TONE_CLASSES } from "./status-meta";

interface Props {
  booking: Booking;
  /** "horizontal" (default) fills a day-row schedule cell — flat panel
   *  with the status color as background. "compact" is the mobile day-
   *  list affordance: card with explicit time + duration + chip. */
  layout?: "horizontal" | "compact";
}

export function ScheduleEvent({ booking, layout = "horizontal" }: Props) {
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

  // FR-TH-17: surface a small Meet icon when the Meet link is present.
  // The icon is decorative on the schedule grid — clicks still navigate
  // to the booking thread, where the join button is the primary action.
  // (Stopping propagation from the icon would be confusing on a small
  // schedule cell; the join flow lives in the chat thread + booking row.)
  const hasMeet = !!booking.meetingUrl;

  if (layout === "compact") {
    return (
      <Link
        href={href}
        className="block bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all overflow-hidden"
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest truncate">
            {booking.subject}
          </p>
          <span className="text-[11px] font-bold text-slate-500 tabular-nums shrink-0">
            {time}
          </span>
        </div>
        <p className="text-xs font-bold text-slate-800 truncate">
          {counterpartyLabel}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Clock size={10} />
            {booking.durationMinutes} นาที
          </p>
          {hasMeet && (
            <a
              href={booking.meetingUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              title="เข้าห้องเรียนออนไลน์"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
            >
              <Video size={10} />
              Meet
            </a>
          )}
        </div>
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

  // Horizontal — soft card that fills its cell with a left-accent stripe.
  return (
    <Link
      href={href}
      className={cn(
        "group block h-full w-full rounded-lg shadow-sm border-l-[3px] px-2 py-1.5 flex flex-col justify-center overflow-hidden leading-tight hover:shadow-md hover:-translate-y-px transition-all relative",
        PANEL_CLASSES[status.tone],
      )}
    >
      <p className="text-[11px] font-bold tracking-tight truncate max-w-full group-hover:underline decoration-2 underline-offset-2">
        {booking.subject}
      </p>
      <p className="text-[10px] font-medium opacity-75 truncate max-w-full">
        {counterpartyLabel} · {booking.durationMinutes} นาที
      </p>
      {hasMeet && (
        <Video
          size={10}
          aria-label="มีลิงก์ Google Meet"
          className="absolute top-1.5 right-1.5 opacity-60"
        />
      )}
    </Link>
  );
}
