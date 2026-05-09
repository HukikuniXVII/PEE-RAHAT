import { ShieldAlert } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { ReportsTable } from "./_components/reports-table";

export default async function AdminReportsPage() {
  const token = await requireAdmin("/admin/reports");
  const initial = await createApiClient({ accessToken: token }).admin.listReports({
    status: "open",
    pageSize: 50,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin
          </p>
          <h1 className="text-3xl font-black text-slate-900">Reports Queue</h1>
        </div>
      </header>
      <ReportsTable initialPage={initial} />
    </div>
  );
}
