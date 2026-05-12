"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type Subject,
  type TutorOnboardingDto,
  subjectSchema,
  tutorOnboardingSchema,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";

const SUBJECT_OPTIONS = subjectSchema.options as readonly Subject[];

const SUBJECT_LABEL: Record<Subject, string> = {
  Math: "คณิตศาสตร์",
  Physics: "ฟิสิกส์",
  Chemistry: "เคมี",
  Biology: "ชีววิทยา",
  English: "อังกฤษ",
  Social: "สังคม",
  Thai: "ภาษาไทย",
};

interface Props {
  onCompleted: () => void;
}

export function ProfileStep({ onCompleted }: Props) {
  const form = useForm<TutorOnboardingDto>({
    resolver: zodResolver(tutorOnboardingSchema),
    defaultValues: {
      bio: "",
      university: "",
      faculty: "",
      hourlyRate: 300,
      subjects: [],
      introVideoUrl: undefined,
    },
    mode: "onTouched",
  });

  const onboard = useMutation({
    mutationFn: (dto: TutorOnboardingDto) => createApiClient().tutors.onboard(dto),
    onSuccess: onCompleted,
  });

  const onSubmit = form.handleSubmit((values) => onboard.mutate(values));
  const subjects = form.watch("subjects");
  const error =
    onboard.error?.message ??
    form.formState.errors.bio?.message ??
    form.formState.errors.university?.message ??
    form.formState.errors.faculty?.message ??
    form.formState.errors.hourlyRate?.message ??
    form.formState.errors.subjects?.message ??
    form.formState.errors.introVideoUrl?.message ??
    null;

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900">
          ร่วมเป็น &quot;พี่รหัส&quot; มือโปร
        </h2>
        <p className="text-slate-500">
          เริ่มต้นด้วยข้อมูลโปรไฟล์พี่ติว — ขั้นต่อไปจะเป็นการอัปโหลด KYC
        </p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
          <Sparkles className="text-indigo-600 mt-1" size={18} />
          <p className="text-xs text-indigo-700 leading-relaxed">
            ข้อมูลนี้จะแสดงในหน้าโปรไฟล์ของคุณเมื่อ Admin อนุมัติ KYC แล้ว
            (สามารถแก้ไขภายหลังได้)
          </p>
        </div>

        <Field label="แนะนำตัว (อย่างน้อย 20 ตัวอักษร)" error={form.formState.errors.bio?.message}>
          <textarea
            rows={4}
            placeholder="สวัสดีครับ ผม… กำลังศึกษาอยู่ที่… มีประสบการณ์ติว…"
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            {...form.register("bio")}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="มหาวิทยาลัย" error={form.formState.errors.university?.message}>
            <input
              type="text"
              placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              {...form.register("university")}
            />
          </Field>
          <Field label="คณะ" error={form.formState.errors.faculty?.message}>
            <input
              type="text"
              placeholder="เช่น วิศวกรรมศาสตร์"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              {...form.register("faculty")}
            />
          </Field>
        </div>

        <Field label="ค่าตัวต่อชั่วโมง (บาท)" error={form.formState.errors.hourlyRate?.message}>
          <input
            type="number"
            min={0}
            max={20000}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            {...form.register("hourlyRate", { valueAsNumber: true })}
          />
        </Field>

        <Field label="วิชาที่สอน" error={form.formState.errors.subjects?.message}>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_OPTIONS.map((s) => {
              const active = subjects.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? subjects.filter((x) => x !== s)
                      : [...subjects, s];
                    form.setValue("subjects", next, { shouldValidate: true });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    active
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100",
                  )}
                >
                  {SUBJECT_LABEL[s]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="วิดีโอแนะนำตัว (URL, ไม่บังคับ)"
          error={form.formState.errors.introVideoUrl?.message}
        >
          <input
            type="url"
            placeholder="https://youtu.be/…"
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            {...form.register("introVideoUrl")}
          />
        </Field>

        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={onboard.isPending}
          className="w-full"
        >
          {onboard.isPending ? "กำลังบันทึก…" : "บันทึกและไปยังขั้นตอนถัดไป"}
        </Button>

        {error && (
          <p className="text-sm text-rose-600 font-medium text-center">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      {children}
      {error && <span className="block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
