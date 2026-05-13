"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type Subject,
  type Tutor,
  type TutorProfileUpdateDto,
  subjectSchema,
  tutorProfileUpdateSchema,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  tutor: Tutor;
}

export function ProfileEditForm({ tutor }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const form = useForm<TutorProfileUpdateDto>({
    resolver: zodResolver(tutorProfileUpdateSchema),
    defaultValues: {
      bio: tutor.bio,
      university: tutor.university,
      faculty: tutor.faculty,
      hourlyRate: tutor.hourlyRate,
      subjects: tutor.subjects,
      introVideoUrl: tutor.introVideoUrl ?? undefined,
    },
    mode: "onTouched",
  });

  const update = useMutation({
    mutationFn: (dto: TutorProfileUpdateDto) =>
      createApiClient().tutors.updateMe(dto),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      router.refresh();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setSaved(false);
    update.mutate(values);
  });

  const subjects = form.watch("subjects") ?? [];
  const error =
    update.error?.message ??
    form.formState.errors.bio?.message ??
    form.formState.errors.university?.message ??
    form.formState.errors.faculty?.message ??
    form.formState.errors.hourlyRate?.message ??
    form.formState.errors.subjects?.message ??
    form.formState.errors.introVideoUrl?.message ??
    null;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900">แก้ไขโปรไฟล์</h1>
        <p className="text-sm text-slate-500">
          อัปเดตข้อมูลที่นักเรียนเห็นในหน้าโปรไฟล์ของคุณ
        </p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
        <Field
          label="แนะนำตัว (อย่างน้อย 20 ตัวอักษร)"
          error={form.formState.errors.bio?.message}
        >
          <textarea
            rows={4}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            {...form.register("bio")}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="มหาวิทยาลัย"
            error={form.formState.errors.university?.message}
          >
            <input
              type="text"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              {...form.register("university")}
            />
          </Field>
          <Field
            label="คณะ"
            error={form.formState.errors.faculty?.message}
          >
            <input
              type="text"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              {...form.register("faculty")}
            />
          </Field>
        </div>

        <Field
          label="ค่าตัวต่อชั่วโมง (บาท)"
          error={form.formState.errors.hourlyRate?.message}
        >
          <input
            type="number"
            min={0}
            max={20000}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            {...form.register("hourlyRate", { valueAsNumber: true })}
          />
        </Field>

        <Field
          label="วิชาที่สอน"
          error={form.formState.errors.subjects?.message}
        >
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
          disabled={update.isPending}
          className="w-full"
        >
          {update.isPending ? "กำลังบันทึก…" : "บันทึก"}
        </Button>

        {saved && !update.isPending && !error && (
          <p className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium">
            <CheckCircle2 size={16} />
            บันทึกแล้ว
          </p>
        )}

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
