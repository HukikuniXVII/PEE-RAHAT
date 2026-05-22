"use client";

import {
  REPORT_CATEGORY_LABELS,
  REPORT_PRIORITY_LABELS,
  REPORT_TARGET_LABELS,
  type AdminReportQueueItem,
  type ReportPriority,
  type ReportTarget,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  FileText,
  MessageCircle,
  MessagesSquare,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createApiClient } from "@/lib/api-client";

type QueueFilter =
  | "all"
  | "pending"
  | "under_review"
  | "escalated"
  | "resolved"
  | "overdue";

const FILTERS: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending", label: "รอตรวจสอบ" },
  { key: "under_review", label: "กำลังตรวจสอบ" },
  { key: "overdue", label: "เกินกำหนด" },
  { key: "escalated", label: "ยกระดับ" },
  { key: "resolved", label: "ดำเนินการแล้ว" },
];

const PRIORITY_PILL: Record<ReportPriority, string> = {
  urgent: "bg-rose-50 text-rose-600",
  high: "bg-amber-50 text-amber-600",
  normal: "bg-indigo-50 text-indigo-600",
  low: "bg-slate-100 text-slate-500",
};

const TARGET_ICON: Record<ReportTarget, LucideIcon> = {
  booking: CalendarClock,
  chat_message: MessageCircle,
  sheet: FileText,
  review: Star,
  community_post: MessagesSquare,
};

const TARGET_OPTIONS: (ReportTarget | "all")[] = [
  "all",
  "booking",
  "chat_message",
  "sheet",
  "review",
  "community_post",
];

/** Live SLA countdown text for one report. */
function slaText(deadlineIso: string, now: number): string {
  const diffMs = new Date(deadlineIso).getTime() - now;
  const hours = Math.max(0, Math.round(Math.abs(diffMs) / 3_600_000));
  return diffMs < 0 ? `เกินมาแล้ว ${hours} ชม.` : `เหลือ ${hours} ชม.`;
}

export function ReportsQueue({
  initial,
}: {
  initial: AdminReportQueueItem[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [targetType, setTargetType] = useState<ReportTarget | "all">("all");
  const [now, setNow] = useState(() => Date.now());

  // SLA columns tick live.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const query = useQuery({
    queryKey: ["admin", "reports", "queue", filter],
    queryFn: () => {
      const api = createApiClient().admin.reports;
      return filter === "overdue"
        ? api.overdue()
        : api.queue(filter === "all" ? {} : { status: filter });
    },
    initialData: filter === "all" ? initial : undefined,
  });

  const rows = (query.data ?? []).filter(
    (r) => targetType === "all" || r.targetType === targetType,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <select
          value={targetType}
          onChange={(e) =>
            setTargetType(e.target.value as ReportTarget | "all")
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none"
        >
          {TARGET_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "ทุกประเภท" : REPORT_TARGET_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-bold">ประเภท</th>
              <th className="px-4 py-3 text-left font-bold">หมวดหมู่</th>
              <th className="px-4 py-3 text-left font-bold">ผู้รายงาน</th>
              <th className="px-4 py-3 text-left font-bold">รายละเอียด</th>
              <th className="px-4 py-3 text-left font-bold">ความสำคัญ</th>
              <th className="px-4 py-3 text-left font-bold">SLA</th>
              <th className="px-4 py-3 text-left font-bold">ผู้ดูแล</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm font-medium text-slate-400"
                >
                  ไม่มีรายงานในหมวดนี้
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const Icon = TARGET_ICON[r.targetType];
                return (
                  <tr
                    key={r.id}
                    onClick={() =>
                      router.push(`/admin/reports/${r.id}` as Route)
                    }
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-slate-50",
                      r.overdue && "border-l-2 border-rose-400",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Icon size={14} className="text-slate-400" />
                        {REPORT_TARGET_LABELS[r.targetType]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {REPORT_CATEGORY_LABELS[r.category]}
                      </span>
                      {r.bypassFlagged && (
                        <span className="ml-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                          🚩 บายพาส
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-2"
                        title={`อายุบัญชี ${r.reporter.accountAgeDays} วัน · รายงานทั้งหมด ${r.reporter.reportsFiled} · รายงานเท็จ ${r.reporter.falseReportCount}`}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-500">
                          {r.reporter.displayName.charAt(0)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {r.reporter.role}
                        </span>
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="line-clamp-2 text-xs text-slate-500">
                        {r.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold",
                          PRIORITY_PILL[r.priority],
                        )}
                      >
                        {REPORT_PRIORITY_LABELS[r.priority]}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-[11px] font-bold",
                        r.overdue ? "text-rose-600" : "text-slate-500",
                      )}
                    >
                      {slaText(r.slaDeadline, now)}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-500">
                      {r.assignedToName ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
