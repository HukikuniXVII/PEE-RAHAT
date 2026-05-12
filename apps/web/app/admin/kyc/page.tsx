import { BadgeCheck } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { KycQueue } from "./_components/kyc-queue";

export default async function AdminKycPage() {
  const token = await requireAdmin("/admin/kyc");
  const initial = await createApiClient({ accessToken: token }).admin.kycQueue();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
          <BadgeCheck size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            ตรวจสอบ KYC ติวเตอร์
          </h1>
        </div>
      </header>
      <KycQueue initial={initial} />
    </div>
  );
}
