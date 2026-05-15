import { redirect } from "next/navigation";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { BankEditCard } from "./_components/bank-edit-card";

export default async function TutorBankPage() {
  const token = await requireAuth("/tutors/me/bank");
  const api = createApiClient({ accessToken: token });
  const me = await api.users.me();
  if (!me.tutorProfileId) redirect("/tutors/onboarding");
  const initial = await api.tutors.bank.get();

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">
          Tutor
        </p>
        <h1 className="text-3xl font-black text-slate-900">บัญชีรับเงิน</h1>
        <p className="text-sm text-slate-500">
          ตรวจสอบและแก้ไขข้อมูลบัญชีที่แอดมินจะใช้โอนค่าตอบแทนทุกวันที่ 15 และ 30
        </p>
      </header>
      <BankEditCard initial={initial} />
    </div>
  );
}
