import { Receipt } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { PaymentsTable } from "./_components/payments-table";

export default async function AdminPaymentsPage() {
  const token = await requireAdmin("/admin/payments");
  const api = createApiClient({ accessToken: token });
  const [pending, success, failed] = await Promise.all([
    api.admin.paymentsQueue({ status: "pending" }),
    api.admin.paymentsQueue({ status: "success" }),
    api.admin.paymentsQueue({ status: "failed" }),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
          <Receipt size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            ตรวจสลิปการชำระเงิน
          </h1>
        </div>
      </header>
      <PaymentsTable
        initialPending={pending}
        initialSuccess={success}
        initialFailed={failed}
      />
    </div>
  );
}
