"use client";

import {
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
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  type DurationMinutes,
  SlotPicker,
  combineDateAndHour,
} from "@/components/slot-picker";
import { createApiClient } from "@/lib/api-client";

const MIN_NEW_SLOT_HOURS = 24;

interface Props {
  bookingId: string;
  onClose: () => void;
  onProposed: () => void;
}

export function ProposeSlotDialog({ bookingId, onClose, onProposed }: Props) {
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [duration, setDuration] = useState<DurationMinutes>(60);

  const scheduledAt = useMemo(
    () =>
      dateIso !== null && hour !== null
        ? combineDateAndHour(dateIso, hour)
        : null,
    [dateIso, hour],
  );

  const tooSoon = useMemo(() => {
    if (!scheduledAt) return true;
    const minMs = Date.now() + MIN_NEW_SLOT_HOURS * 60 * 60 * 1000;
    return new Date(scheduledAt).getTime() < minMs;
  }, [scheduledAt]);

  const propose = useMutation({
    mutationFn: (dto: ProposeSlotDto) =>
      createApiClient().bookings.postpone.propose(bookingId, dto),
    onSuccess: () => {
      onProposed();
      onClose();
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
              setHour(null);
            }}
            hour={hour}
            onHour={setHour}
            duration={duration}
            onDuration={setDuration}
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
