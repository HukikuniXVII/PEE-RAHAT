"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type BankName,
  type Subject,
  SUBJECT_LABELS,
  THAI_FACULTIES,
  THAI_UNIVERSITIES,
  kycSubmitSchema,
  subjectSchema,
  tutorOnboardingSchema,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ImageIcon,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createApiClient } from "@/lib/api-client";

import { SelectWithOther } from "../../_components/select-with-other";
import { IdentitySection } from "./identity-section";
import { IntroVideoModal } from "./intro-video-modal";
import {
  OnboardingProgress,
  type StepState,
} from "./onboarding-progress";

// Combined schema: every field the new single-page form collects. The
// final submit splits values back into the two existing API calls —
// tutors.onboard for the profile half, kyc.submit for the KYC + bank +
// consent half. No backend changes needed.
const onboardingFormSchema = tutorOnboardingSchema.merge(kycSubmitSchema);
type OnboardingFormDto = z.infer<typeof onboardingFormSchema>;

const SUBJECT_OPTIONS = subjectSchema.options as readonly Subject[];

const BANK_OPTIONS: { value: BankName; label: string }[] = [
  { value: "SCB", label: "ไทยพาณิชย์ (SCB)" },
  { value: "KBank", label: "กสิกรไทย (KBank)" },
  { value: "Krungthai", label: "กรุงไทย (KTB)" },
  { value: "Bangkok", label: "กรุงเทพ (BBL)" },
  { value: "TTB", label: "ทหารไทยธนชาต (TTB)" },
  { value: "TMB", label: "ทหารไทย (TMB)" },
  { value: "Kiatnakin", label: "เกียรตินาคิน (KKP)" },
  { value: "CIMB", label: "ซีไอเอ็มบี (CIMB)" },
  { value: "UOB", label: "ยูโอบี (UOB)" },
  { value: "GSB", label: "ออมสิน (GSB)" },
  { value: "BAAC", label: "ธ.ก.ส. (BAAC)" },
  { value: "GHB", label: "อาคารสงเคราะห์ (GHB)" },
  { value: "LH", label: "แลนด์ แอนด์ เฮ้าส์ (LH)" },
  { value: "ICBC", label: "ไอซีบีซี (ICBC)" },
  { value: "TISCO", label: "ทิสโก้ (TISCO)" },
  { value: "Other", label: "ธนาคารอื่น" },
];

const MAX_PASSBOOK_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PASSBOOK_MIME = ["image/jpeg", "image/png", "image/webp"];

