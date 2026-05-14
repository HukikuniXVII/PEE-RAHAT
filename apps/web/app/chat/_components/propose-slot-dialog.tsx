"use client";

import {
  type BookingOverlapError,
  type BusySlot,
  type ProposeSlotDto,
  proposeSlotSchema,
} from "@peerahat/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@peerahat/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type DurationMinutes,
  SlotPicker,
  combineDateAndMinute,
} from "@/components/slot-picker";
import { createApiClient } from "@/lib/api-client";

const MIN_NEW_SLOT_HOURS = 24;

interface Props {
  bookingId: string;
  tutorId: string;
  onClose: () => void;
  onProposed: () => void;
}

export function ProposeSlotDialog({
  bookingId,
  tutorId,
  onClose,
  onProposed,
}: Props) {
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [slotMinutes, setSlotMinutes] = useState<number | null>(null);
  const [duration, setDuration] = useState<DurationMinutes>(60);

  const scheduledAt = useMemo(
    () =>
      dateIso !== null && slotMinutes !== null
        ? combineDateAndMinute(dateIso, slotMinutes)
        : null,
    [dateIso, slotMinutes],
  );

  const tooSoon = useMemo(() => {
    if (!scheduledAt) return true;
    const minMs = Date.now() + MIN_NEW_SLOT_HOURS * 60 * 60 * 1000;
    return new Date(scheduledAt).getTime() < minMs;
  }, [scheduledAt]);

  // FR-TH-15: grey conflicting slots (caller + tutor side). assertNoOverlap
  // server-side excludes the booking we're postponing via excludeBookingId,
  // but the listBusy endpoints don't, so the original slot will appear
  // busy here — that's intentional UX (proposing the same time as current
  // doesn't make sense and would fail the ≥24h check anyway).
  const busyWindow = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(from.getDate() + 9);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }, []);
  const tutorBusyQuery = useQuery({
    queryKey: ["tutors", "availability", tutorId, busyWindow.fromIso],
    queryFn: () =>
      createApiClient().tutors.availability(
        tutorId,
        busyWindow.fromIso,
        busyWindow.toIso,
      ),
  });
  const mineBusyQuery = useQuery({
    queryKey: ["bookings", "mineBusy", busyWindow.fromIso],
    queryFn: () =>
      createApiClient().bookings.mineBusy(busyWindow.fromIso, busyWindow.toIso),
  });
  const busy: BusySlot[] = useMemo(
    () => [
      ...(tutorBusyQuery.data?.busy ?? []),
      ...(mineBusyQuery.data?.busy ?? []),
    ],
    [tutorBusyQuery.data, mineBusyQuery.data],
  );

  const propose = useMutation({
    mutationFn: (dto: ProposeSlotDto) =>
      createApiClient().bookings.postpone.propose(bookingId, dto),
    onSuccess: () => {
      onProposed();
      onClose();
    },
    onError: (err) => {
      const e = err as unknown as Partial<BookingOverlapError>;
      if (e?.code === "BOOKING_OVERLAP") {
        toast.error("ช่วงเวลานี้ถูกจองแล้ว");
      }
    },
  });

  const submit = () => {
    if (!scheduledAt) return;
    const dto = { scheduledAt, durationMinutes: duration };
    const parsed = proposeSlotSchema.safeParse(dto);
    if (!parsed.success) return;
    propose.mutate(parsed.data);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <DialogTitle>เสนอเวลาใหม่</DialogTitle>
            <DialogDescription className="text-xs">
              ต้องล่วงหน้าอย่างน้อย 24 ชั่วโมงจากตอนนี้
            </DialogDescription>
          </div>

          <SlotPicker
            dateIso={dateIso}
            onDate={(iso) => {
              setDateIso(iso);
              setSlotMinutes(null);
            }}
            slotMinutes={slotMinutes}
            onSlot={setSlotMinutes}
            duration={duration}
            onDuration={setDuration}
            busy={busy}
          />

          {scheduledAt && tooSoon && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2">
              เวลาที่เลือกใกล้เกินไป — ต้องล่วงหน้าอย่างน้อย 24 ชั่วโมง
            </p>
          )}

          {propose.error && (
            <p className="text-xs text-rose-600 font-medium">
              {propose.error.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="muted"
              onClick={onClose}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!scheduledAt || tooSoon || propose.isPending}
              className="flex-1"
            >
              {propose.isPending ? "กำลังส่ง..." : "ส่งข้อเสนอ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
