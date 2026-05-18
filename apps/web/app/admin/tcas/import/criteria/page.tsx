import { Sparkles } from "lucide-react";

import { requireAdmin } from "@/lib/auth";

import { CriteriaAiImportClient } from "./_components/criteria-ai-import-client";

export default async function AdminTcasCriteriaImportPage() {
  const token = await requireAdmin("/admin/tcas/import/criteria");

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
          <Sparkles size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin / TCAS
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            นำเข้าเกณฑ์ TCAS ด้วย AI
          </h1>
          <p className="text-sm text-slate-500">
            อัปโหลด PDF ประกาศการรับสมัคร → AI สกัดข้อมูล →
            ตรวจสอบและแก้ไข → บันทึก
          </p>
        </div>
      </header>

      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
        ⚠ ผลการวิเคราะห์เบื้องต้น — ระบบเดาเอาจาก PDF ไม่ได้แม่นเสมอ
        กรุณาตรวจสอบทุกแถวก่อนกดบันทึก ระบบไม่ commit ลง DB ก่อนได้รับการยืนยัน
      </div>

      <CriteriaAiImportClient accessToken={token} />
    </div>
  );
}
