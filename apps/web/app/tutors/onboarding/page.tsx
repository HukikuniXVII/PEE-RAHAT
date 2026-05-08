"use client";

import { cn } from "@peerahat/ui";
import {
  Camera,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Upload,
  UserCheck,
} from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

type Field = "idPhoto" | "selfie" | "transcript";

const FIELD_ORDER: Field[] = ["idPhoto", "selfie", "transcript"];

const COPY: Record<Field, { title: string; description: string }> = {
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

export default function TutorOnboardingPage() {
  const [stepIdx, setStepIdx] = useState(0);
  const [keys, setKeys] = useState<Record<Field, string | undefined>>({
    idPhoto: undefined,
    selfie: undefined,
    transcript: undefined,
  });
  const [pdpa, setPdpa] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentField = FIELD_ORDER[stepIdx];

  const handleUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const api = createApiClient();
      const intent = await api.kyc.requestUpload(currentField, file.type);
      const put = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");
      setKeys((k) => ({ ...k, [currentField]: intent.objectKey }));
      if (stepIdx < FIELD_ORDER.length - 1) {
        setStepIdx((i) => i + 1);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!pdpa) {
      setError("กรุณายอมรับนโยบาย PDPA ก่อนส่งเอกสาร");
      return;
    }
    if (!keys.idPhoto || !keys.selfie || !keys.transcript) return;
    setBusy(true);
    setError(null);
    try {
      const api = createApiClient();
      await api.kyc.submit({
        idPhotoKey: keys.idPhoto,
        selfieKey: keys.selfie,
        transcriptKey: keys.transcript,
        consentPdpaAccepted: pdpa,
      });
      setSubmitted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-12 rounded-[40px] border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900">กำลังตรวจสอบข้อมูล</h2>
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

  const allUploaded = keys.idPhoto && keys.selfie && keys.transcript;
  const FieldIcon =
    currentField === "idPhoto"
      ? FileText
      : currentField === "selfie"
        ? Camera
        : Upload;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
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
          {FIELD_ORDER.map((f, i) => (
            <div
              key={f}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all",
                keys[f]
                  ? "bg-emerald-500 text-white"
                  : i === stepIdx
                    ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200"
                    : "bg-slate-100 text-slate-400",
              )}
            >
              {keys[f] ? <CheckCircle2 size={24} /> : i + 1}
            </div>
          ))}
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

          <div className="aspect-square bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 hover:border-indigo-600 transition-all flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
              <FieldIcon size={32} />
            </div>
            <p className="font-bold text-slate-800 text-center">
              คลิกเพื่ออัปโหลด
            </p>
            <p className="text-xs text-slate-400 text-center">
              JPG, PNG, PDF (ไม่เกิน 5MB)
            </p>
            <label className="mt-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer">
              {busy ? "Uploading..." : "เลือกไฟล์"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </label>
          </div>
        </div>

        {allUploaded && (
          <div className="border-t border-slate-100 pt-8 space-y-4">
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={pdpa}
                onChange={(e) => setPdpa(e.target.checked)}
                className="mt-1"
              />
              <span>
                ฉันยอมรับนโยบายการเก็บข้อมูลส่วนบุคคลตาม PDPA และอนุญาตให้ Pee Rahat
                ใช้เอกสารเหล่านี้เพื่อการยืนยันตัวตนเท่านั้น
              </span>
            </label>
            <button
              onClick={handleSubmit}
              disabled={!pdpa || busy}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50"
            >
              ส่งเอกสารเพื่อตรวจสอบ
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-600 font-medium text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
