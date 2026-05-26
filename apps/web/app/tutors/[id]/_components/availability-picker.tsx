"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";

import { SlotPicker } from "@/components/slot-picker";
import { createApiClient } from "@/lib/api-client";

/**
 * Profile-page preview. Renders the same <SlotPicker> the booking form
 * uses so day-chip + slot styling, the disabled-state tooltips, and the
 * dateIso local-date fix are inherited automatically.
 *
 * Read-only behaviour: dateIso is local state (so the visitor can flip
 * between days), but onSlot is a noop — the picker still highlights a
 * tapped slot for visual feedback, then the visitor jumps to the actual
 * booking flow via the CTA below to commit.
 */
interface Props {
  tutorId: string;
}

const PROFILE_HELPER = "ดูตารางว่าง 7 วันข้างหน้า — ไปที่หน้าจองเพื่อเลือกเวลา";

export function AvailabilityPicker({ tutorId }: Props) {
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [slotMinutes, setSlotMinutes] = useState<number | null>(null);

  const fetchWindow = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(from.getDate() + 9);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }, []);

  const { data } = useQuery({
    queryKey: ["tutors", "availability", tutorId, fetchWindow.fromIso],
    queryFn: () =>
      createApiClient().tutors.availability(
        tutorId,
        fetchWindow.fromIso,
        fetchWindow.toIso,
      ),
  });
  const busy = data?.busy ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <CalendarClock size={14} />
        ตารางเวลาที่ว่าง (7 วันข้างหน้า)
      </div>
      <SlotPicker
        dateIso={dateIso}
        onDate={(iso) => {
          setDateIso(iso);
          setSlotMinutes(null);
        }}
        slotMinutes={slotMinutes}
        onSlot={setSlotMinutes}
        hideDuration
        busy={busy}
        // 1-on-1 default — same lead-time policy as the booking flow so
        // greyed slots match exactly. Booking-form Step 1 overrides this
        // for group sessions; the profile preview always renders as 1-on-1.
        minLeadHours={0}
        helperText={PROFILE_HELPER}
      />
    </div>
  );
}
