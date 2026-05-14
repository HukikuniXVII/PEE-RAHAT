"use client";

import type { Booking, BookingStatus } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { createApiClient } from "@/lib/api-client";

import { ScheduleEvent } from "./schedule-event";

const VISIBLE_STATUSES: ReadonlySet<BookingStatus> = new Set([
  "accepted",
  "paid",
  "completed",
  "postpone_pending",
  "postponed",
]);

const GRID_START_HOUR = 8;
const GRID_END_HOUR = 22; // last slot rendered ends at 23:00
const GRID_ROWS = GRID_END_HOUR - GRID_START_HOUR + 1; // 15 hourly rows

const WEEKDAY_LABELS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

interface Props {
  initialBookings: Booking[];
}

// ── week math ─────────────────────────────────────────────────────────────
// Monday-anchored. Independent of timezone — uses local clock.
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const out = new Date(d);
  out.setDate(d.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

function toIsoDate(d: Date): string {
  // YYYY-MM-DD in local time so the URL anchor matches what the user sees.
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDate(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const out = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(out.getTime())) return null;
  return out;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatRange(weekStart: Date, weekEnd: Date): string {
  const fmt = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  });
  const startStr = fmt.format(weekStart);
  const endStr = fmt.format(addDays(weekEnd, -1));
  const yearFmt = new Intl.DateTimeFormat("th-TH", { year: "numeric" });
  const year = yearFmt.format(weekStart);
  return `${startStr} – ${endStr} ${year}`;
}

export function ScheduleView({ initialBookings }: Props) {
  const params = useSearchParams();
  const { data } = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: () => createApiClient().bookings.mine(),
    initialData: initialBookings,
  });
  const bookings = data ?? initialBookings;

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const anchor = parseIsoDate(params?.get("week") ?? null) ?? today;
  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Filter + bucket by day index. Out-of-range or non-visible statuses dropped.
  const dayBuckets = useMemo<Booking[][]>(() => {
    const buckets: Booking[][] = Array.from({ length: 7 }, () => []);
    for (const b of bookings) {
      if (!VISIBLE_STATUSES.has(b.status)) continue;
      const at = new Date(b.scheduledAt);
      if (at.getTime() < weekStart.getTime() || at.getTime() >= weekEnd.getTime()) {
        continue;
      }
      const idx = Math.floor(
        (at.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (idx >= 0 && idx < 7) buckets[idx]!.push(b);
    }
    for (const bucket of buckets) {
      bucket.sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
    }
    return buckets;
  }, [bookings, weekStart, weekEnd]);

  const totalThisWeek = dayBuckets.reduce((s, b) => s + b.length, 0);

  function navHref(target: Date): Route {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.set("week", toIsoDate(target));
    return `/bookings?${next.toString()}` as Route;
  }

  const prevHref = navHref(addDays(weekStart, -7));
  const nextHref = navHref(addDays(weekStart, 7));
  const todayHref = navHref(today);

  return (
    <div className="space-y-4">
      {/* Nav header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            สัปดาห์
          </p>
          <p className="text-base font-bold text-slate-900">
            {formatRange(weekStart, weekEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={prevHref}
            aria-label="สัปดาห์ก่อน"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href={todayHref}
            className="px-4 h-9 inline-flex items-center rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
          >
            วันนี้
          </Link>
          <Link
            href={nextHref}
            aria-label="สัปดาห์ถัดไป"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {totalThisWeek === 0 && (
        <div className="bg-white p-12 rounded-[32px] border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
            <CalendarX size={32} />
          </div>
          <p className="text-sm text-slate-500 font-medium">
            สัปดาห์นี้ยังไม่มีคลาส
          </p>
        </div>
      )}

      {totalThisWeek > 0 && (
        <>
          {/* Desktop week grid */}
          <div className="hidden md:block bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <DesktopWeekGrid
              days={days}
              dayBuckets={dayBuckets}
              today={today}
            />
          </div>

          {/* Mobile day-grouped list */}
          <div className="md:hidden space-y-4">
            {days.map((day, i) => {
              const bucket = dayBuckets[i] ?? [];
              if (bucket.length === 0) return null;
              return (
                <section
                  key={day.toISOString()}
                  className={cn(
                    "bg-white rounded-3xl border border-slate-200 p-4 space-y-3",
                    sameDay(day, today) && "border-indigo-200 bg-indigo-50/30",
                  )}
                >
                  <header className="flex items-baseline justify-between">
                    <h3 className="text-sm font-black text-slate-900">
                      {day.toLocaleDateString("th-TH", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {bucket.length} คลาส
                    </span>
                  </header>
                  <div className="space-y-2">
                    {bucket.map((b) => (
                      <ScheduleEvent key={b.id} booking={b} compact />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── desktop week grid ─────────────────────────────────────────────────────
function DesktopWeekGrid({
  days,
  dayBuckets,
  today,
}: {
  days: Date[];
  dayBuckets: Booking[][];
  today: Date;
}) {
  return (
    <div>
      {/* Column header row */}
      <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-slate-100">
        <div />
        {days.map((day) => {
          const isToday = sameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "py-3 text-center border-l border-slate-100",
                isToday && "bg-indigo-50",
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  isToday ? "text-indigo-600" : "text-slate-400",
                )}
              >
                {WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
              </p>
              <p
                className={cn(
                  "text-lg font-black leading-none mt-0.5",
                  isToday ? "text-indigo-700" : "text-slate-800",
                )}
              >
                {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time-axis + day columns */}
      <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
        {/* Time labels */}
        <div className="grid" style={{ gridTemplateRows: `repeat(${GRID_ROWS}, 56px)` }}>
          {Array.from({ length: GRID_ROWS }, (_, i) => {
            const hour = GRID_START_HOUR + i;
            return (
              <div
                key={hour}
                className="text-[10px] font-bold text-slate-300 tabular-nums text-right pr-2 pt-0.5 border-t border-slate-50"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            );
          })}
        </div>

        {/* 7 day columns */}
        {days.map((day, i) => (
          <DayColumn
            key={day.toISOString()}
            day={day}
            bookings={dayBuckets[i] ?? []}
            isToday={sameDay(day, today)}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  day,
  bookings,
  isToday,
}: {
  day: Date;
  bookings: Booking[];
  isToday: boolean;
}) {
  return (
    <div
      className={cn(
        "relative grid border-l border-slate-100",
        isToday && "bg-indigo-50/40",
      )}
      style={{ gridTemplateRows: `repeat(${GRID_ROWS}, 56px)` }}
    >
      {/* Faint hour-line backdrop */}
      {Array.from({ length: GRID_ROWS }, (_, i) => (
        <div
          key={i}
          className="border-t border-slate-50"
          style={{ gridRow: i + 1 }}
        />
      ))}

      {/* Events */}
      {bookings.map((b) => {
        const start = new Date(b.scheduledAt);
        const startHour = start.getHours() + start.getMinutes() / 60;
        const clamped = Math.max(GRID_START_HOUR, Math.min(GRID_END_HOUR + 1, startHour));
        const rowStart = Math.floor(clamped - GRID_START_HOUR) + 1;
        const rowSpan = Math.max(
          1,
          Math.min(GRID_ROWS - rowStart + 1, Math.ceil(b.durationMinutes / 60)),
        );
        // Day key disambiguates events that share a start hour.
        return (
          <div
            key={b.id}
            className="p-1"
            style={{ gridRow: `${rowStart} / span ${rowSpan}` }}
          >
            <ScheduleEvent booking={b} />
          </div>
        );
      })}
    </div>
  );
}
