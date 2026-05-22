"use client";

import {
  REPORT_CATEGORY_LABELS,
  REPORT_RESOLUTION_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  type ReportDetail,
  type ReportStatus,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileCheck, MessageSquarePlus, Paperclip } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { ReportCommentDialog } from "./report-comment-dialog";

const STATUS_PILL: Record<ReportStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  under_review: "bg-indigo-50 text-indigo-600",
  escalated: "bg-rose-50 text-rose-600",
  resolved: "bg-emerald-50 text-emerald-600",
  rejected: "bg-slate-100 text-slate-500",
  duplicate: "bg-amber-50 text-amber-600",
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

function EvidenceLinks({ urls }: { urls: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-200"
        >
          <Paperclip size={12} />
          หลักฐาน {i + 1}
        </a>
      ))}
    </div>
  );
}

function TimelineEntry({
  label,
  text,
  at,
  evidenceUrls,
}: {
  label: string;
  text: string;
  at: string;
  evidenceUrls?: string[];
}) {
  return (
    <li className="flex gap-3">
      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">{label}</span>
          <span className="text-[10px] text-slate-400">{formatDate(at)}</span>
        </div>
        {text && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {text}
          </p>
        )}
        {evidenceUrls && evidenceUrls.length > 0 && (
          <EvidenceLinks urls={evidenceUrls} />
        )}
      </div>
    </li>
  );
}

export function ReportDetailView({ initial }: { initial: ReportDetail }) {
  const [commenting, setCommenting] = useState(false);
  const { data } = useQuery({
    queryKey: ["reports", "detail", initial.id],
    queryFn: () => createApiClient().reports.byId(initial.id),
    initialData: initial,
  });
  const report = data ?? initial;

  return (
    <div className="space-y-6">
      <Link
        href={"/account/reports" as Route}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-indigo-600"
      >
        <ArrowLeft size={14} />
        กลับไปหน้ารายงานของฉัน
      </Link>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {REPORT_TARGET_LABELS[report.targetType]}
            </p>
            <h1 className="text-lg font-bold text-slate-900">
              {REPORT_CATEGORY_LABELS[report.category]}
            </h1>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold",
              STATUS_PILL[report.status],
            )}
          >
            {REPORT_STATUS_LABELS[report.status]}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          ส่งเมื่อ {formatDate(report.createdAt)} —
          เวลาตอบกลับโดยเฉลี่ยขึ้นกับความเร่งด่วนของเรื่อง
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          รายละเอียดที่คุณรายงาน
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {report.description}
        </p>
        {report.evidenceUrls.length > 0 && (
          <EvidenceLinks urls={report.evidenceUrls} />
        )}
      </section>

      {report.status === "resolved" && (
        <section className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
            <FileCheck size={13} />
            ผลการตรวจสอบ
          </h2>
          {report.resolution && (
            <p className="text-[11px] font-bold text-emerald-700">
              {REPORT_RESOLUTION_LABELS[report.resolution]}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-900">
            {report.publicResponse ??
              "แอดมินได้ตรวจสอบและดำเนินการกับรายงานของคุณแล้ว"}
          </p>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            ความเคลื่อนไหว
          </h2>
          {report.canComment && (
            <button
              type="button"
              onClick={() => setCommenting(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700"
            >
              <MessageSquarePlus size={14} />
              เพิ่มข้อมูล
            </button>
          )}
        </div>
        <ol className="space-y-4">
          <TimelineEntry label="คุณ" text="ส่งรายงาน" at={report.createdAt} />
          {report.events.map((ev) => (
            <TimelineEntry
              key={ev.id}
              label={ev.authorLabel}
              text={ev.text ?? ""}
              at={ev.createdAt}
              evidenceUrls={ev.evidenceUrls}
            />
          ))}
        </ol>
      </section>

      {commenting && (
        <ReportCommentDialog
          reportId={report.id}
          onClose={() => setCommenting(false)}
        />
      )}
    </div>
  );
}
