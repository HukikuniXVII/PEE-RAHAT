"use client";

import { cn } from "@peerahat/ui";
import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";

// Visible-only preview on the profile page — the actual slot picker lives in
// the booking stepper. We show next 7 days starting tomorrow + a placeholder
// hourly grid 9:00–21:00 until tutor.availability exists in the DTO.
// TODO: wire to tutor.availability once the DTO exposes per-slot data.
const SLOT_HOURS = Array.from({ length: 12 }, (_, i) => 9 + i);

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

export function AvailabilityPicker() {
  const days = useMemo(buildDays, []);
  const [selected, setSelected] = useState(days[0]?.iso ?? null);

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

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {SLOT_HOURS.map((h) => (
          <div
            key={h}
            className="py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-600 text-center"
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">
        เลือกเวลาจริงที่หน้าจองเพื่อยืนยันการนัด
      </p>
    </div>
  );
}
