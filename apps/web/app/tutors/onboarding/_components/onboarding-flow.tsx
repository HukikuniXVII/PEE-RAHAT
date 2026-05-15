"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type KycField,
  type KycSubmitDto,
  kycSubmitSchema,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";

import { BankStep } from "./bank-step";
import { ProfileStep } from "./profile-step";

// Bank/passbook step is added in the wizard rewrite commit; for now the
// existing 3-photo flow keeps shipping and the passbook field lives in
// the KycField enum without a wizard slot.
const FIELD_ORDER = ["idPhoto", "selfie", "transcript"] as const satisfies readonly Exclude<KycField, "passbook">[];

const COPY: Record<Exclude<KycField, "passbook">, { title: string; description: string }> = {
  idPhoto: {
    title: "ขั้นตอนที่ 1: บัตรประชาชน",
    description:
      "อัปโหลดภาพถ่ายบัตรประชาชนที่เป็นปัจจุบันเพื่อให้เรายืนยันตัวตน (ข้อมูลของคุณจะถูกเก็บเป็นความลับและเข้ารหัสไว้)",
  },
  selfie: {
    title: "ขั้นตอนที่ 2: รูปถ่ายคู่กับบัตร",
    description:
      "เพื่อความปลอดภัยสูงสุด กรุณาถ่ายเซลฟี่คู่กับบัตรประชาชนของคุณให้เห็นใบหน้าและตัวอักษรบนบัตรชัดเจน",
  },
  transcript: {
    title: "ขั้นตอนที่ 3: ใบแสดงผลการเรียน (Transcript)",
    description:
      "เพื่อยืนยันวุฒิการศึกษาและคณะที่คุณเรียนอยู่ กรุณาอัปโหลดใบ Transcript หรือหน้าโปรไฟล์นิสิตที่ระบุชื่อและคณะชัดเจน",
  },
};

const FIELD_KEY: Record<Exclude<KycField, "passbook">, "idPhotoKey" | "selfieKey" | "transcriptKey"> =
  {
    idPhoto: "idPhotoKey",
    selfie: "selfieKey",
    transcript: "transcriptKey",
  };

const FIELD_ICON: Record<Exclude<KycField, "passbook">, typeof FileText> = {
  idPhoto: FileText,
  selfie: Camera,
  transcript: Upload,
};

