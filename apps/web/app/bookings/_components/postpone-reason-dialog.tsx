"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type PostponeOpenResult,
  type PostponeRequestDto,
  postponeRequestSchema,
} from "@peerahat/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";

interface Props {
  bookingId: string;
  onClose: () => void;
  onOpened: (result: PostponeOpenResult) => void;
}

export function PostponeReasonDialog({ bookingId, onClose, onOpened }: Props) {
  const form = useForm<PostponeRequestDto>({
    resolver: zodResolver(postponeRequestSchema),
    defaultValues: { reason: "" },
    mode: "onChange",
  });

  const open = useMutation({
    mutationFn: (dto: PostponeRequestDto) =>
      createApiClient().bookings.postpone.initiate(bookingId, dto),
    onSuccess: (result) => {
      onOpened(result);
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form
          onSubmit={form.handleSubmit((values) => open.mutate(values))}
          className="p-8 space-y-6"
        >
          <div className="space-y-2">
            <DialogTitle>ขอเลื่อนคลาส</DialogTitle>
            <DialogDescription className="text-xs">
              จะเปิดห้องแชทเจรจาเวลาใหม่ 2 ชั่วโมง อีกฝ่ายต้องตอบกลับภายในกรอบเวลานี้
            </DialogDescription>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              เหตุผล
            </label>
            <textarea
              placeholder="เล่าเหตุผลให้อีกฝ่ายเข้าใจ (5–500 ตัวอักษร)"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[120px] resize-none"
              {...form.register("reason")}
            />
          </div>

          {open.error && (
            <p className="text-xs text-rose-600 font-medium">
              {open.error.message}
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
              type="submit"
              disabled={!form.formState.isValid || open.isPending}
              className="flex-1"
            >
              {open.isPending ? "กำลังเปิดเจรจา..." : "เปิดห้องเจรจา"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
