"use client";

import {
  type BankName,
  type MaskedBankInfo,
  type UpdateBankDto,
  updateBankSchema,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ImageIcon,
  Info,
  Loader2,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";
import { useMutationWithToast } from "@/lib/hooks/use-mutation-with-toast";

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

const BANK_LABEL: Record<BankName, string> = Object.fromEntries(
  BANK_OPTIONS.map((b) => [b.value, b.label]),
) as Record<BankName, string>;

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  initial: MaskedBankInfo | null;
}

export function BankEditCard({ initial }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const query = useQuery({
    queryKey: ["tutors", "me", "bank"],
    queryFn: () => createApiClient().tutors.bank.get(),
    initialData: initial,
  });
  const bank = query.data;

  if (!bank) {
    return (
      <>
        <section className="bg-white rounded-[40px] border border-amber-200 shadow-sm p-8 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">
                ยังไม่มีข้อมูลบัญชี
              </h2>
              <p className="text-sm text-slate-500">
                เพิ่มข้อมูลบัญชีธนาคารเพื่อให้แอดมินสามารถโอนค่าตอบแทนได้
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700"
          >
            <Pencil size={14} />
            เพิ่มข้อมูลบัญชี
          </button>
        </section>
        {editing && (
          <BankEditDialog
            initial={null}
            onClose={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              queryClient.invalidateQueries({
                queryKey: ["tutors", "me", "bank"],
              });
            }}
          />
        )}
      </>
    );
  }

  const pending = bank.pending;

  return (
    <>
      {pending && (
        <section className="bg-amber-50/70 rounded-[40px] border-2 border-amber-300 shadow-[0_8px_24px_-16px_rgba(217,119,6,0.35)] p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 inline-flex items-center justify-center shrink-0">
              <Clock size={20} strokeWidth={2.2} />
            </span>
            <div className="space-y-1 min-w-0">
              <h3 className="thai text-base font-black text-amber-900">
                ส่งให้ทีมงานตรวจสอบแล้ว — รออนุมัติ
              </h3>
              <p className="thai text-[12px] text-amber-800/90 leading-relaxed">
                การเปลี่ยนแปลงด้านล่างจะมีผลหลังแอดมินอนุมัติ (ภายใน 24 ชม.)
                บัญชีปัจจุบันยังใช้รับเงินอยู่จนกว่าจะอนุมัติ
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-white rounded-2xl border border-amber-100 p-3">
              <dt className="thai text-[10px] font-black uppercase tracking-widest text-amber-700">
                ข้อมูลใหม่ที่รอตรวจ
              </dt>
              <dd className="thai text-sm font-bold text-amber-900 mt-1">
                {BANK_LABEL[pending.bankName]}
              </dd>
              <dd className="text-[12px] font-mono text-amber-900/80 tracking-wider">
                •••• •••• {pending.accountLast4}
              </dd>
              <dd className="thai text-[12px] text-amber-800">
                {pending.accountName}
              </dd>
              <dd className="thai text-[10px] text-amber-700/70 pt-1">
                ส่งเมื่อ{" "}
                {new Date(pending.submittedAt).toLocaleString("th-TH")}
              </dd>
            </div>
            <div className="bg-white/60 rounded-2xl border border-slate-200 p-3">
              <dt className="thai text-[10px] font-black uppercase tracking-widest text-slate-500">
                บัญชีปัจจุบัน (ยังใช้งานอยู่)
              </dt>
              <dd className="thai text-sm font-bold text-slate-700 mt-1">
                {BANK_LABEL[bank.bankName]}
              </dd>
              <dd className="text-[12px] font-mono text-slate-600 tracking-wider">
                •••• •••• {bank.accountLast4}
              </dd>
              <dd className="thai text-[12px] text-slate-500">
                {bank.accountName}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              บัญชีปัจจุบัน
            </p>
            <h2 className="text-2xl font-black text-slate-900">
              {BANK_LABEL[bank.bankName]}
            </h2>
            <p className="text-sm font-mono text-slate-600 tracking-wider">
              •••• •••• {bank.accountLast4}
            </p>
            <p className="text-sm text-slate-500">{bank.accountName}</p>
            <p className="text-[10px] text-slate-400 pt-1">
              อัปเดตล่าสุด {new Date(bank.updatedAt).toLocaleString("th-TH")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            <CheckCircle2 size={12} />
            Active
          </span>
        </div>

        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={!!pending}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title={pending ? "มีการเปลี่ยนแปลงรออนุมัติอยู่" : undefined}
        >
          <Pencil size={14} />
          {pending ? "รอแอดมินอนุมัติ" : "แก้ไขข้อมูลบัญชี"}
        </button>

        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-2xl">
          <Info className="text-amber-600 shrink-0 mt-0.5" size={14} />
          <p className="text-[11px] text-amber-700 leading-relaxed">
            การแก้ไขข้อมูลบัญชีต้องผ่านการตรวจสอบจากทีมงานก่อนมีผล (ภายใน 24 ชม.)
            บัญชีปัจจุบันจะใช้รับเงินรอบถัดไปจนกว่าการเปลี่ยนแปลงจะถูกอนุมัติ
          </p>
        </div>
      </section>

      {editing && (
        <BankEditDialog
          initial={bank}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ["tutors", "me", "bank"] });
          }}
        />
      )}
    </>
  );
}

