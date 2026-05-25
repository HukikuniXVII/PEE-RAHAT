"use client";

import type { KycField } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

type PhotoField = Exclude<KycField, "passbook">;

const FIELDS: ReadonlyArray<{
  field: PhotoField;
  key: "idPhotoKey" | "selfieKey" | "transcriptKey";
  title: string;
  description: string;
  Icon: typeof FileText;
}> = [
  {
    field: "idPhoto",
    key: "idPhotoKey",
    title: "บัตรประชาชน",
    description:
      "ภาพถ่ายบัตรประชาชนที่เป็นปัจจุบัน เห็นหน้าและตัวอักษรชัดเจน",
    Icon: FileText,
  },
  {
    field: "selfie",
    key: "selfieKey",
    title: "เซลฟี่คู่กับบัตร",
    description:
      "เพื่อความปลอดภัย ถ่ายเซลฟี่คู่กับบัตรประชาชนให้เห็นใบหน้าและตัวบัตรชัดเจน",
    Icon: Camera,
  },
  {
    field: "transcript",
    key: "transcriptKey",
    title: "ใบแสดงผลการเรียน / โปรไฟล์นิสิต",
    description:
      "ใบแสดงผลการเรียน หรือหน้าโปรไฟล์นิสิตที่ระบุชื่อและคณะที่กำลังศึกษาอยู่",
    Icon: Upload,
  },
];

interface Props {
  keys: {
    idPhotoKey?: string;
    selfieKey?: string;
    transcriptKey?: string;
  };
  onUploaded: (
    formKey: "idPhotoKey" | "selfieKey" | "transcriptKey",
    objectKey: string,
  ) => void;
}

/**
 * Single-page tutor signup — section 1 of 4. Renders the three KYC
 * document uploads as stacked rows (was a 3-screen wizard previously,
 * now inline so the tutor sees every required document upfront). Each
 * row uploads via the existing presigned-PUT flow; the dev stub-URL
 * fallback is preserved so localhost flows finish without MinIO.
 */
export function IdentitySection({ keys, onUploaded }: Props) {
  return (
    <section
      id="identity"
      className="scroll-mt-44 space-y-5 bg-white p-6 md:p-8 rounded-[32px] border border-violet-100 shadow-sm"
    >
      <header className="space-y-2">
        <SectionBadge n={1} label="เอกสารยืนยันตัวตน" />
        <h2 className="thai text-xl font-black text-grape-deep">
          ส่งเอกสารยืนยันตัวตน
        </h2>
        <p className="thai text-sm text-ink-soft leading-relaxed">
          ทีมงานใช้เอกสารเหล่านี้ยืนยันสถานะนักศึกษาและออก{" "}
          <span className="font-bold text-grape-deep">Verified Badge</span>{" "}
          บนโปรไฟล์ของคุณ ภายใน 24 ชม.
        </p>
      </header>

      <div className="flex items-start gap-3 p-4 bg-violet-50 rounded-2xl border border-violet-100">
        <ShieldCheck className="text-dusty-grape shrink-0 mt-0.5" size={16} />
        <p className="thai text-[11.5px] text-ink-soft leading-relaxed">
          <span className="font-bold text-grape-deep">นโยบายความปลอดภัย:</span>{" "}
          เอกสารยืนยันตัวตนเข้ารหัส AES-256-GCM และย้ายเข้าระบบเก็บถาวร
          ภายใน 24 ชั่วโมงหลังตรวจสอบเสร็จ
        </p>
      </div>

      <ul className="space-y-3">
        {FIELDS.map((f) => (
          <PhotoRow
            key={f.field}
            field={f.field}
            formKey={f.key}
            title={f.title}
            description={f.description}
            Icon={f.Icon}
            objectKey={keys[f.key]}
            onUploaded={onUploaded}
          />
        ))}
      </ul>
    </section>
  );
}

function PhotoRow({
  field,
  formKey,
  title,
  description,
  Icon,
  objectKey,
  onUploaded,
}: {
  field: PhotoField;
  formKey: "idPhotoKey" | "selfieKey" | "transcriptKey";
  title: string;
  description: string;
  Icon: typeof FileText;
  objectKey: string | undefined;
  onUploaded: Props["onUploaded"];
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const api = createApiClient();
      const intent = await api.kyc.requestUpload(field, file.type);
      // Dev stub: storage.local PUT fails at DNS resolution; same guard
      // as the legacy onboarding-flow and bank-step upload handlers.
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
      return { key: intent.objectKey, name: file.name };
    },
    onSuccess: ({ key, name }) => {
      setFileName(name);
      setError(null);
      onUploaded(formKey, key);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ"),
  });

  const uploaded = !!objectKey;
  const busy = upload.isPending;

  return (
    <li>
      <label
        className={cn(
          "flex items-center gap-4 p-4 rounded-2xl border transition-all",
          uploaded
            ? "bg-emerald-50/60 border-emerald-200"
            : "bg-white border-violet-100 hover:border-violet-300",
          busy ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        )}
      >
        <input
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
          }}
        />
        <span
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
            uploaded
              ? "bg-emerald-500 text-white"
              : "bg-grape-soft text-dusty-grape",
          )}
        >
          {uploaded ? (
            <CheckCircle2 size={22} strokeWidth={2.5} />
          ) : (
            <Icon size={20} />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="thai text-sm font-bold text-grape-deep">{title}</p>
          <p className="thai text-[11.5px] text-ink-mute leading-snug">
            {description}
          </p>
          {fileName && (
            <p className="thai text-[10.5px] text-emerald-700 truncate mt-1">
              ไฟล์: {fileName}
            </p>
          )}
          {error && (
            <p className="thai text-[10.5px] text-rose-600 mt-1">{error}</p>
          )}
        </div>
        <span
          className={cn(
            "thai text-[11.5px] font-bold rounded-xl px-3 py-2 inline-flex items-center gap-1.5 shrink-0",
            busy
              ? "bg-ink-mute/20 text-ink-mute"
              : uploaded
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-dusty-grape text-white hover:bg-violet-600",
          )}
        >
          {busy ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              อัปโหลด...
            </>
          ) : uploaded ? (
            "เปลี่ยนไฟล์"
          ) : (
            <>
              <Upload size={12} />
              เลือกไฟล์
            </>
          )}
        </span>
      </label>
    </li>
  );
}

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
