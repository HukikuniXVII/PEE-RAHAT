import { GraduationCap, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

import { AdminPassbookBlock } from "@/components/admin-passbook-block";
import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

interface Props {
  params: { id: string };
}

export default async function AdminTutorDetailPage({ params }: Props) {
  const token = await requireAdmin(`/admin/tutors/${params.id}`);
  const api = createApiClient({ accessToken: token });
  const [tutor, passbook] = await Promise.all([
    asNotFound(api.tutors.byId(params.id)),
    // Fetched server-side: passbook reads are audit-logged on every call,
    // so the load happens once per page visit rather than via client query.
    api.admin.tutorPassbook(params.id),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <Link
        href="/admin/kyc"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700"
      >
        ← กลับ Admin
      </Link>

      <header className="flex items-start gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tutor.avatarUrl}
          alt={tutor.displayName}
          className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 object-cover"
        />
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin · Tutor
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            {tutor.displayName}
          </h1>
          <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
            <GraduationCap size={14} className="text-indigo-600" />
            {tutor.faculty} • {tutor.university}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-full text-[11px] font-bold text-amber-700">
              <Star size={11} fill="currentColor" />
              {tutor.rating.toFixed(1)} ({tutor.reviewCount})
            </span>
            {tutor.isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-full text-[11px] font-bold text-indigo-700">
                <ShieldCheck size={11} />
                Verified
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <header className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-emerald-600" />
          <div>
            <h2 className="text-lg font-black text-slate-900">บัญชีรับเงิน</h2>
            <p className="text-xs text-slate-500">
              ข้อมูลสมุดบัญชีและธนาคารปัจจุบัน (มิเรอร์จาก KYC ล่าสุดที่อนุมัติ)
            </p>
          </div>
        </header>
        <AdminPassbookBlock passbook={passbook} />
      </section>
    </div>
  );
}