function BankEditDialog({
  initial,
  onClose,
  onSaved,
}: {
  // initial=null → first-time entry (legacy tutor or just-verified KYC
  // without bank info yet); also surfaces an idName field so the server
  // can back-fill the legacy KYC row.
  initial: MaskedBankInfo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isFirstEntry = initial === null;
  const [bankName, setBankName] = useState<BankName>(
    initial?.bankName ?? "SCB",
  );
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState(initial?.accountName ?? "");
  const [idName, setIdName] = useState("");
  const [passbookObjectKey, setPassbookObjectKey] = useState<string | null>(null);
  const [passbookPreview, setPassbookPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const api = createApiClient();
      const intent = await api.kyc.requestUpload("passbook", file.type);
      await api.uploads.putPresigned(intent, file);
      return { objectKey: intent.objectKey, file };
    },
    onSuccess: ({ objectKey, file }) => {
      setPassbookObjectKey(objectKey);
      setPassbookPreview(URL.createObjectURL(file));
    },
    onError: (e) => setFileError(e.message),
  });

  const save = useMutationWithToast({
    mutationFn: async () => {
      if (!passbookObjectKey) throw new Error("กรุณาอัปโหลดสมุดบัญชีใหม่");
      const dto: UpdateBankDto = updateBankSchema.parse({
        bank: {
          bankName,
          bankAccountNumber: accountNumber,
          bankAccountName: accountName,
        },
        passbookObjectKey,
        ...(isFirstEntry && idName.trim() ? { idName: idName.trim() } : {}),
      });
      return createApiClient().tutors.bank.update(dto);
    },
    successMessage: "ส่งให้ทีมงานตรวจสอบแล้ว — รออนุมัติภายใน 24 ชม.",
    errorMessage: true,
    onSuccess: onSaved,
  });

  const handleFile = (file: File) => {
    setFileError(null);
    if (!ACCEPTED_MIME.includes(file.type)) {
      setFileError("ไฟล์ต้องเป็น JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("ไฟล์ต้องไม่เกิน 5MB");
      return;
    }
    upload.mutate(file);
  };

  const accountValid = /^\d{10,15}$/.test(accountNumber);
  const idNameReady = isFirstEntry ? idName.trim().length >= 2 : true;
  const ready =
    !!bankName &&
    accountValid &&
    !!accountName &&
    !!passbookObjectKey &&
    idNameReady;

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-auto">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-black text-slate-900">
            {isFirstEntry ? "เพิ่มข้อมูลบัญชี" : "แก้ไขข้อมูลบัญชี"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-start gap-2">
          <Info className="text-amber-600 shrink-0 mt-0.5" size={14} />
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <strong>ชื่อบัญชีต้องตรงกับชื่อในบัตรประชาชน</strong> ที่ใช้ยืนยันตัวตน
          </p>
        </div>

        {isFirstEntry && (
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              ชื่อ-นามสกุล ตามบัตรประชาชน
            </span>
            <input
              type="text"
              value={idName}
              onChange={(e) => {
                setIdName(e.target.value);
                // Auto-fill the bank account name if it's still empty so
                // the tutor doesn't have to retype.
                if (!accountName) setAccountName(e.target.value);
              }}
              placeholder="เช่น นาย ก ขขขขข"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm"
            />
            <span className="text-[10px] text-slate-400">
              ใช้เพื่อยืนยันว่าเป็นบัญชีของคุณเอง — ครั้งถัดไประบบจะใช้ข้อมูลนี้เพื่อตรวจสอบ
            </span>
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            ธนาคาร
          </span>
          <select
            value={bankName}
            onChange={(e) => setBankName(e.target.value as BankName)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-white"
          >
            {BANK_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            เลขที่บัญชีใหม่
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="1234567890"
            maxLength={15}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-mono tracking-wider"
          />
          <span className="text-[10px] text-slate-400">10–15 หลัก ไม่ต้องมีขีดคั่น</span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            ชื่อบัญชี
          </span>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            สมุดบัญชี / สลิป e-Passbook ใหม่
          </span>
          <label
            className={cn(
              "block w-full rounded-2xl border-2 border-dashed p-4 cursor-pointer transition-all",
              passbookObjectKey
                ? "border-emerald-300 bg-emerald-50"
                : "border-slate-200 bg-slate-50 hover:border-indigo-600",
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
              <div className="flex items-center gap-3">
                <img
                  src={passbookPreview}
                  alt="passbook"
                  className="w-16 h-16 rounded-xl object-cover border border-emerald-200"
                />
                <p className="text-xs font-bold text-emerald-700">
                  อัปโหลดเรียบร้อย
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs text-slate-600">
                {upload.isPending ? (
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                ) : (
                  <ImageIcon size={20} className="text-slate-400" />
                )}
                <span>JPG, PNG, WebP (ไม่เกิน 5MB)</span>
                <span className="ml-auto px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold inline-flex items-center gap-1">
                  <Upload size={10} />
                  เลือกไฟล์
                </span>
              </div>
            )}
          </label>
          {fileError && (
            <p className="text-[11px] text-rose-600 font-medium">{fileError}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            ยกเลิก
          </button>
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={!ready || save.isPending}
          >
            {save.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}
