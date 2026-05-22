"use client";

import {
  REPORT_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  type ReportListItem,
  type ReportStatus,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

/** Status pill colours — also carry a label so colour is never the only signal. */
const STATUS_PILL: Record<ReportStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  under_review: "bg-indigo-50 text-indigo-600",
  escalated: "bg-rose-50 text-rose-600",
  resolved: "bg-emerald-50 text-emerald-600",
  rejected: "bg-slate-100 text-slate-500",
  duplicate: "bg-amber-50 text-amber-600",
};

const FILTERS: { key: "all" | ReportStatus; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending", label: "รอตรวจสอบ" },
  { key: "under_review", label: "กำลังตรวจสอบ" },
  { key: "resolved", label: "ดำเนินการแล้ว" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MyReportsList({ initial }: { initial: ReportListItem[] }) {
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");
  const { data } = useQuery({
    queryKey: ["reports", "mine"],
    queryFn: () => createApiClient().reports.mine(),
    initialData: initial,
  });

  const reports = data ?? initial;
  const shown =
    filter === "all" ? reports : reports.filter((r) => r.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold transition-colors",
              filter === f.key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm font-medium text-slate-400">
          ยังไม่มีรายงานในหมวดนี้
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id}>
              <Link
                href={`/account/reports/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-300"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {REPORT_TARGET_LABELS[r.targetType]}
                  </p>
                  <p className="truncate text-sm font-bold text-slate-800">
                    {REPORT_CATEGORY_LABELS[r.category]}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    ส่งเมื่อ {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-bold",
                      STATUS_PILL[r.status],
                    )}
                  >
                    {REPORT_STATUS_LABELS[r.status]}
                  </span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
