"use client";

import type { PaymentIntent, PaymentItemType } from "@peerahat/types";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  cn,
} from "@peerahat/ui";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  QrCode,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  itemType: PaymentItemType;
  itemId: string;
  amountThb: number;
  payeeLabel: string;
  onClose: () => void;
}

export function PaymentDialog({
  itemType,
  itemId,
  amountThb,
  payeeLabel,
  onClose,
}: Props) {
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const api = createApiClient();
    api.payments
      .createIntent({ itemType, itemId })
      .then(setIntent)
      .catch((e) => setError((e as Error).message));
  }, [itemType, itemId]);

  const handleSlipUpload = async (file: File) => {
    if (!intent) return;
    setBusy(true);
    setError(null);
    try {
      // Real flow: request signed upload URL (R2/S3) for slip, PUT, then call uploadSlip.
      // For the scaffold the API exposes a single endpoint that accepts the object key.
      const slipObjectKey = `slips/${intent.id}/${file.name}`;
      const result = await createApiClient().payments.uploadSlip({
        paymentIntentId: intent.id,
        slipObjectKey,
      });
      if (result.status === "verified" || result.status === "held_in_escrow") {
        setStep(3);
      } else if (result.status === "failed") {
        setError(result.failureReason ?? "การตรวจสลิปไม่ผ่าน");
      } else {
        setError("ระบบกำลังตรวจสลิป กรุณารอสักครู่");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[40px] p-0">
        <div className="bg-indigo-600 p-8 text-white">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <DialogClose className="text-white/60 hover:text-white transition-colors">
              ยกเลิก
            </DialogClose>
          </div>
          <DialogTitle className="text-3xl text-white mb-2">
            Escrow Payment
          </DialogTitle>
          <DialogDescription className="text-indigo-100">
            เงินของคุณจะถูกเก็บไว้ที่ Pee Rahat จนกว่าการเรียนจะสำเร็จ
          </DialogDescription>
        </div>

        <div className="p-8 space-y-8">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  ยอดชำระทั้งหมด
                </p>
                <h3 className="text-4xl font-black text-slate-900">
                  ฿{amountThb.toLocaleString()}
                </h3>
                <p className="text-sm font-medium text-slate-600">
                  ผู้รับ: {payeeLabel}
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center gap-4">
                <div className="w-48 h-48 bg-white border-4 border-white shadow-sm rounded-2xl flex items-center justify-center overflow-hidden">
                  {intent ? (
                    <img
                      src={`data:image/svg+xml;base64,${btoa(intent.promptPayQrPayload)}`}
                      alt="PromptPay QR"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Loader2
                      className="text-indigo-600 animate-spin"
                      size={32}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                  <QrCode size={14} />
                  สแกนจ่ายผ่าน PromptPay
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <AlertTriangle className="text-amber-500 mt-1" size={18} />
                  <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                    กรุณาโอนยอดเงินให้ตรงตามที่ระบุ (฿
                    {amountThb.toLocaleString()}) เพื่อให้ระบบ SlipOK
                    สามารถตรวจสอบความถูกต้องได้ทันที
                  </p>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!intent}
                  size="lg"
                  className="w-full"
                >
                  โอนเงินเรียบร้อยแล้ว <ArrowRight size={18} />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">อัปโหลดสลิป</h3>
                <p className="text-sm text-slate-500">
                  กรุณาอัปโหลดสลิปธนาคารเพื่อยืนยันการโอน
                </p>
              </div>

              <label
                className={cn(
                  "aspect-[3/4] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-600 transition-all group overflow-hidden relative",
                  busy && "pointer-events-none",
                )}
              >
                {busy ? (
                  <div className="text-center space-y-4">
                    <Loader2
                      size={32}
                      className="text-indigo-600 animate-spin mx-auto"
                    />
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                      Verifying via SlipOK...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <Upload size={32} />
                    </div>
                    <p className="font-bold text-slate-800">เลือกรูปภาพสลิป</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSlipUpload(f);
                  }}
                />
              </label>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-8"
            >
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">
                  ชำระเงินสำเร็จ!
                </h3>
                <p className="text-sm text-slate-500 px-8">
                  ยอดเงินถูกนำเข้าสู่ระบบ Escrow เรียบร้อยแล้ว <br />
                  ผู้รับจะได้รับการแจ้งเตือนเพื่อเตรียมการสอน / ส่งมอบไฟล์
                </p>
              </div>
              <Button
                onClick={onClose}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                เสร็จสิ้น
              </Button>
            </motion.div>
          )}

          {error && (
            <p className="text-sm text-rose-600 font-medium text-center">
              {error}
            </p>
          )}
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-center gap-6">
          <span className="text-[10px] font-black italic text-slate-400">
            SlipOK Verified
          </span>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-500" />
            DBD E-commerce
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
