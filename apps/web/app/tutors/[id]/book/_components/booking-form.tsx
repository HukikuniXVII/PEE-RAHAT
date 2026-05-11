"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateBookingDto,
  type Tutor,
  createBookingSchema,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";

interface Props {
  tutor: Tutor;
}

const DURATION_PRESETS = [60, 90, 120] as const;

export function BookingForm({ tutor }: Props) {
  const form = useForm<CreateBookingDto>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      tutorId: tutor.id,
      subject: tutor.subjects[0] ?? "Math",
      scheduledAt: "",
      durationMinutes: 60,
    },
    mode: "onChange",
  });

  const create = useMutation({
    mutationFn: (dto: CreateBookingDto) =>
      createApiClient().bookings.create(dto),
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate({
      ...values,
      scheduledAt: new Date(values.scheduledAt).toISOString(),
    });
  });

  const duration = form.watch("durationMinutes");
  const estimatedAmount = Math.round((tutor.hourlyRate * duration) / 60);

  if (create.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-12 rounded-[40px] border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900">
          ส่งคำขอเรียบร้อย
        </h2>
        <p className="text-slate-500 leading-relaxed">
          คำขอจองคลาสของคุณถูกส่งให้พี่{" "}
          <span className="font-bold text-slate-800">{tutor.displayName}</span> แล้ว
          <br />
          พี่ติวจะตอบกลับภายใน 24 ชั่วโมง คุณจะได้รับการแจ้งเตือนเมื่อพี่กดรับงาน
          และจะได้รับลิงก์ชำระเงินผ่านระบบ Escrow
        </p>
        <Link
          href="/tutors"
          className="inline-block px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
        >
          กลับไปดูพี่ติวคนอื่น
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-10"
    >
      <header className="flex items-start gap-4">
        <img
          src={tutor.avatarUrl}
          alt={tutor.displayName}
          className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100"
        />
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
            Book a session with
          </p>
          <h1 className="text-2xl font-black text-slate-900">
            {tutor.displayName}
          </h1>
          <p className="text-sm text-slate-500">
            {tutor.faculty} • ฿{tutor.hourlyRate.toLocaleString()}/hr
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          วิชา
        </label>
        <select
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
          {...form.register("subject")}
        >
          {tutor.subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <CalendarClock size={14} />
          วันและเวลาเริ่มเรียน
        </label>
        <input
          type="datetime-local"
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
          {...form.register("scheduledAt")}
        />
        {form.formState.errors.scheduledAt && (
          <p className="text-xs text-rose-600 font-medium">
            {form.formState.errors.scheduledAt.message}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} />
          ความยาวคลาส
        </label>
        <div className="flex gap-3">
          {DURATION_PRESETS.map((mins) => (
            <label
              key={mins}
              className={cn(
                "flex-1 cursor-pointer text-center py-4 rounded-2xl border text-sm font-bold transition-all",
                duration === mins
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                  : "bg-slate-50 text-slate-500 border-slate-100 hover:border-indigo-200",
              )}
            >
              <input
                type="radio"
                value={mins}
                className="hidden"
                {...form.register("durationMinutes", { valueAsNumber: true })}
              />
              {mins} นาที
            </label>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 rounded-3xl border border-slate-100 p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Estimated total
          </p>
          <p className="text-3xl font-black text-slate-900">
            ฿{estimatedAmount.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400">
            ราคาสุดท้ายจะคำนวณโดยระบบหลังพี่ติวกดรับงาน
          </p>
        </div>
        <div className="flex items-start gap-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 max-w-[180px]">
          <ShieldCheck size={14} className="text-emerald-600 mt-0.5 shrink-0" />
          <span>
            เงินจะอยู่ใน Escrow จนกว่าคลาสจะเสร็จและไม่มี Report ภายใน 24 ชม.
          </span>
        </div>
      </section>

      {create.error && (
        <p className="text-sm text-rose-600 font-medium text-center">
          {create.error.message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!form.formState.isValid || create.isPending}
        className="w-full text-lg"
      >
        {create.isPending ? "กำลังส่งคำขอ..." : "ส่งคำขอจองคลาส"}
      </Button>
    </form>
  );
}
