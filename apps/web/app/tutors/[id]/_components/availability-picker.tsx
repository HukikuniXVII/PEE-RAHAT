"use client";

import type { BusySlot } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";

import { createApiClient } from "@/lib/api-client";

// Profile-page preview — read-only. Real slot selection lives in the booking
// stepper's <SlotPicker /> which reuses the shared 30-min slot logic.
// Hits /tutors/:id/availability so blocked slots match the booking flow.
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
const SLOTS = Array.from(
  { length: ((DAY_END - DAY_START) * 60) / SLOT_STEP_MIN },
  (_, i) => DAY_START * 60 + i * SLOT_STEP_MIN,
);

function fmtSlot(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildDays() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, offset) => {
    const d = new Date(base);
    d.setDate(base.getDate() + offset + 1);
    return {
      iso: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString("th-TH", { weekday: "short" }),
      day: d.toLocaleDateString("th-TH", { day: "numeric" }),
      month: d.toLocaleDateString("th-TH", { month: "short" }),
    };
  });
}

function combineDateAndMinute(dateIso: string, totalMinutes: number): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  const h = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return new Date(y!, (m ?? 1) - 1, d ?? 1, h, mm, 0, 0);
}

function isSlotBusy(
  dateIso: string,
  slot: number,
  busy: BusySlot[],
): boolean {
  const start = combineDateAndMinute(dateIso, slot).getTime();
  const end = start + SLOT_STEP_MIN * 60_000;
  return busy.some((b) => {
    const bs = Date.parse(b.start);
    const be = Date.parse(b.end);
    return bs < end && be > start;
  });
}

interface Props {
  tutorId: string;
}

export function AvailabilityPicker({ tutorId }: Props) {
  const days = useMemo(buildDays, []);
  const [selected, setSelected] = useState(days[0]?.iso ?? null);

  const window = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(from.getDate() + 9);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }, []);

  const { data } = useQuery({
    queryKey: ["tutors", "availability", tutorId, window.fromIso],
    queryFn: () =>
      createApiClient().tutors.availability(
        tutorId,
        window.fromIso,
        window.toIso,
      ),
  });
  const busy = data?.busy ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <CalendarClock size={14} />
        ตารางเวลาที่ว่าง (7 วันข้างหน้า)
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-2 snap-x">
        {days.map((d) => {
          const active = d.iso === selected;
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => setSelected(d.iso)}
              className={cn(
                "shrink-0 snap-start w-[64px] py-2.5 rounded-2xl border text-center transition-all",
                active
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                  : "bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-300",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                {d.weekday}
              </p>
              <p className="text-lg font-black leading-tight">{d.day}</p>
              <p className="text-[10px] font-bold opacity-70">{d.month}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {SLOTS.map((min) => {
          const busyHere = selected ? isSlotBusy(selected, min, busy) : false;
          return (
            <div
              key={min}
              className={cn(
                "py-2 rounded-xl border text-xs font-bold text-center tabular-nums",
                busyHere
                  ? "bg-slate-200 text-slate-400 border-slate-200 line-through"
                  : "bg-slate-50 text-slate-600 border-slate-100",
              )}
            >
              {fmtSlot(min)}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">
        เลือกเวลาจริงที่หน้าจองเพื่อยืนยันการนัด — ช่องสีเทาคือเวลาที่มีคลาสอยู่แล้ว
      </p>
    </div>
  );
}
