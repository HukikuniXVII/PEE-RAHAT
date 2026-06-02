"use client";

import type { AdminBugReportRow, BugStatus } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Monitor } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";
import {
  BUG_CATEGORY_LABELS,
  BUG_SEVERITY_LABELS,
  BUG_SEVERITY_PILL,
  BUG_STATUS_LABELS,
  BUG_STATUS_PILL,
} from "@/lib/bug-labels";

type FilterKey = "all" | BugStatus | "blocker";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "open", label: "เปิดอยู่" },
  { key: "in_progress", label: "กำลังแก้ไข" },
  { key: "fixed", label: "แก้ไขแล้ว" },
  { key: "wont_fix", label: "ไม่แก้ไข" },
  { key: "blocker", label: "ใช้ไม่ได้เลย" },
];

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  const days = Math.floor(hrs / 24);
  return `${days} วันที่แล้ว`;
}

export function BugQueue({ initial }: { initial: AdminBugReportRow[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const { data } = useQuery({
    queryKey: ["admin", "bug-reports", "queue"],
    queryFn: () => createApiClient().admin.bugReports.queue(),
    initialData: initial,
  });

  const rows = data ?? initial;
  const shown = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "blocker") return r.severity === "blocker";
    return r.status === filter;
  });

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
          ไม่มีบั๊กในหมวดนี้
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-3 sm:hidden">
            {shown.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/bug-reports/${r.id}` as Route}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        BUG_SEVERITY_PILL[r.severity],
                      )}
                    >
                      {BUG_SEVERITY_LABELS[r.severity]}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        BUG_STATUS_PILL[r.status],
                      )}
                    >
                      {BUG_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{r.title}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{BUG_CATEGORY_LABELS[r.category]}</span>
                    <span className="inline-flex items-center gap-1">
                      <Monitor size={11} />
                      {r.viewport}
                    </span>
                    <span>{formatAge(r.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">ความรุนแรง / หมวด</th>
                  <th className="px-4 py-3 font-bold">หัวข้อ</th>
                  <th className="px-4 py-3 font-bold">ผู้แจ้ง</th>
                  <th className="px-4 py-3 font-bold">หน้าจอ</th>
                  <th className="px-4 py-3 font-bold">สถานะ</th>
                  <th className="px-4 py-3 font-bold">เมื่อ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/bug-reports/${r.id}` as Route}
                        className="flex flex-col gap-1"
                      >
                        <span
                          className={cn(
                            "w-fit rounded-full px-2 py-0.5 text-[10px] font-bold",
                            BUG_SEVERITY_PILL[r.severity],
                          )}
                        >
                          {BUG_SEVERITY_LABELS[r.severity]}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {BUG_CATEGORY_LABELS[r.category]}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/bug-reports/${r.id}` as Route}
                        className="font-bold text-slate-800 hover:text-indigo-600"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.reporterName ?? "ผู้ใช้ทั่วไป"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        <Monitor size={11} />
                        {r.viewport}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                          BUG_STATUS_PILL[r.status],
                        )}
                      >
                        {BUG_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-400">
                      {formatAge(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/bug-reports/${r.id}` as Route}>
                        <ChevronRight size={16} className="text-slate-300" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
