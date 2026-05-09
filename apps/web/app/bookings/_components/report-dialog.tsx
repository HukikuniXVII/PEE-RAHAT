"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type BookingReportDto, bookingReportSchema } from "@peerahat/types";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.form
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onSubmit={form.handleSubmit((values) => report.mutate(values))}
        className="w-full max-w-md bg-white rounded-[32px] border border-slate-200 shadow-2xl p-8 space-y-6"
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">แจ้งปัญหาคลาส</h2>
          <p className="text-xs text-slate-500">
            แอดมินจะระงับการจ่ายเงินและตรวจสอบภายใน 24 ชั่วโมง
          </p>
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
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={!form.formState.isValid || report.isPending}
            className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all disabled:opacity-50"
          >
            {report.isPending ? "กำลังส่ง..." : "ส่งรายงาน"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
