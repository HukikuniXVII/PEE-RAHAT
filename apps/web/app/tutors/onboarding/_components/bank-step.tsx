"use client";

import type { BankName, KycSubmitDto } from "@peerahat/types";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Info,
  Loader2,
  Upload,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";

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

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  form: UseFormReturn<KycSubmitDto>;
  onCompleted: () => void;
}

/**
 * FR-TH-02: bank/passbook step slotted between transcript upload and the
 * final review. Captures idName (legal name on the ID), bank info, and
 * the passbook image. bankAccountName auto-fills from idName so most
 * tutors don't have to retype.
 */
export function BankStep({ form, onCompleted }: Props) {
  const [passbookPreview, setPassbookPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const values = form.watch();
  const passbookObjectKey = values.passbookObjectKey;
  const idName = values.idName;
  const bank = values.bank;
  const accountNumber = bank?.bankAccountNumber ?? "";
  const accountName = bank?.bankAccountName ?? "";

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const api = createApiClient();
      const intent = await api.kyc.requestUpload("passbook", file.type);
      const put = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok && !intent.uploadUrl.startsWith("https://storage.local")) {
        throw new Error(`Upload failed: ${put.status}`);
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
      if (!ACCEPTED_MIME.includes(file.type)) {
        setFileError("ไฟล์ต้องเป็น JPG, PNG หรือ WebP เท่านั้น");
        return;
      }
      if (file.size > MAX_BYTES) {
        setFileError("ไฟล์ต้องไม่เกิน 5MB");
        return;
      }
      upload.mutate(file);
    },
    [upload],
  );

  // Auto-fill bankAccountName from idName whenever it changes, unless the
  // tutor has manually edited the field (i.e. accountName already deviates).
  const syncAccountName = () => {
    if (idName && !accountName) {
      form.setValue("bank.bankAccountName", idName, { shouldValidate: false });
    }
  };

  const complete =
    !!idName &&
    !!accountName &&
    /^\d{10,15}$/.test(accountNumber) &&
    !!bank?.bankName &&
    bank.bankName !== ("" as unknown as BankName) &&
    !!passbookObjectKey;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600">
          ขั้นตอนที่ 4
        </p>
        <h3 className="text-2xl font-black text-slate-800">
          ข้อมูลบัญชีรับเงิน
        </h3>
      </div>

      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
        <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
        <p className="text-xs text-amber-800 leading-relaxed">
          ใช้สำหรับโอนค่าตอบแทนทุกวันที่ 15 และ 30 ของเดือน — <strong>ชื่อบัญชีต้องตรงกับชื่อในบัตรประชาชน</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="space-y-1.5 md:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            ธนาคาร
          </span>
          <select
            value={bank?.bankName ?? ""}
            onChange={(e) =>
              form.setValue("bank.bankName", e.target.value as BankName, {
                shouldValidate: true,
              })
            }
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
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
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-mono tracking-wider focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
          <span className="text-[10px] text-slate-400">10–15 หลัก ไม่ต้องมีขีดคั่น</span>
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
          {idName &&
            accountName &&
            idName.trim().toLowerCase().replace(/\s+/g, " ") !==
              accountName.trim().toLowerCase().replace(/\s+/g, " ") && (
              <span className="text-[10px] text-rose-600 inline-flex items-center gap-1">
                <AlertTriangle size={10} />
                ไม่ตรงกับชื่อในบัตรประชาชน — ระบบจะไม่ผ่านการตรวจสอบ
              </span>
            )}
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          สมุดบัญชี / สลิป e-Passbook
        </p>
        <label
          className={`block w-full bg-slate-50 rounded-3xl border-2 border-dashed transition-all p-6 cursor-pointer ${
            passbookObjectKey
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 hover:border-indigo-600"
          } ${upload.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
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
                className="w-24 h-24 rounded-2xl object-cover border border-emerald-200"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-700 inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  อัปโหลดเรียบร้อย
                </p>
                <p className="text-[10px] text-emerald-600 mt-1">
                  กดเลือกไฟล์ใหม่เพื่อแทนที่
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                {upload.isPending ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : (
                  <ImageIcon size={28} />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-bold text-slate-800 text-sm">
                  อัปโหลดสมุดบัญชีหรือ e-Passbook
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  อัปโหลดสกรีนช็อตจากแอปธนาคาร (เช่น SCB EASY, K PLUS) ที่เห็นชื่อบัญชีและเลขบัญชีชัดเจน
                </p>
                <p className="text-[10px] text-slate-400">JPG, PNG, WebP (ไม่เกิน 5MB)</p>
              </div>
              <span className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shrink-0 inline-flex items-center gap-1.5">
                <Upload size={12} />
                เลือกไฟล์
              </span>
            </div>
          )}
        </label>
        {fileError && (
          <p className="text-[11px] text-rose-600 font-medium">{fileError}</p>
        )}
      </div>

      <button
        type="button"
        disabled={!complete}
        onClick={onCompleted}
        className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all"
      >
        ถัดไป
      </button>
    </div>
  );
}