/**
 * Single-page tutor signup (replaces the previous 4-screen wizard).
 *
 * Layout (top to bottom):
 *   1. Identity — 3 KYC photo uploads
 *   2. Bank account — passbook + bank info
 *   3. PDPA consent
 *   4. Profile — bio, university, faculty, hourly rate, subjects, intro URL
 *
 * Profile is intentionally last per the brief: tutors who land on this
 * page first see the documents they'll need to gather, not a form. A
 * sticky progress header at the top renders 4 anchor circles that turn
 * green as each section completes; clicking a circle smooth-scrolls to
 * the matching <section>.
 *
 * Final submit fires two existing endpoints in order — POST
 * /tutors/onboarding (creates the profile) then POST /kyc/submit (KYC +
 * bank + PDPA). If the user already has a TutorProfile (revisited
 * onboarding without completing it), the first call is skipped. After a
 * successful submit, the IntroVideoModal nudge from FR-TH-04 opens and
 * routes the tutor to /tutors/me/edit on dismissal.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const meQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => createApiClient().users.me(),
    staleTime: 60_000,
    retry: false,
  });
  const existingProfileId = meQuery.data?.tutorProfileId ?? null;

  // Pre-fill profile fields from the existing TutorProfile (if any) so
  // a user who left mid-flow doesn't see empty inputs.
  const existingProfile = useQuery({
    queryKey: ["tutors", "byId", existingProfileId],
    queryFn: () => createApiClient().tutors.byId(existingProfileId!),
    enabled: !!existingProfileId,
  });

  const form = useForm<OnboardingFormDto>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      bio: "",
      university: "",
      faculty: "",
      hourlyRate: 0,
      subjects: [],
      introVideoUrl: undefined,
      idPhotoKey: "",
      selfieKey: "",
      transcriptKey: "",
      passbookObjectKey: "",
      idName: "",
      bank: {
        bankName: "SCB",
        bankAccountNumber: "",
        bankAccountName: "",
      },
      consentPdpaAccepted: false,
    },
    mode: "onChange",
  });

  // Hydrate profile fields once the existing TutorProfile loads.
  useEffect(() => {
    if (!existingProfile.data) return;
    const t = existingProfile.data;
    form.reset({
      ...form.getValues(),
      bio: t.bio,
      university: t.university,
      faculty: t.faculty,
      hourlyRate: t.hourlyRate,
      subjects: t.subjects,
      introVideoUrl: t.introVideoUrl ?? undefined,
    });
  }, [existingProfile.data, form]);

  const values = form.watch();

  // Per-section completion flags drive the progress header + the final
  // submit button. We compute them from form state rather than tracking
  // separate "confirmed" flags so the user can fill sections in any
  // order without an internal next-button per section.
  const identityDone = Boolean(
    values.idPhotoKey && values.selfieKey && values.transcriptKey,
  );
  const bankDone = Boolean(
    values.idName &&
      values.bank?.bankName &&
      /^\d{10,15}$/.test(values.bank?.bankAccountNumber ?? "") &&
      values.bank?.bankAccountName &&
      values.passbookObjectKey,
  );
  const pdpaDone = Boolean(values.consentPdpaAccepted);
  const profileDone = Boolean(
    values.bio &&
      values.bio.length >= 20 &&
      values.university &&
      values.faculty &&
      values.hourlyRate > 0 &&
      values.subjects &&
      values.subjects.length >= 1,
  );
  const allDone = identityDone && bankDone && pdpaDone && profileDone;

  const steps: StepState[] = [
    { id: "identity", label: "เอกสารยืนยันตัวตน", short: "เอกสาร", done: identityDone },
    { id: "bank", label: "บัญชีรับเงิน", short: "บัญชี", done: bankDone },
    { id: "pdpa", label: "ยินยอม PDPA", short: "PDPA", done: pdpaDone },
    { id: "profile", label: "โปรไฟล์ติวเตอร์", short: "โปรไฟล์", done: profileDone },
  ];

  // FR-TH-04: intro-video nudge modal opens after a successful submit.
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const submit = useMutation({
    mutationFn: async (dto: OnboardingFormDto) => {
      const api = createApiClient();
      // 1. Create the TutorProfile if it doesn't exist yet. Skipped when
      //    the user revisits onboarding after partial completion.
      if (!existingProfileId) {
        await api.tutors.onboard({
          bio: dto.bio,
          university: dto.university,
          faculty: dto.faculty,
          hourlyRate: dto.hourlyRate,
          subjects: dto.subjects,
          introVideoUrl: dto.introVideoUrl,
        });
      }
      // 2. Submit KYC + bank + PDPA. The server uses the userId from the
      //    auth token to attach this to the profile we just (or already)
      //    created.
      await api.kyc.submit({
        idPhotoKey: dto.idPhotoKey,
        selfieKey: dto.selfieKey,
        transcriptKey: dto.transcriptKey,
        passbookObjectKey: dto.passbookObjectKey,
        idName: dto.idName,
        bank: dto.bank,
        consentPdpaAccepted: dto.consentPdpaAccepted,
      });
    },
  });

  useEffect(() => {
    if (submit.isSuccess) setVideoModalOpen(true);
  }, [submit.isSuccess]);

  const onSubmit = form.handleSubmit((vals) => submit.mutate(vals));

  if (meQuery.isPending) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-16 rounded-[40px] border border-violet-100 shadow-sm flex items-center justify-center text-ink-mute">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  if (submit.isSuccess) {
    return (
      <>
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[40px] border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={48} />
          </div>
          <h2 className="thai text-3xl font-black text-slate-900">
            กำลังตรวจสอบข้อมูล
          </h2>
          <p className="thai text-slate-500 leading-relaxed">
            ทีมงานกำลังตรวจสอบหลักฐานการสมัครของคุณ
            <br />
            โดยปกติจะใช้เวลาไม่เกิน 24 ชั่วโมง คุณจะได้รับการแจ้งเตือนเมื่อบัญชีได้รับ Badge{" "}
            <span className="font-bold text-indigo-600">&quot;Verified&quot;</span>
          </p>
          <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center"
                >
                  <UserCheck size={14} className="text-slate-400" />
                </div>
              ))}
            </div>
            <span className="thai text-xs font-bold text-slate-400 uppercase tracking-widest">
              +500 ติวเตอร์รอคุณอยู่
            </span>
          </div>
        </div>
        <IntroVideoModal
          open={videoModalOpen}
          onClose={() => {
            setVideoModalOpen(false);
            router.push("/tutors/me/edit");
          }}
        />
      </>
    );
  }

  const submitError = submit.error?.message ?? null;

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto space-y-6">
      <OnboardingProgress steps={steps} />

      <IdentitySection
        keys={{
          idPhotoKey: values.idPhotoKey,
          selfieKey: values.selfieKey,
          transcriptKey: values.transcriptKey,
        }}
        onUploaded={(formKey, key) =>
          form.setValue(formKey, key, { shouldValidate: true })
        }
      />

      <BankSection form={form} />
      <PdpaSection form={form} />
      <ProfileSection form={form} disabled={!!existingProfileId} />

      {submitError && (
        <p className="thai text-sm text-rose-600 text-center font-medium bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
          {submitError}
        </p>
      )}

      <div className="sticky bottom-4 z-20">
        <button
          type="submit"
          disabled={!allDone || submit.isPending}
          className={cn(
            "thai w-full px-6 py-4 rounded-2xl font-bold text-base transition-all shadow-lg",
            allDone && !submit.isPending
              ? "bg-dusty-grape text-white hover:bg-violet-600 shadow-violet-200"
              : "bg-ink-mute/20 text-ink-mute cursor-not-allowed shadow-none",
          )}
        >
          {submit.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              กำลังส่งข้อมูล…
            </span>
          ) : allDone ? (
            "ส่งข้อมูลทั้งหมด · เริ่มเป็นพี่รหัส"
          ) : (
            `ทำให้ครบทุกขั้นเพื่อกดส่ง (${steps.filter((s) => s.done).length}/${steps.length})`
          )}
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 2 — Bank
// ────────────────────────────────────────────────────────────────────

function BankSection({
  form,
}: {
  form: ReturnType<typeof useForm<OnboardingFormDto>>;
}) {
  const [passbookPreview, setPassbookPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const values = form.watch();
  const passbookObjectKey = values.passbookObjectKey;
  const idName = values.idName ?? "";
  const bank = values.bank;
  const accountNumber = bank?.bankAccountNumber ?? "";
  const accountName = bank?.bankAccountName ?? "";

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const api = createApiClient();
      const intent = await api.kyc.requestUpload("passbook", file.type);
      const isStub = intent.uploadUrl.startsWith("https://storage.local");
      try {
        const put = await fetch(intent.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!put.ok && !isStub) throw new Error(`Upload failed: ${put.status}`);
      } catch (err) {
        if (!isStub) throw err;
      }
      return { objectKey: intent.objectKey, file };
    },
    onSuccess: ({ objectKey, file }) => {
      form.setValue("passbookObjectKey", objectKey, { shouldValidate: true });
      setPassbookPreview(URL.createObjectURL(file));
    },
    onError: (e) => setFileError(e.message),
  });

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);
      if (!ACCEPTED_PASSBOOK_MIME.includes(file.type)) {
        setFileError("ไฟล์ต้องเป็น JPG, PNG หรือ WebP เท่านั้น");
        return;
      }
      if (file.size > MAX_PASSBOOK_BYTES) {
        setFileError("ไฟล์ต้องไม่เกิน 5MB");
        return;
      }
      upload.mutate(file);
    },
    [upload],
  );

  const syncAccountName = () => {
    if (idName && !accountName) {
      form.setValue("bank.bankAccountName", idName, { shouldValidate: false });
    }
  };

  return (
    <section
      id="bank"
      className="scroll-mt-44 space-y-5 bg-white p-6 md:p-8 rounded-[32px] border border-violet-100 shadow-sm"
    >
      <header className="space-y-2">
        <SectionBadge n={2} label="บัญชีรับเงิน" />
        <h2 className="thai text-xl font-black text-grape-deep">
          ข้อมูลบัญชีรับเงิน
        </h2>
        <p className="thai text-sm text-ink-soft leading-relaxed">
          ใช้สำหรับโอนค่าตอบแทนทุกวันที่ 15 และ 30 ของเดือน —{" "}
          <strong className="text-grape-deep">
            ชื่อบัญชีต้องตรงกับชื่อในบัตรประชาชน
          </strong>
        </p>
      </header>

      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
        <Info className="text-amber-600 shrink-0 mt-0.5" size={16} />
        <p className="thai text-[11.5px] text-amber-800 leading-relaxed">
          ระบบจะตรวจชื่อบัญชีอัตโนมัติ ถ้าไม่ตรงกับบัตรประชาชน
          การโอนค่าตอบแทนจะถูกระงับจนกว่าจะแก้ไข
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1.5 md:col-span-2">
          <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
            ชื่อ-นามสกุล ตามบัตรประชาชน
          </span>
          <input
            type="text"
            value={idName}
            onChange={(e) =>
              form.setValue("idName", e.target.value, { shouldValidate: true })
            }
            onBlur={syncAccountName}
            placeholder="เช่น นาย ก ขขขขข"
            className="thai w-full px-4 py-3 rounded-2xl border border-violet-100 text-sm focus:ring-2 focus:ring-dusty-grape/20 focus:border-dusty-grape outline-none"
          />
        </label>

        <label className="space-y-1.5">
          <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
            ธนาคาร
          </span>
          <select
            value={bank?.bankName ?? ""}
            onChange={(e) =>
              form.setValue("bank.bankName", e.target.value as BankName, {
                shouldValidate: true,
              })
            }
            className="thai w-full px-4 py-3 rounded-2xl border border-violet-100 text-sm bg-white focus:ring-2 focus:ring-dusty-grape/20 focus:border-dusty-grape outline-none"
          >
            <option value="">เลือกธนาคาร</option>
            {BANK_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
            เลขที่บัญชี
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            value={accountNumber}
            onChange={(e) =>
              form.setValue(
                "bank.bankAccountNumber",
                e.target.value.replace(/\D/g, ""),
                { shouldValidate: true },
              )
            }
            placeholder="1234567890"
            maxLength={15}
            className="w-full px-4 py-3 rounded-2xl border border-violet-100 text-sm font-mono tracking-wider focus:ring-2 focus:ring-dusty-grape/20 focus:border-dusty-grape outline-none"
          />
          <span className="thai text-[10px] text-ink-mute">
            10–15 หลัก ไม่ต้องมีขีดคั่น
          </span>
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
            ชื่อบัญชี
          </span>
          <input
            type="text"
            value={accountName}
            onChange={(e) =>
              form.setValue("bank.bankAccountName", e.target.value, {
                shouldValidate: true,
              })
            }
            placeholder="ต้องตรงกับชื่อในบัตรประชาชน"
            className="thai w-full px-4 py-3 rounded-2xl border border-violet-100 text-sm focus:ring-2 focus:ring-dusty-grape/20 focus:border-dusty-grape outline-none"
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
          สมุดบัญชี / สลิป e-Passbook
        </p>
        <label
          className={cn(
            "block w-full bg-grape-soft/30 rounded-3xl border-2 border-dashed transition-all p-5 cursor-pointer",
            passbookObjectKey
              ? "border-emerald-300 bg-emerald-50/40"
              : "border-violet-200 hover:border-violet-400",
            upload.isPending && "opacity-60 cursor-not-allowed",
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={upload.isPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {passbookPreview ? (
            <div className="flex items-center gap-4">
              <img
                src={passbookPreview}
                alt="passbook"
                className="w-20 h-20 rounded-2xl object-cover border border-emerald-200"
              />
              <div className="flex-1">
                <p className="thai text-sm font-bold text-emerald-700 inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  อัปโหลดเรียบร้อย
                </p>
                <p className="thai text-[10px] text-emerald-600 mt-1">
                  กดเลือกไฟล์ใหม่เพื่อแทนที่
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-ink-mute shrink-0">
                {upload.isPending ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <ImageIcon size={22} />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <p className="thai font-bold text-grape-deep text-sm">
                  อัปโหลดสมุดบัญชี / สกรีนช็อต e-Passbook
                </p>
                <p className="thai text-[11px] text-ink-soft leading-relaxed">
                  สกรีนช็อตจากแอปธนาคารที่เห็นชื่อบัญชีและเลขบัญชีชัดเจน
                </p>
                <p className="thai text-[10px] text-ink-mute">
                  JPG, PNG, WebP (ไม่เกิน 5MB)
                </p>
              </div>
              <span className="thai px-4 py-2 bg-dusty-grape text-white rounded-xl font-bold text-xs shrink-0 inline-flex items-center gap-1.5">
                <Upload size={12} />
                เลือกไฟล์
              </span>
            </div>
          )}
        </label>
        {fileError && (
          <p className="thai text-[11px] text-rose-600 font-medium">
            {fileError}
          </p>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 3 — PDPA consent
// ────────────────────────────────────────────────────────────────────

function PdpaSection({
  form,
}: {
  form: ReturnType<typeof useForm<OnboardingFormDto>>;
}) {
  const accepted = form.watch("consentPdpaAccepted");
  return (
    <section
      id="pdpa"
      className="scroll-mt-44 space-y-4 bg-white p-6 md:p-8 rounded-[32px] border border-violet-100 shadow-sm"
    >
      <header className="space-y-2">
        <SectionBadge n={3} label="ยินยอม PDPA" />
        <h2 className="thai text-xl font-black text-grape-deep">
          ยินยอมเก็บข้อมูลส่วนบุคคล
        </h2>
        <p className="thai text-sm text-ink-soft leading-relaxed">
          เราเก็บข้อมูลของคุณตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          (PDPA) อย่างเคร่งครัด
        </p>
      </header>

      <ul className="thai text-[12.5px] text-ink-soft space-y-1.5 list-disc pl-5">
        <li>ใช้เอกสารยืนยันตัวตนเพื่อออก Verified Badge เท่านั้น</li>
        <li>เก็บแบบเข้ารหัส AES-256-GCM และย้ายเข้าระบบเก็บถาวรภายใน 24 ชม.</li>
        <li>
          ใช้ข้อมูลบัญชีเพื่อโอนค่าตอบแทนและจัดการระบบพักเงิน (escrow)
        </li>
        <li>คุณสามารถถอนความยินยอมและขอลบข้อมูลได้ตลอดเวลา</li>
      </ul>

      <p className="thai text-[11.5px] text-ink-mute">
        รายละเอียดฉบับเต็ม:{" "}
        <a
          href="/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-dusty-grape hover:text-violet-700 underline underline-offset-2"
        >
          นโยบายความเป็นส่วนตัว
        </a>
      </p>

      <label
        className={cn(
          "flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-colors",
          accepted
            ? "border-emerald-300 bg-emerald-50/40"
            : "border-violet-200 hover:border-violet-300 bg-white",
        )}
      >
        <input
          type="checkbox"
          checked={!!accepted}
          onChange={(e) =>
            form.setValue("consentPdpaAccepted", e.target.checked, {
              shouldValidate: true,
            })
          }
          className="mt-0.5 w-5 h-5 rounded accent-dusty-grape shrink-0"
        />
        <span className="thai text-[13px] text-grape-deep font-semibold">
          ฉันยินยอมให้ Pee Rahat เก็บและประมวลผลข้อมูลส่วนบุคคลของฉัน
          ตามที่ระบุในนโยบายความเป็นส่วนตัว
        </span>
      </label>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 4 — Tutor profile (last per the brief)
// ────────────────────────────────────────────────────────────────────

function ProfileSection({
  form,
  disabled,
}: {
  form: ReturnType<typeof useForm<OnboardingFormDto>>;
  disabled?: boolean;
}) {
  const values = form.watch();
  const selectedSubjects = values.subjects ?? [];

  function toggleSubject(s: Subject) {
    if (disabled) return;
    const next = selectedSubjects.includes(s)
      ? selectedSubjects.filter((x) => x !== s)
      : [...selectedSubjects, s];
    form.setValue("subjects", next, { shouldValidate: true });
  }

  return (
    <section
      id="profile"
      className="scroll-mt-44 space-y-5 bg-white p-6 md:p-8 rounded-[32px] border border-violet-100 shadow-sm"
    >
      <header className="space-y-2">
        <SectionBadge n={4} label="โปรไฟล์ติวเตอร์" />
        <h2 className="thai text-xl font-black text-grape-deep">
          โปรไฟล์ที่น้องๆ จะเห็น
        </h2>
        <p className="thai text-sm text-ink-soft leading-relaxed">
          ข้อมูลส่วนนี้แสดงในหน้าโปรไฟล์ของคุณ น้องๆ ใช้ตัดสินใจเลือกพี่รหัส
        </p>
        {disabled && (
          <p className="thai text-[11.5px] text-emerald-700 font-bold inline-flex items-center gap-1">
            <CheckCircle2 size={12} />
            ส่งโปรไฟล์ไปแล้ว — แก้ไขได้ที่หน้า /tutors/me/edit หลังสมัครเสร็จ
          </p>
        )}
      </header>

      <div className="space-y-4">
        <label className="space-y-1.5 block">
          <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
            แนะนำตัว (อย่างน้อย 20 ตัวอักษร)
          </span>
          <textarea
            rows={4}
            disabled={disabled}
            value={values.bio ?? ""}
            onChange={(e) =>
              form.setValue("bio", e.target.value, { shouldValidate: true })
            }
            placeholder="สวัสดีครับ ผม… กำลังศึกษาอยู่ที่… มีประสบการณ์ติว…"
            className="thai w-full px-4 py-3 rounded-2xl border border-violet-100 text-sm focus:ring-2 focus:ring-dusty-grape/20 focus:border-dusty-grape outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {form.formState.errors.bio && (
            <span className="thai text-[10.5px] text-rose-600">
              {form.formState.errors.bio.message}
            </span>
          )}
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 block">
            <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
              มหาวิทยาลัย
            </span>
            <SelectWithOther
              value={values.university ?? ""}
              disabled={disabled}
              onChange={(next) =>
                form.setValue("university", next, { shouldValidate: true })
              }
              options={THAI_UNIVERSITIES}
              emptyLabel="เลือกมหาวิทยาลัย"
              otherPlaceholder="ระบุชื่อมหาวิทยาลัย"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
              คณะ
            </span>
            <SelectWithOther
              value={values.faculty ?? ""}
              disabled={disabled}
              onChange={(next) =>
                form.setValue("faculty", next, { shouldValidate: true })
              }
              options={THAI_FACULTIES}
              emptyLabel="เลือกคณะ"
              otherPlaceholder="ระบุชื่อคณะ"
            />
          </label>
        </div>

        <label className="space-y-1.5 block">
          <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
            ค่าตัวต่อชั่วโมง (บาท)
          </span>
          <input
            type="number"
            disabled={disabled}
            min={0}
            max={20000}
            value={values.hourlyRate || ""}
            onChange={(e) =>
              form.setValue("hourlyRate", Number(e.target.value), {
                shouldValidate: true,
              })
            }
            placeholder="เช่น 300"
            className="w-full px-4 py-3 rounded-2xl border border-violet-100 text-sm focus:ring-2 focus:ring-dusty-grape/20 focus:border-dusty-grape outline-none disabled:opacity-60"
          />
        </label>

        <div className="space-y-2">
          <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
            วิชาที่สอน (เลือกได้หลายวิชา)
          </span>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_OPTIONS.map((s) => {
              const on = selectedSubjects.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSubject(s)}
                  className={cn(
                    "thai text-[12.5px] font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                    on
                      ? "bg-dusty-grape text-white border-dusty-grape"
                      : "bg-white text-grape-deep border-violet-200 hover:border-violet-400",
                  )}
                >
                  {SUBJECT_LABELS[s]}
                </button>
              );
            })}
          </div>
          {form.formState.errors.subjects && (
            <span className="thai text-[10.5px] text-rose-600 block">
              {form.formState.errors.subjects.message}
            </span>
          )}
        </div>

        <label className="space-y-1.5 block">
          <span className="thai text-[11px] font-bold uppercase tracking-widest text-ink-mute">
            วิดีโอแนะนำตัว (URL, ไม่บังคับ)
          </span>
          <input
            type="url"
            disabled={disabled}
            value={values.introVideoUrl ?? ""}
            onChange={(e) =>
              form.setValue("introVideoUrl", e.target.value || undefined, {
                shouldValidate: true,
              })
            }
            placeholder="https://youtu.be/…"
            className="thai w-full px-4 py-3 rounded-2xl border border-violet-100 text-sm focus:ring-2 focus:ring-dusty-grape/20 focus:border-dusty-grape outline-none disabled:opacity-60"
          />
          <span className="thai text-[10.5px] text-ink-mute">
            ใส่หรือไม่ใส่ก็ได้ในขั้นตอนนี้ — หน้าถัดไปจะนัดให้คุณอัปโหลดอีกครั้ง
          </span>
        </label>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────

function SectionBadge({ n, label }: { n: number; label: string }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-dusty-grape inline-flex items-center gap-2">
      <span className="w-5 h-5 rounded-full bg-dusty-grape text-white inline-flex items-center justify-center text-[10px]">
        {n}
      </span>
      {label}
    </p>
  );
}
