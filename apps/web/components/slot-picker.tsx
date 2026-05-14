"use client";

import { cn } from "@peerahat/ui";
import { CalendarClock, Clock } from "lucide-react";

const SLOT_HOURS = Array.from({ length: 12 }, (_, i) => 9 + i);
export const DURATION_PRESETS = [60, 90, 120] as const;
export type DurationMinutes = (typeof DURATION_PRESETS)[number];

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

export function combineDateAndHour(dateIso: string, hour: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const local = new Date(y!, (m ?? 1) - 1, d ?? 1, hour, 0, 0, 0);
  return local.toISOString();
}

interface Props {
  dateIso: string | null;
  onDate: (iso: string) => void;
  hour: number | null;
  onHour: (h: number) => void;
  duration?: DurationMinutes;
  onDuration?: (d: DurationMinutes) => void;
  /** Hide the duration row when the consumer manages duration externally. */
  hideDuration?: boolean;
  /** Shown above the day chips. Defaults to the booking-form copy. */
  helperText?: string;
}

export function SlotPicker({
  dateIso,
  onDate,
  hour,
  onHour,
  duration,
  onDuration,
  hideDuration,
  helperText = "จองล่วงหน้าอย่างน้อย 1 วัน",
}: Props) {
  const days = buildDayChips();

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
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {SLOT_HOURS.map((h) => {
              const active = h === hour;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => onHour(h)}
                  className={cn(
                    "py-3 rounded-2xl border text-sm font-bold transition-all",
                    active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                      : "bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-300",
                  )}
                >
                  {String(h).padStart(2, "0")}:00
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
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
