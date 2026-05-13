import { Banknote } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { PayoutsTable } from "./_components/payouts-table";

export default async function AdminPayoutsPage() {
  const token = await requireAdmin("/admin/payouts");
  const api = createApiClient({ accessToken: token });
  const [unpaid, paid] = await Promise.all([
    api.admin.payouts({ paid: false }),
    api.admin.payouts({ paid: true }),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
          <Banknote size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            Payouts
          </h1>
        </div>
      </header>
      <PayoutsTable initialUnpaid={unpaid} initialPaid={paid} />
    </div>
  );
}
