import { Banknote } from "lucide-react";
import Link from "next/link";

import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { PayoutDetail } from "./_components/payout-detail";

interface Props {
  params: { id: string };
}

export default async function AdminPayoutDetailPage({ params }: Props) {
  const token = await requireAdmin(`/admin/payouts/${params.id}`);
  const payout = await asNotFound(
    createApiClient({ accessToken: token }).admin.payoutById(params.id),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <Link
        href="/admin/payouts"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700"
      >
        ← กลับไป Payouts
      </Link>

      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
          <Banknote size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin · Payout
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            {payout.tutorDisplayName}
          </h1>
          <p className="text-xs text-slate-500 font-mono">{payout.id}</p>
        </div>
      </header>

      <PayoutDetail payout={payout} />
    </div>
  );
}
