import { Landmark } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { BankChangesList } from "./_components/bank-changes-list";

// FR-TH-02 (rev): admin review surface for tutor-initiated bank-info
// edits. Each row diffs the live bank (current payout target) against
// the pending submission; admin can approve (copy pending → live, clear
// pending) or reject (clear pending). All actions audit-logged server-
// side.
export default async function AdminBankChangesPage() {
  const token = await requireAdmin("/admin/tutors/bank-changes");
  const initial = await createApiClient({
    accessToken: token,
  }).admin.bankChanges.list();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
          <Landmark size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            อนุมัติการแก้ไขบัญชีรับเงิน
          </h1>
          <p className="text-sm text-slate-500">
            ตรวจสอบและอนุมัติคำขอเปลี่ยนแปลงข้อมูลบัญชีของติวเตอร์ —
            บัญชีปัจจุบันยังใช้รับเงินอยู่จนกว่าจะอนุมัติ
          </p>
        </div>
      </header>
      <BankChangesList initial={initial} />
    </div>
  );
}
