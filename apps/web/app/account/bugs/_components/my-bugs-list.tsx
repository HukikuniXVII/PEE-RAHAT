"use client";

import type { MyBugReport } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";
import {
  BUG_CATEGORY_LABELS,
  BUG_SEVERITY_LABELS,
  BUG_SEVERITY_PILL,
  BUG_STATUS_LABELS,
  BUG_STATUS_PILL,
} from "@/lib/bug-labels";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MyBugsList({ initial }: { initial: MyBugReport[] }) {
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const { data } = useQuery({
    queryKey: ["bug-reports", "mine"],
    queryFn: () => createApiClient().bugReports.mine(),
    initialData: initial,
  });

  const bugs = data ?? initial;
  const shown = bugs.filter((b) => {
    if (filter === "all") return true;
    if (filter === "open") return b.status === "open" || b.status === "in_progress";
    return b.status === "fixed" || b.status === "wont_fix" || b.status === "duplicate";
  });

  const FILTERS = [
    { key: "all" as const, label: "ทั้งหมด" },
    { key: "open" as const, label: "กำลังดำเนินการ" },
    { key: "resolved" as const, label: "ปิดแล้ว" },
  ];

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
          ยังไม่มีบั๊กที่แจ้งในหมวดนี้
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((b) => (
            <li
              key={b.id}
              className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        BUG_SEVERITY_PILL[b.severity],
                      )}
                    >
                      {BUG_SEVERITY_LABELS[b.severity]}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {BUG_CATEGORY_LABELS[b.category]}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{b.title}</p>
                  <p className="text-[11px] text-slate-400">
                    แจ้งเมื่อ {formatDate(b.createdAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold",
                    BUG_STATUS_PILL[b.status],
                  )}
                >
                  {BUG_STATUS_LABELS[b.status]}
                </span>
              </div>

              {b.resolutionNote && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    บันทึกจากทีมงาน
                  </p>
                  <p className="thai mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">
                    {b.resolutionNote}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
