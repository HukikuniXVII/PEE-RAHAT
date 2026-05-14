"use client";

import type { BusySlot } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { CalendarClock, Clock } from "lucide-react";

// Day window comes from env so ops can shift opening hours without a code
// push. The current production defaults match the booking spec: 9:00–21:00.
const DAY_START = Math.max(
  0,
  Math.min(
    23,
    Number(process.env.NEXT_PUBLIC_BOOKING_DAY_START_HOUR ?? 9) || 9,
  ),
);
const DAY_END = Math.max(
  DAY_START + 1,
  Math.min(
    24,
    Number(process.env.NEXT_PUBLIC_BOOKING_DAY_END_HOUR ?? 21) || 21,
  ),
);

const SLOT_STEP_MIN = 30;
// Slots are minutes-since-midnight (e.g. 13:30 → 810).
export const SLOT_MINUTES = Array.from(
  { length: ((DAY_END - DAY_START) * 60) / SLOT_STEP_MIN },
  (_, i) => DAY_START * 60 + i * SLOT_STEP_MIN,
);

export const DURATION_PRESETS = [30, 60, 90, 120] as const;
export type DurationMinutes = (typeof DURATION_PRESETS)[number];

function formatSlotLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function buildDayChips(): {
  iso: string;
  weekday: string;
  day: string;
  month: string;
}[] {
  const out: {
    iso: string;
    weekday: string;
    day: string;
    month: string;
  }[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let offset = 1; offset <= 7; offset++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    out.push({
      iso: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString("th-TH", { weekday: "short" }),
      day: d.toLocaleDateString("th-TH", { day: "numeric" }),
      month: d.toLocaleDateString("th-TH", { month: "short" }),
    });
  }
  return out;
}

export function combineDateAndMinute(
  dateIso: string,
  totalMinutes: number,
): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const h = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  const local = new Date(y!, (m ?? 1) - 1, d ?? 1, h, mm, 0, 0);
  return local.toISOString();
}

function intervalsOverlap(
  aStartMs: number,
  aEndMs: number,
  bStartIso: string,
  bEndIso: string,
): boolean {
  const bs = Date.parse(bStartIso);
  const be = Date.parse(bEndIso);
  return aStartMs < be && aEndMs > bs;
}

interface Props {
  dateIso: string | null;
  onDate: (iso: string) => void;
  /** Minutes since midnight for the selected start slot. */
  slotMinutes: number | null;
  onSlot: (minutes: number) => void;
  duration?: DurationMinutes;
  onDuration?: (d: DurationMinutes) => void;
  /** Hide the duration row when the consumer manages duration externally. */
  hideDuration?: boolean;
  /** Shown above the day chips. Defaults to the booking-form copy. */
  helperText?: string;
  /** Intervals that already consume a slot — student or tutor side. The
   *  picker will grey any 30-min slot whose [slot, slot+duration) window
   *  overlaps any of these. */
  busy?: BusySlot[];
}

export function SlotPicker({
  dateIso,
  onDate,
  slotMinutes,
  onSlot,
  duration,
  onDuration,
  hideDuration,
  helperText = "จองล่วงหน้าอย่างน้อย 1 วัน",
  busy = [],
}: Props) {
  const days = buildDayChips();
  // Grey based on the selected duration when known; otherwise the minimum
  // 30-min footprint. This is a UX assist — assertNoOverlap on the server
  // is the source of truth.
  const greyDuration = duration ?? SLOT_STEP_MIN;

  function isBusy(slot: number): boolean {
    if (!dateIso) return false;
    const startIso = combineDateAndMinute(dateIso, slot);
    const startMs = Date.parse(startIso);
    const endMs = startMs + greyDuration * 60_000;
    return busy.some((b) => intervalsOverlap(startMs, endMs, b.start, b.end));
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <CalendarClock size={14} />
          เลือกวัน
        </label>
        <p className="text-[11px] text-slate-500">{helperText}</p>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-2 snap-x">
          {days.map((d) => {
            const active = d.iso === dateIso;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => onDate(d.iso)}
                className={cn(
                  "shrink-0 snap-start w-[68px] py-3 rounded-2xl border text-center transition-all",
                  active
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                    : "bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-300",
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                  {d.weekday}
                </p>
                <p className="text-xl font-black leading-tight">{d.day}</p>
                <p className="text-[10px] font-bold opacity-70">{d.month}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} />
          เลือกเวลา
        </label>
        {dateIso ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {SLOT_MINUTES.map((min) => {
              const active = min === slotMinutes;
              const disabled = isBusy(min);
              return (
                <button
                  key={min}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSlot(min)}
                  className={cn(
                    "py-2.5 rounded-2xl border text-xs font-bold transition-all tabular-nums",
                    active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                      : disabled
                        ? "bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed line-through"
                        : "bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-300",
                  )}
                >
                  {formatSlotLabel(min)}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 font-medium py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            เลือกวันก่อนเพื่อดูเวลาที่ว่าง
          </p>
        )}
      </section>

      {!hideDuration && duration !== undefined && onDuration && (
        <section className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Clock size={14} />
            ความยาวคลาส
          </label>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {DURATION_PRESETS.map((mins) => {
              const active = mins === duration;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onDuration(mins)}
                  className={cn(
                    "py-3 rounded-2xl border text-sm font-bold transition-all",
                    active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                      : "bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-300",
                  )}
                >
                  {mins} นาที
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
