import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, CheckCircle2, ShieldCheck, UserCheck, FileText, Camera, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { KycStatus } from '../types';

export default function TutorRegistration() {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<KycStatus>('not_started');

  const handleUpload = () => {
    if (step < 3) {
      setStep(prev => prev + 1);
    } else {
      setStatus('pending');
    }
  };

  if (status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto bg-white p-12 rounded-[40px] border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900">กำลังตรวจสอบข้อมูล</h2>
        <p className="text-slate-500 leading-relaxed">
          เจ้าหน้าที่กำลังตรวจสอบหลักฐานการสมัครของคุณ (National ID & Transcript) <br />
          โดยปกติจะใช้เวลาไม่เกิน 24 ชั่วโมง คุณจะได้รับการแจ้งเตือนเมื่อบัญชีได้รับ Badge <span className="font-bold text-indigo-600">"Verified"</span>
        </p>
        <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                 <UserCheck size={14} className="text-slate-400" />
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">+500 ติวเตอร์รอคุณอยู่</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900">ร่วมเป็น "พี่รหัส" มือโปร</h2>
        <p className="text-slate-500">สมัครเป็นติวเตอร์เพื่อแบ่งปันความรู้และสร้างรายได้ระหว่างเรียน</p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-12">
        {/* Progress Stepper */}
        <div className="flex justify-between items-center relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all",
                step >= i ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400"
              )}
            >
              {step > i ? <CheckCircle2 size={24} /> : i}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-800">
              {step === 1 && "ขั้นตอนที่ 1: บัตรประชาชน"}
              {step === 2 && "ขั้นตอนที่ 2: รูปถ่ายคู่กับบัตร"}
              {step === 3 && "ขั้นตอนที่ 3: ใบแสดงผลการเรียน (Transcript)"}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {step === 1 && "อัปโหลดภาพถ่ายบัตรประชาชนที่เป็นปัจจุบันเพื่อให้เรายืนยันตัวตน (ข้อมูลของคุณจะถูกเก็บเป็นความลับและเข้ารหัสไว้)"}
              {step === 2 && "เพื่อความปลอดภัยสูงสุด กรุณาถ่ายเซลฟี่คู่กับบัตรประชาชนของคุณให้เห็นใบหน้าและตัวอักษรบนบัตรชัดเจน"}
              {step === 3 && "เพื่อยืนยันวุฒิการศึกษาและคณะที่คุณเรียนอยู่ กรุณาอัปโหลดใบ Transcript หรือหน้าโปรไฟล์นิสิตที่ระบุชื่อและคณะชัดเจน"}
            </p>
            <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <ShieldCheck className="text-indigo-600 mt-1" size={18} />
              <p className="text-xs text-indigo-700 leading-relaxed">
                <span className="font-bold">นโยบายความสะอาด:</span> <br />
                Pee Rahat เข้ารหัสข้อมูล KYC ทุกไฟล์ และจะย้ายไฟล์ไปยัง Cold Storage ภายใน 24 ชม. หลังจากตรวจสอบเสร็จ
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="aspect-square bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 group-hover:border-indigo-600 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden p-8">
               <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                  {step === 1 && <FileText size={32} />}
                  {step === 2 && <Camera size={32} />}
                  {step === 3 && <Upload size={32} />}
               </div>
               <div className="text-center">
                 <p className="font-bold text-slate-800">คลิกหรือลากไฟล์เพื่ออัปโหลด</p>
                 <p className="text-xs text-slate-400 mt-1">รองรับ JPG, PNG หรือ PDF (ไม่เกิน 5MB)</p>
               </div>
               <button 
                 onClick={handleUpload}
                 className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
               >
                 อัปโหลดไฟล์
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
