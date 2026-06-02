import { ChevronLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { BugDetail } from "./_components/bug-detail";

export default async function AdminBugReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const token = await requireAdmin(`/admin/bug-reports/${params.id}`);
  const detail = await asNotFound(
    createApiClient({ accessToken: token }).admin.bugReports.detail(params.id),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <Link
        href={"/admin/bug-reports" as Route}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft size={16} />
        กลับไปคิวบั๊ก
      </Link>
      <BugDetail initial={detail} />
    </div>
  );
}
