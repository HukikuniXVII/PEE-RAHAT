"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type BookingReportDto, bookingReportSchema } from "@peerahat/types";
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
  onReported: () => void;
}

export function ReportDialog({ bookingId, onClose, onReported }: Props) {
  const form = useForm<BookingReportDto>({
    resolver: zodResolver(bookingReportSchema),
    defaultValues: { reason: "noShow", details: "" },
    mode: "onChange",
  });

  const report = useMutation({
    mutationFn: (dto: BookingReportDto) =>
      createApiClient().bookings.report(bookingId, dto),
    onSuccess: () => {
      onReported();
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <form
          onSubmit={form.handleSubmit((values) => report.mutate(values))}
          className="p-8 space-y-6"
        >
          <div className="space-y-2">
            <DialogTitle>แจ้งปัญหาคลาส</DialogTitle>
            <DialogDescription className="text-xs">
              แอดมินจะระงับการจ่ายเงินและตรวจสอบภายใน 24 ชั่วโมง
            </DialogDescription>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              เหตุผล
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
              {...form.register("reason")}
            >
              <option value="noShow">พี่ติวไม่มาเรียน</option>
              <option value="lateArrival">พี่ติวมาสายเกิน 15 นาที</option>
              <option value="qualityIssue">คุณภาพการสอนไม่ตรงตามที่ระบุ</option>
              <option value="conductIssue">พฤติกรรมไม่เหมาะสม</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              รายละเอียด
            </label>
            <textarea
              placeholder="ช่วยเล่ารายละเอียดเพื่อให้ทีมงานตรวจสอบได้ถูกต้อง"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[120px] resize-none"
              {...form.register("details")}
            />
          </div>

          {report.error && (
            <p className="text-xs text-rose-600 font-medium">
              {report.error.message}
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
              variant="destructive"
              disabled={!form.formState.isValid || report.isPending}
              className="flex-1"
            >
              {report.isPending ? "กำลังส่ง..." : "ส่งรายงาน"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
