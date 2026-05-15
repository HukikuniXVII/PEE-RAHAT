import { BadgeCheck } from "lucide-react";
import Link from "next/link";

import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { ReviewForm } from "./_components/review-form";

interface Props {
  params: { id: string };
}

export default async function AdminKycDetailPage({ params }: Props) {
  const token = await requireAdmin(`/admin/kyc/${params.id}`);
  const submission = await asNotFound(
    createApiClient({ accessToken: token }).admin.kycById(params.id),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <Link
        href="/admin/kyc"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700"
      >
        ← กลับไปคิว KYC
      </Link>

      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
          <BadgeCheck size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin · KYC review
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            {submission.userDisplayName}
          </h1>
          <p className="text-xs text-slate-500">{submission.userEmail}</p>
        </div>
      </header>

      <ReviewForm submission={submission} />
    </div>
  );
}