export function OnboardingFlow() {
  // Phase gate: a user without a TutorProfile must complete onboarding
  // (FR-TH-03) before submitting KYC photos (FR-TH-02). Reading /users/me
  // tells us whether the role has already been promoted to "tutor" — a
  // returning user who finished the profile step skips straight to KYC.
  const meQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => createApiClient().users.me(),
    staleTime: 60_000,
    retry: false,
  });
  const [profileJustDone, setProfileJustDone] = useState(false);
  const hasProfile =
    profileJustDone || meQuery.data?.role === "tutor" || meQuery.data?.role === "admin";

  const [stepIdx, setStepIdx] = useState(0);
  const currentField: Exclude<KycField, "passbook"> | undefined = FIELD_ORDER[stepIdx];

  const form = useForm<KycSubmitDto>({
    resolver: zodResolver(kycSubmitSchema),
    defaultValues: {
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
  const [bankStepConfirmed, setBankStepConfirmed] = useState(false);

  const keys = form.watch();

  const upload = useMutation({
    mutationFn: async ({
      field,
      file,
    }: {
      field: Exclude<KycField, "passbook">;
      file: File;
    }) => {
      const api = createApiClient();
      const intent = await api.kyc.requestUpload(field, file.type);
      const put = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");
      return { field, objectKey: intent.objectKey };
    },
    onSuccess: ({ field, objectKey }) => {
      form.setValue(FIELD_KEY[field], objectKey, { shouldValidate: true });
      const idx = FIELD_ORDER.indexOf(field);
      if (idx >= 0 && idx < FIELD_ORDER.length - 1) {
        setStepIdx(idx + 1);
      }
    },
  });

  const submit = useMutation({
    mutationFn: (dto: KycSubmitDto) => createApiClient().kyc.submit(dto),
  });

  const onSubmit = form.handleSubmit((values) => submit.mutate(values));

  const error = upload.error?.message ?? submit.error?.message ?? null;

  if (meQuery.isPending) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-16 rounded-[40px] border border-slate-200 shadow-sm flex items-center justify-center text-slate-400">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  if (!hasProfile) {
    return <ProfileStep onCompleted={() => setProfileJustDone(true)} />;
  }

  if (submit.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-12 rounded-[40px] border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900">
          กำลังตรวจสอบข้อมูล
        </h2>
        <p className="text-slate-500 leading-relaxed">
          เจ้าหน้าที่กำลังตรวจสอบหลักฐานการสมัครของคุณ (National ID & Transcript)
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
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            +500 ติวเตอร์รอคุณอยู่
          </span>
        </div>
      </div>
    );
  }

  if (!currentField) return null;

  const allUploaded = !!(keys.idPhotoKey && keys.selfieKey && keys.transcriptKey);
  // FR-TH-02: bank step sits between photos and final review. We track an
  // explicit "confirmed" flag rather than deriving from field completeness
  // so the wizard doesn't auto-advance the moment the last field is typed.
  const bankReady =
    bankStepConfirmed &&
    !!keys.idName &&
    !!keys.bank?.bankName &&
    /^\d{10,15}$/.test(keys.bank?.bankAccountNumber ?? "") &&
    !!keys.bank?.bankAccountName &&
    !!keys.passbookObjectKey;
  const FieldIcon = FIELD_ICON[currentField];
  const busy = upload.isPending || submit.isPending;

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900">
          ร่วมเป็น &quot;พี่รหัส&quot; มือโปร
        </h2>
        <p className="text-slate-500">
          สมัครเป็นติวเตอร์เพื่อแบ่งปันความรู้และสร้างรายได้ระหว่างเรียน
        </p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-12">
        <div className="flex justify-between items-center relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
          {FIELD_ORDER.map((f, i) => {
            const uploaded = !!keys[FIELD_KEY[f]];
            return (
              <div
                key={f}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all",
                  uploaded
                    ? "bg-emerald-500 text-white"
                    : i === stepIdx
                      ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200"
                      : "bg-slate-100 text-slate-400",
                )}
              >
                {uploaded ? <CheckCircle2 size={24} /> : i + 1}
              </div>
            );
          })}
          {/* FR-TH-02: 4th step indicator for the bank/passbook stage. */}
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all",
              bankReady
                ? "bg-emerald-500 text-white"
                : allUploaded
                  ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200"
                  : "bg-slate-100 text-slate-400",
            )}
          >
            {bankReady ? <CheckCircle2 size={24} /> : 4}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-800">
              {COPY[currentField].title}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {COPY[currentField].description}
            </p>
            <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <ShieldCheck className="text-indigo-600 mt-1" size={18} />
              <p className="text-xs text-indigo-700 leading-relaxed">
                <span className="font-bold">นโยบายความสะอาด:</span>
                <br />
                Pee Rahat เข้ารหัสข้อมูล KYC ทุกไฟล์ และจะย้ายไฟล์ไปยัง Cold Storage
                ภายใน 24 ชม. หลังจากตรวจสอบเสร็จ
              </p>
            </div>
          </div>

          <label
            className={cn(
              "aspect-square bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 hover:border-indigo-600 transition-all flex flex-col items-center justify-center gap-4 p-8",
              busy ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate({ field: currentField, file: f });
              }}
            />
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
              <FieldIcon size={32} />
            </div>
            <p className="font-bold text-slate-800 text-center">
              คลิกเพื่ออัปโหลด
            </p>
            <p className="text-xs text-slate-400 text-center">
              JPG, PNG, PDF (ไม่เกิน 5MB)
            </p>
            <span className="mt-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
              {upload.isPending ? "Uploading..." : "เลือกไฟล์"}
            </span>
          </label>
        </div>

        {allUploaded && !bankReady && (
          <div className="border-t border-slate-100 pt-8">
            <BankStep
              form={form}
              onCompleted={() => setBankStepConfirmed(true)}
            />
          </div>
        )}

        {allUploaded && bankReady && (
          <div className="border-t border-slate-100 pt-8 space-y-4">
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="mt-1"
                {...form.register("consentPdpaAccepted")}
              />
              <span>
                ฉันยอมรับนโยบายการเก็บข้อมูลส่วนบุคคลตาม PDPA และอนุญาตให้ Pee Rahat
                ใช้เอกสารเหล่านี้เพื่อการยืนยันตัวตนเท่านั้น
              </span>
            </label>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              disabled={!form.formState.isValid || busy}
              className="w-full"
            >
              ส่งเอกสารเพื่อตรวจสอบ
            </Button>
          </div>
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
