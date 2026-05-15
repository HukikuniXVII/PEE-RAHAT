"use client";

import { Button } from "@peerahat/ui";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminKycDetailError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[admin/kyc/[id]]", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm text-center space-y-5">
      <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
        <AlertTriangle size={28} />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-black text-slate-800">
          โหลดข้อมูล KYC ไม่สำเร็จ
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error.message || "ระบบทำงานผิดพลาดชั่วขณะ"}
          {error.digest && (
            <span className="block mt-2 text-[10px] text-slate-400 font-mono">
              digest: {error.digest}
            </span>
          )}
        </p>
      </div>
      <Button variant="secondary" onClick={reset}>
        <RotateCw size={14} />
        ลองอีกครั้ง
      </Button>
    </div>
  );
}
