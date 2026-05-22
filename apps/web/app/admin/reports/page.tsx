import { ShieldAlert } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { ReportsQueue } from "./_components/reports-queue";

/** FR-CM-05: admin moderation queue. */
export default async function AdminReportsPage() {
  const token = await requireAdmin("/admin/reports");
  const initial = await createApiClient({
    accessToken: token,
  }).admin.reports.queue();

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin
          </p>
          <h1 className="text-3xl font-black text-slate-900">คิวรายงาน</h1>
        </div>
      </header>
      <ReportsQueue initial={initial} />
    </div>
  );
}
