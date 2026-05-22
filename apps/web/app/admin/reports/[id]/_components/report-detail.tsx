"use client";

import {
  REPORT_CATEGORY_LABELS,
  REPORT_PRIORITY_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  type AdminReportDetail,
  type ReportPriority,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Paperclip } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";

import { ReportActionPanel } from "./report-action-panel";
import { ReportTargetContext } from "./report-target-context";

const PRIORITY_PILL: Record<ReportPriority, string> = {
  urgent: "bg-rose-50 text-rose-600",
  high: "bg-amber-50 text-amber-600",
  normal: "bg-indigo-50 text-indigo-600",
  low: "bg-slate-100 text-slate-500",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  initial: AdminReportDetail;
  adminUserId: string;
}

export function ReportDetail({ initial, adminUserId }: Props) {
  const { data } = useQuery({
    queryKey: ["admin", "reports", "detail", initial.id],
    queryFn: () => createApiClient().admin.reports.detail(initial.id),
    initialData: initial,
  });
  const report = data ?? initial;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      <Link
        href={"/admin/reports" as Route}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-indigo-600"
      >
        <ArrowLeft size={14} />
        กลับไปคิวรายงาน
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {REPORT_TARGET_LABELS[report.targetType]} · รายงาน{" "}
            {report.id.slice(0, 8)}
          </p>
          <h1 className="text-lg font-bold text-slate-900">
            {REPORT_CATEGORY_LABELS[report.category]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold",
              PRIORITY_PILL[report.priority],
            )}
          >
            {REPORT_PRIORITY_LABELS[report.priority]}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            {REPORT_STATUS_LABELS[report.status]}
          </span>
          {report.overdue && (
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600">
              เกินกำหนด
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — reporter + content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Reporter */}
          <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              ผู้รายงาน
            </h2>
            <p className="text-sm font-bold text-slate-800">
              {report.reporter.displayName}{" "}
              <span className="text-xs font-medium text-slate-400">
                ({report.reporter.role})
              </span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>อายุบัญชี {report.reporter.accountAgeDays} วัน</span>
              <span>รายงานทั้งหมด {report.reporter.reportsFiled}</span>
              <span>รายงานเท็จ {report.reporter.falseReportCount}</span>
              <span>ถูกเตือน {report.reporter.warningCount}</span>
            </div>
          </section>

          {/* Description + evidence */}
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              รายละเอียด
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {report.description}
            </p>
            {report.evidenceUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {report.evidenceUrls.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                  >
                    <Paperclip size={12} />
                    หลักฐาน {i + 1}
                  </a>
                ))}
              </div>
            )}
          </section>

          <ReportTargetContext context={report.targetContext} />

          {/* Related */}
          {report.related.length > 0 && (
            <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                อีก {report.related.length} รายงานเกี่ยวกับเป้าหมายนี้
              </h2>
              <ul className="space-y-1.5">
                {report.related.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/reports/${r.id}` as Route}
                      className="flex justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs hover:bg-slate-100"
                    >
                      <span className="font-bold text-slate-700">
                        {REPORT_CATEGORY_LABELS[r.category]}
                      </span>
                      <span className="text-slate-400">
                        {REPORT_STATUS_LABELS[r.status]} ·{" "}
                        {formatDate(r.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Activity timeline (incl. admin-only notes) */}
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              ความเคลื่อนไหว & โน้ตภายใน
            </h2>
            <ol className="space-y-3">
              <li className="text-xs text-slate-400">
                ส่งรายงานเมื่อ {formatDate(report.createdAt)}
              </li>
              {report.events.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <div
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      ev.kind === "admin_note"
                        ? "bg-amber-400"
                        : "bg-indigo-400",
                    )}
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        {ev.authorLabel}
                      </span>
                      {ev.kind === "admin_note" && (
                        <span className="rounded bg-amber-50 px-1.5 text-[9px] font-bold text-amber-600">
                          โน้ตภายใน
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {formatDate(ev.createdAt)}
                      </span>
                    </div>
                    {ev.text && (
                      <p className="whitespace-pre-wrap text-sm text-slate-600">
                        {ev.text}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right — action panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ReportActionPanel report={report} adminUserId={adminUserId} />
        </div>
      </div>
    </div>
  );
}
