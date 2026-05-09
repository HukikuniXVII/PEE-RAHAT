import { Lock } from "lucide-react";

import { getServerAccessToken } from "@/lib/supabase/server";

import { SheetUploadForm } from "./_components/sheet-upload-form";

export default async function SheetUploadPage() {
  const token = await getServerAccessToken();

  if (!token) {
    return (
      <div className="max-w-md mx-auto bg-white p-12 rounded-[32px] border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          ต้องเข้าสู่ระบบก่อน
        </h2>
        <p className="text-sm text-slate-500">
          เฉพาะพี่ติวที่ผ่านการยืนยันตัวตนแล้วเท่านั้นที่ลงขายชีทได้
        </p>
      </div>
    );
  }

  return <SheetUploadForm />;
}
