import { Bug } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { BugQueue } from "./_components/bug-queue";

/** Admin bug-report triage queue (product feedback). */
export default async function AdminBugReportsPage() {
  const token = await requireAdmin("/admin/bug-reports");
  const initial = await createApiClient({
    accessToken: token,
  }).admin.bugReports.queue();

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Bug size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin
          </p>
          <h1 className="text-3xl font-black text-slate-900">บั๊กที่แจ้ง</h1>
        </div>
      </header>
      <BugQueue initial={initial} />
    </div>
  );
}
