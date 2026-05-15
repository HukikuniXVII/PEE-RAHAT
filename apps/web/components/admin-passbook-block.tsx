"use client";

import type { AdminPassbookView } from "@peerahat/types";
import { Dialog, DialogContent } from "@peerahat/ui";
import {
  AlertTriangle,
  Check,
  Copy,
  Image as ImageIcon,
  ShieldCheck,
  X,
  ZoomIn,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const BANK_LABEL: Record<string, string> = {
  SCB: "ไทยพาณิชย์ (SCB)",
  KBank: "กสิกรไทย (KBank)",
  Krungthai: "กรุงไทย (KTB)",
  Bangkok: "กรุงเทพ (BBL)",
  TMB: "TMB",
  Kiatnakin: "เกียรตินาคิน (KKP)",
  CIMB: "CIMB Thai",
  UOB: "UOB",
  TTB: "TTB",
  GSB: "ออมสิน (GSB)",
  BAAC: "ธ.ก.ส.",
  GHB: "อาคารสงเคราะห์",
  LH: "แลนด์ แอนด์ เฮ้าส์",
  ICBC: "ICBC",
  TISCO: "ทิสโก้",
  Other: "อื่นๆ",
};

interface Props {
  passbook: AdminPassbookView | null;
  /**
   * Optional name to compare against passbook.bankAccountName for a
   * mismatch warning. Provide the legal name from the tutor's National
   * ID when available — admin sees a clear flag if the bank account
   * isn't under the verified name.
   */
  expectedHolderName?: string | null;
  /** Stickier amount the admin can copy alongside the bank info. Used on
   *  the payout-detail surface. */
  amountThb?: number;
}

/**
 * Normalize Thai/English names for the mismatch check: strip whitespace
 * runs, drop honorifics, lowercase. Loose by design — admin still has
 * the final say. False positives are fine; false negatives are not.
 */
function normalizeName(s: string): string {
  return s
    .replace(/^(นาย|นาง|นางสาว|น\.ส\.|Mr\.|Mrs\.|Ms\.)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function AdminPassbookBlock({
  passbook,
  expectedHolderName,
  amountThb,
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!passbook) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-amber-800">
            ไม่มีข้อมูลบัญชี
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            ติวเตอร์ยังไม่ได้ส่งข้อมูลสมุดบัญชี — ขอให้ติวเตอร์เพิ่มข้อมูลบัญชีก่อนอนุมัติหรือโอนเงิน
          </p>
        </div>
      </div>
    );
  }

  const nameMismatch =
    !!expectedHolderName &&
    normalizeName(expectedHolderName) !==
      normalizeName(passbook.bankAccountName);

  return (
    <>
      <div className="grid md:grid-cols-2 gap-5">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-indigo-400 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={passbook.imageUrl}
            alt="หน้าสมุดบัญชี"
            className="absolute inset-0 w-full h-full object-contain"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 transition-all gap-2 text-xs font-bold uppercase tracking-widest">
            <ZoomIn size={16} />
            กดเพื่อขยาย
          </span>
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 bg-white/95 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-slate-700 border border-slate-200">
            <ImageIcon size={11} />
            Passbook
          </span>
        </button>

        <div className="space-y-3">
          <BankRow
            label="ธนาคาร"
            value={BANK_LABEL[passbook.bankName] ?? passbook.bankName}
          />
          <BankRow
            label="เลขบัญชี"
            value={passbook.bankAccountNumberFull}
            mono
            copyable
          />
          <BankRow
            label="ชื่อบัญชี"
            value={passbook.bankAccountName}
            copyable
            tone={nameMismatch ? "warning" : undefined}
          />
          {typeof amountThb === "number" && (
            <BankRow
              label="ยอดที่ต้องโอน"
              value={`฿${amountThb.toLocaleString()}`}
              copyValue={String(amountThb)}
              copyable
              tone="emphasis"
            />
          )}

          {nameMismatch && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2.5">
              <AlertTriangle
                size={16}
                className="text-rose-600 mt-0.5 shrink-0"
              />
              <p className="text-[11px] text-rose-700 leading-relaxed">
                ชื่อบัญชีไม่ตรงกับชื่อในบัตรประชาชน — ตรวจสอบก่อนอนุมัติ
                <br />
                <span className="text-[10px] text-rose-600/80">
                  KYC: {expectedHolderName} • บัญชี:{" "}
                  {passbook.bankAccountName}
                </span>
              </p>
            </div>
          )}

          <p className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1">
            <ShieldCheck size={12} className="text-emerald-500" />
            ลิงก์รูปหมดอายุใน 5 นาที — รีโหลดหน้านี้เพื่อสร้างใหม่
          </p>
        </div>
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl bg-transparent border-none shadow-none">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="ปิด"
              className="absolute top-2 right-2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
            >
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={passbook.imageUrl}
              alt="หน้าสมุดบัญชี (ขยาย)"
              className="w-full max-h-[88vh] object-contain bg-white rounded-2xl"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BankRow({
  label,
  value,
  mono,
  copyable,
  copyValue,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  copyValue?: string;
  tone?: "warning" | "emphasis";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      toast.success(`คัดลอก${label}แล้ว`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p
          className={
            tone === "warning"
              ? "text-sm font-bold text-rose-700"
              : tone === "emphasis"
                ? "text-lg font-black text-emerald-600"
                : mono
                  ? "text-sm font-mono font-bold text-slate-800"
                  : "text-sm font-bold text-slate-800"
          }
        >
          {value}
        </p>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "คัดลอกแล้ว" : "คัดลอก"}
          </button>
        )}
      </div>
    </div>
  );
}
