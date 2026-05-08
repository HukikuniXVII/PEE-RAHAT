import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Upload, CheckCircle2, ShieldCheck, ShieldAlert, CreditCard, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface PaymentFlowProps {
  amount: number;
  receiverName: string;
  onSuccess: (slipUrl: string) => void;
  onCancel: () => void;
}

export default function PaymentFlow({ amount, receiverName, onSuccess, onCancel }: PaymentFlowProps) {
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSlipUpload = () => {
    setIsVerifying(true);
    // Simulate SlipOK verification
    setTimeout(() => {
      setIsVerifying(false);
      setStep(3);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden max-w-xl mx-auto">
      {/* Header */}
      <div className="bg-indigo-600 p-8 text-white">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <ShieldCheck size={28} />
          </div>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition-colors">
            ยกเลิก
          </button>
        </div>
        <h2 className="text-3xl font-black mb-2">Escrow Payment</h2>
        <p className="text-indigo-100 text-sm">เงินของคุณจะถูกเก็บไว้ที่ Pee Rahat จนกว่าการเรียนจะสำเร็จ</p>
      </div>

      <div className="p-8 space-y-8">
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">ยอดชำระทั้งหมด</p>
              <h3 className="text-4xl font-black text-slate-900">฿{amount.toLocaleString()}</h3>
              <p className="text-sm font-medium text-slate-600">ติวเตอร์: {receiverName}</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center gap-4">
              <div className="w-48 h-48 bg-white border-4 border-white shadow-sm rounded-2xl flex items-center justify-center overflow-hidden">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" 
                  alt="PromptPay QR"
                  className="w-full h-full object-contain"
                />
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
                  กรุณาโอนยอดเงินให้ตรงตามที่ระบุ (฿{amount.toLocaleString()}) เพื่อให้ระบบ SlipOK สามารถตรวจสอบความถูกต้องได้ทันที
                </p>
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                โอนเงินเรียบร้อยแล้ว <ArrowRight size={18} />
              </button>
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
              <p className="text-sm text-slate-500">กรุณาอัปโหลดสลิปธนาคารเพื่อยืนยันการโอน</p>
            </div>

            <div 
              onClick={handleSlipUpload}
              className={cn(
                "aspect-[3/4] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-600 transition-all group overflow-hidden relative",
                isVerifying && "pointer-events-none"
              )}
            >
              {isVerifying ? (
                <div className="text-center space-y-4">
                  <Loader2 size={32} className="text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest animate-pulse">Verifying using SlipOK...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <Upload size={32} />
                  </div>
                  <p className="font-bold text-slate-800">เลือกรูปภาพสลิป</p>
                </>
              )}
            </div>
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
              <h3 className="text-2xl font-bold text-slate-900">ชำระเงินสำเร็จ!</h3>
              <p className="text-sm text-slate-500 px-8">
                ยอดเงินถูกนำเข้าสู่ระบบ Escrow เรียบร้อยแล้ว <br />
                ติวเตอร์จะได้รับการแจ้งเตือนเพื่อเตรียมการสอน
              </p>
            </div>
            <button 
              onClick={() => onSuccess('mock-slip-url')}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
            >
              ดูรายละเอียดการจอง
            </button>
          </motion.div>
        )}
      </div>

      {/* Trust Footer */}
      <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2 grayscale brightness-50 opacity-40">
           <span className="text-[10px] font-black italic">SlipOK Verified</span>
        </div>
        <div className="w-px h-6 bg-slate-200" />
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          <ShieldCheck size={14} className="text-emerald-500" />
          DBD E-commerce
        </div>
      </div>
    </div>
  );
}
