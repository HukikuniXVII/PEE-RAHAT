"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto bg-white p-12 rounded-[32px] border border-slate-200 shadow-sm text-center space-y-6">
      <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
        <AlertTriangle size={32} />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800">
          เกิดข้อผิดพลาดที่ไม่คาดคิด
        </h2>
        <p className="text-sm text-slate-500">
          ระบบทำงานผิดพลาดชั่วขณะ ลองโหลดหน้าใหม่อีกครั้ง
          {error.digest && (
            <span className="block mt-2 text-[10px] text-slate-400 font-mono">
              digest: {error.digest}
            </span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all"
      >
        <RotateCw size={16} />
        ลองอีกครั้ง
      </button>
    </div>
  );
}
