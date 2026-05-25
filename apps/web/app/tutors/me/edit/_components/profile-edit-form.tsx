"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  SUBJECT_LABELS,
  THAI_FACULTIES,
  THAI_UNIVERSITIES,
  type Subject,
  type Tutor,
  type TutorProfileUpdateDto,
  subjectSchema,
  tutorProfileUpdateSchema,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

import { SelectWithOther } from "../../../_components/select-with-other";
import { UnavailabilityEditor } from "./unavailability-editor";

const SUBJECT_OPTIONS = subjectSchema.options as readonly Subject[];

const SUBJECT_LABEL = SUBJECT_LABELS;

interface Props {
  tutor: Tutor;
  initialDisplayName: string;
  initialAvatarUrl: string;
}

export function ProfileEditForm({
  tutor,
  initialDisplayName,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const fileInput = useRef<HTMLInputElement | null>(null);

  // FR-TH-04: VideoPendingBanner and ProfileCompletionPanel both deep-link
  // to this form's intro-video input via `?focus=video`. On mount (and any
  // subsequent search-param change), focus the field and flash an accent
  // ring around it for ~1.5s so the tutor visually lands on the right spot.
  const [videoFlash, setVideoFlash] = useState(false);
  useEffect(() => {
    if (searchParams?.get("focus") !== "video") return;
    const el = document.getElementById("intro-video-input");
    if (el && el instanceof HTMLInputElement) {
      el.focus({ preventScroll: true });
      setVideoFlash(true);
      const t = setTimeout(() => setVideoFlash(false), 1500);
      // Strip the param so a refresh doesn't re-trigger the flash.
      const url = new URL(window.location.href);
      url.searchParams.delete("focus");
      window.history.replaceState(null, "", url.toString());
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const api = createApiClient();
      const intent = await api.users.requestAvatarUpload(file.type);
      const put = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok && !intent.uploadUrl.startsWith("https://storage.local")) {
        throw new Error(`Avatar upload failed: ${put.status}`);
      }
      return intent.publicUrl;
    },
    onSuccess: (url) => {
      setAvatarUrl(url);
      toast.success("อัปโหลดรูปแล้ว — กดบันทึกเพื่อยืนยัน");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveAccount = useMutation({
    mutationFn: () =>
      createApiClient().users.updateMe({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      }),
  });

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
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaved(false);
    const accountChanged =
      displayName.trim() !== initialDisplayName ||
      (avatarUrl.trim() || undefined) !== (initialAvatarUrl || undefined);
    await Promise.all([
      update.mutateAsync(values),
      accountChanged ? saveAccount.mutateAsync() : Promise.resolve(),
    ]);
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    router.refresh();
  });

  const subjects = form.watch("subjects") ?? [];
  const error =
    update.error?.message ??
    saveAccount.error?.message ??
    form.formState.errors.bio?.message ??
    form.formState.errors.university?.message ??
    form.formState.errors.faculty?.message ??
    form.formState.errors.hourlyRate?.message ??
    form.formState.errors.subjects?.message ??
    form.formState.errors.introVideoUrl?.message ??
    null;
  const pending =
    update.isPending || saveAccount.isPending || uploadAvatar.isPending;

  // Track whether the user has changed anything since the last save.
  // RHF covers the bio/uni/faculty/rate/subjects/introVideoUrl fields;
  // displayName + avatarUrl live as separate state so we compare them
  // against the initial props directly. The confirm/cancel buttons gate
  // on this so the user can't accidentally re-submit an unchanged form.
  const accountDirty =
    displayName.trim() !== initialDisplayName ||
    (avatarUrl.trim() || undefined) !== (initialAvatarUrl || undefined);
  const isDirty = form.formState.isDirty || accountDirty;

  function handleCancel() {
    form.reset({
      bio: tutor.bio,
      university: tutor.university,
      faculty: tutor.faculty,
      hourlyRate: tutor.hourlyRate,
      subjects: tutor.subjects,
      introVideoUrl: tutor.introVideoUrl ?? undefined,
    });
    setDisplayName(initialDisplayName);
    setAvatarUrl(initialAvatarUrl);
    setSaved(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900">แก้ไขโปรไฟล์</h1>
        <p className="text-sm text-slate-500">
          อัปเดตข้อมูลที่นักเรียนเห็นในหน้าโปรไฟล์ของคุณ
        </p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-slate-100 border border-slate-100 flex items-center justify-center text-xl font-black text-slate-400">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar.mutate(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadAvatar.isPending}
              onClick={() => fileInput.current?.click()}
            >
              {uploadAvatar.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              เปลี่ยนรูปโปรไฟล์
            </Button>
            <p className="text-[11px] text-slate-400">
              JPG/PNG/WebP — ขนาดประมาณ 400×400 ขึ้นไป
            </p>
          </div>
        </div>

        <Field label="ชื่อที่แสดง">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </Field>

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
            <SelectWithOther
              value={form.watch("university") ?? ""}
              onChange={(next) =>
                form.setValue("university", next, { shouldValidate: true })
              }
              options={THAI_UNIVERSITIES}
              emptyLabel="เลือกมหาวิทยาลัย"
              otherPlaceholder="ระบุชื่อมหาวิทยาลัย"
            />
          </Field>
          <Field
            label="คณะ"
            error={form.formState.errors.faculty?.message}
          >
            <SelectWithOther
              value={form.watch("faculty") ?? ""}
              onChange={(next) =>
                form.setValue("faculty", next, { shouldValidate: true })
              }
              options={THAI_FACULTIES}
              emptyLabel="เลือกคณะ"
              otherPlaceholder="ระบุชื่อคณะ"
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
            id="intro-video-input"
            type="url"
            placeholder="https://youtu.be/…"
            className={cn(
              "w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-shadow scroll-mt-24",
              videoFlash
                ? "border-accent-500 ring-4 ring-accent-500/40 animate-pulse"
                : "border-slate-200",
            )}
            {...form.register("introVideoUrl")}
          />
        </Field>

        <UnavailabilityEditor />

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={handleCancel}
            disabled={pending || !isDirty}
            className="sm:flex-1 sm:basis-1/3"
          >
            ยกเลิกการแก้ไข
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={pending || !isDirty}
            className="sm:flex-1 sm:basis-2/3"
          >
            {pending ? "กำลังบันทึก…" : "ยืนยันและบันทึก"}
          </Button>
        </div>

        {!isDirty && !saved && (
          <p className="thai text-[11.5px] text-ink-mute text-center">
            แก้ไขข้อมูลใดข้อมูลหนึ่งเพื่อเปิดปุ่มบันทึก
          </p>
        )}

        {saved && !pending && !error && (
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
