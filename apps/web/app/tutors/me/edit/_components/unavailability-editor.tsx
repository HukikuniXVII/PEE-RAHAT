"use client";

import {
  type CreateUnavailabilityDto,
  type TutorUnavailability,
} from "@peerahat/types";
import { Button } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOff, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

// "all" splats into 7 rules client-side. Mon-first labels but values
// follow JS Date.getDay (0=Sun … 6=Sat) so the API contract matches what
// the busy-expander walks.
type WeekdayValue = number | "all";
const WEEKDAY_OPTIONS: { value: WeekdayValue; label: string }[] = [
  { value: "all", label: "ทุกวัน" },
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัสบดี" },
  { value: 5, label: "ศุกร์" },
  { value: 6, label: "เสาร์" },
  { value: 0, label: "อาทิตย์" },
];
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const SLOT_STEP = 30;
const TIME_OPTIONS = Array.from({ length: (24 * 60) / SLOT_STEP }, (_, i) => {
  const min = i * SLOT_STEP;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return {
    value: min,
    label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  };
});

function formatMinute(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function weekdayLabel(weekday: number): string {
  return WEEKDAY_OPTIONS.find((w) => w.value === weekday)?.label ?? "?";
}

export function UnavailabilityEditor() {
  const queryClient = useQueryClient();
  const [weekday, setWeekday] = useState<WeekdayValue>("all");
  const [startMinute, setStartMinute] = useState<number>(12 * 60);
  const [endMinute, setEndMinute] = useState<number>(13 * 60);
  const [reason, setReason] = useState<string>("");

  const list = useQuery({
    queryKey: ["tutors", "me", "unavailability"],
    queryFn: () => createApiClient().tutors.unavailability.list(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["tutors", "me", "unavailability"] });

  const create = useMutation({
    // For "ทุกวัน" we fire 7 parallel creates and aggregate the result.
    // Promise.all means a partial failure is surfaced (rare; the user can
    // retry the missing days from the chip list).
    mutationFn: async (
      dto: Omit<CreateUnavailabilityDto, "weekday"> & {
        weekdays: readonly number[];
      },
    ) => {
      const api = createApiClient();
      const { weekdays, ...rest } = dto;
      await Promise.all(
        weekdays.map((wd) =>
          api.tutors.unavailability.create({ ...rest, weekday: wd }),
        ),
      );
    },
    onSuccess: () => {
      invalidate();
      // Also invalidate any picker that's currently rendering this tutor's
      // availability so blocked slots immediately grey out.
      queryClient.invalidateQueries({ queryKey: ["tutors", "availability"] });
      setReason("");
      toast.success("เพิ่มเวลาไม่ว่างเรียบร้อย");
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => createApiClient().tutors.unavailability.remove(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["tutors", "availability"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const submit = () => {
    if (endMinute <= startMinute) {
      toast.error("เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น");
      return;
    }
    const weekdays =
      weekday === "all" ? [...ALL_WEEKDAYS] : [weekday];
    create.mutate({
      weekdays,
      startMinute,
      endMinute,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <section className="space-y-4 bg-white border border-slate-200 rounded-3xl p-6">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <CalendarOff size={12} />
          เวลาไม่ว่างประจำสัปดาห์
        </p>
        <h3 className="text-base font-bold text-slate-900">
          ตั้งเวลาที่ไม่รับสอน
        </h3>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          เช่น "พักกลางวัน จันทร์ 12:00–13:00" — น้อง ๆ จะไม่สามารถจองเวลานี้ได้
          และตารางสอนของพี่ติวจะมีแถบสีเทาในช่วงเวลานี้ทุกสัปดาห์
        </p>
      </div>

      <ul className="space-y-2">
        {list.isLoading && (
          <li className="text-sm text-slate-400 font-medium flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            กำลังโหลด…
          </li>
        )}
        {list.data && list.data.length === 0 && (
          <li className="text-[12px] text-slate-400 italic">
            ยังไม่ได้ตั้งเวลาไม่ว่าง — พี่ติวพร้อมรับงานทุกเวลาในตอนนี้
          </li>
        )}
        {list.data?.map((rule) => (
          <UnavailabilityChip
            key={rule.id}
            rule={rule}
            onRemove={() => remove.mutate(rule.id)}
            disabled={remove.isPending}
          />
        ))}
      </ul>

      <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        <SelectField label="วัน">
          <select
            value={String(weekday)}
            onChange={(e) => {
              const v = e.target.value;
              setWeekday(v === "all" ? "all" : Number(v));
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium"
          >
            {WEEKDAY_OPTIONS.map((w) => (
              <option key={String(w.value)} value={String(w.value)}>
                {w.label}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="เหตุผล (ไม่บังคับ)">
          <input
            type="text"
            placeholder="เช่น พักกลางวัน"
            maxLength={120}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
          />
        </SelectField>

        <SelectField label="เวลาเริ่ม">
          <select
            value={startMinute}
            onChange={(e) => setStartMinute(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium tabular-nums"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="เวลาสิ้นสุด">
          <select
            value={endMinute}
            onChange={(e) => setEndMinute(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium tabular-nums"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
            {/* 24:00 isn't a JS minute but acceptable as schema's max bound. */}
            <option value={1440}>24:00</option>
          </select>
        </SelectField>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="default"
        onClick={submit}
        disabled={create.isPending}
        className="w-full"
      >
        <Plus size={16} />
        {create.isPending ? "กำลังเพิ่ม…" : "เพิ่มเวลาไม่ว่าง"}
      </Button>
    </section>
  );
}

function UnavailabilityChip({
  rule,
  onRemove,
  disabled,
}: {
  rule: TutorUnavailability;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">
          {weekdayLabel(rule.weekday)} {formatMinute(rule.startMinute)}–
          {rule.endMinute === 1440 ? "24:00" : formatMinute(rule.endMinute)}
        </p>
        {rule.reason && (
          <p className="text-[11px] text-slate-500 truncate">{rule.reason}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="w-8 h-8 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center shrink-0 disabled:opacity-40"
        aria-label="ลบ"
      >
        <X size={14} />
      </button>
    </li>
  );
}

function SelectField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
