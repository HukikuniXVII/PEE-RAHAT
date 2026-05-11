"use client";

import { Button } from "@peerahat/ui";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-12 rounded-[32px] border border-slate-200 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">
              ระบบขัดข้องชั่วขณะ
            </h2>
            <p className="text-sm text-slate-500">
              เราจะแก้ไขโดยเร็วที่สุด ลองโหลดอีกครั้ง
              {error.digest && (
                <span className="block mt-2 text-[10px] text-slate-400 font-mono">
                  digest: {error.digest}
                </span>
              )}
            </p>
          </div>
          <Button variant="secondary" onClick={reset}>
            <RotateCw size={16} />
            ลองอีกครั้ง
          </Button>
        </div>
      </body>
    </html>
  );
}
