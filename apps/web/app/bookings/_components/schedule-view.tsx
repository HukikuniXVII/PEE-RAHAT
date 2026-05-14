"use client";

import type { Booking, BookingStatus } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo } from "react";

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
const GRID_HOURS = GRID_END_HOUR - GRID_START_HOUR + 1; // 15 hourly headers
const GRID_HALF_HOURS = GRID_HOURS * 2; // 30 half-hour body columns
const SLOT_MINUTES = 30;
const HOUR_RANGE = Array.from({ length: GRID_HOURS }, (_, i) => GRID_START_HOUR + i);
const HALF_HOUR_RANGE = Array.from({ length: GRID_HALF_HOURS }, (_, i) => i);
const DAY_ROW_HEIGHT_PX = 80;
const DAY_LABEL_COL_PX = 104;
const HALF_HOUR_COL_MIN_PX = 48;

// Index by Mon-anchored offset (0=Mon ... 6=Sun) — matches the day-bucket
// indexing used throughout the view.
const WEEKDAY_LABELS = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
];

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
          <div className="hidden md:block space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <DesktopWeekGrid
                days={days}
                dayBuckets={dayBuckets}
                today={today}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              * แต่ละการ์ดประกอบด้วย <span className="font-bold text-slate-500">วิชา</span> · คู่สนทนา · ระยะเวลา · แถบสีด้านซ้ายแสดงสถานะคลาส
            </p>
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
                      <ScheduleEvent
                        key={b.id}
                        booking={b}
                        layout="compact"
                      />
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

// ── desktop week grid (days = rows, half-hours = cols) ────────────────────
// Modern airy redesign: white surface, muted slate header band, pastel
// event cards with a colored left-accent stripe and soft drop shadow.
// 30-min column resolution so spans encode duration faithfully:
// 30 min = 1 cell, 60 = 2, 90 = 3, 120 = 4.
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
    <div className="overflow-x-auto">
      <div
        className="grid min-w-max relative bg-white"
        style={{
          gridTemplateColumns: `${DAY_LABEL_COL_PX}px repeat(${GRID_HALF_HOURS}, minmax(${HALF_HOUR_COL_MIN_PX}px, 1fr))`,
          gridTemplateRows: `auto repeat(7, ${DAY_ROW_HEIGHT_PX}px)`,
        }}
      >
        {/* corner cell — pinned at both axes, light surface */}
        <div
          className="sticky top-0 left-0 z-30 bg-slate-50 text-slate-400 text-[10px] font-bold tracking-widest flex items-center justify-center border-b border-r border-slate-200"
          style={{ gridColumn: 1, gridRow: 1 }}
        >
          วัน / เวลา
        </div>

        {/* hour headers — sticky-top, each label spans 2 half-hour cells */}
        {HOUR_RANGE.map((hour, i) => {
          const heavier = i % 3 === 0;
          const colStart = 2 + i * 2;
          return (
            <div
              key={`hh-${hour}`}
              className={cn(
                "sticky top-0 z-20 bg-slate-50 text-slate-500 text-[11px] font-semibold tabular-nums text-center flex items-center justify-center px-1 border-b border-slate-200",
                heavier ? "border-l border-slate-200" : "border-l border-slate-100",
              )}
              style={{ gridColumn: `${colStart} / span 2`, gridRow: 1 }}
            >
              {hour}:00–{hour + 1}:00
            </div>
          );
        })}

        {/* day rows */}
        {days.map((day, dayIdx) => {
          const isToday = sameDay(day, today);
          const bookings = dayBuckets[dayIdx] ?? [];
          const monIdx = day.getDay() === 0 ? 6 : day.getDay() - 1;
          return (
            <Fragment key={day.toISOString()}>
              {/* day label — sticky-left, soft slate-50 surface; today gets
                  an indigo left-accent stripe and indigo text. */}
              <div
                className={cn(
                  "sticky left-0 z-10 border-b border-r border-slate-100 px-3 flex flex-col items-center justify-center text-center transition-colors",
                  isToday
                    ? "bg-white border-l-[4px] border-l-indigo-500"
                    : "bg-slate-50",
                )}
                style={{ gridColumn: 1, gridRow: dayIdx + 2 }}
              >
                <span
                  className={cn(
                    "text-[12px] font-bold leading-tight",
                    isToday ? "text-indigo-700" : "text-slate-700",
                  )}
                >
                  {WEEKDAY_LABELS[monIdx]}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium tabular-nums leading-tight mt-0.5",
                    isToday ? "text-indigo-500" : "text-slate-400",
                  )}
                >
                  {day.getDate()}/{day.getMonth() + 1}
                </span>
              </div>

              {/* half-hour body cells: layered gridlines — slate-50 at half-
                  hour, slate-100 at hour, slate-200 every 3 hours. */}
              {HALF_HOUR_RANGE.map((i) => (
                <div
                  key={`bg-${dayIdx}-${i}`}
                  className={cn(
                    "border-b border-slate-100",
                    i % 6 === 0
                      ? "border-l border-slate-200"
                      : i % 2 === 0
                        ? "border-l border-slate-100"
                        : "border-l border-slate-50",
                    isToday && "bg-indigo-50/40",
                  )}
                  style={{ gridColumn: i + 2, gridRow: dayIdx + 2 }}
                />
              ))}

              {/* events: 4px inset gives the cards breathing room from cell
                  boundaries; span = duration / 30 min so widths are exact. */}
              {bookings.map((b) => {
                const start = new Date(b.scheduledAt);
                const startMinutes =
                  start.getHours() * 60 + start.getMinutes();
                const offsetMin = startMinutes - GRID_START_HOUR * 60;
                const clampedOffset = Math.max(
                  0,
                  Math.min(GRID_HALF_HOURS * SLOT_MINUTES, offsetMin),
                );
                const colStart = Math.floor(clampedOffset / SLOT_MINUTES) + 2;
                const maxSpan = GRID_HALF_HOURS + 2 - colStart;
                const colSpan = Math.max(
                  1,
                  Math.min(
                    maxSpan,
                    Math.ceil(b.durationMinutes / SLOT_MINUTES),
                  ),
                );
                return (
                  <div
                    key={b.id}
                    className="relative z-[1] p-1"
                    style={{
                      gridColumn: `${colStart} / span ${colSpan}`,
                      gridRow: dayIdx + 2,
                    }}
                  >
                    <ScheduleEvent booking={b} layout="horizontal" />
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
