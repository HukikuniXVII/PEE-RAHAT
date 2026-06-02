"use client";

import {
  type AdminBugReportDetail,
  type AdminUpdateBugReportDto,
  BUG_PRIORITIES,
  type BugPriority,
  BUG_STATUSES,
  type BugStatus,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";
import {
  BUG_CATEGORY_LABELS,
  BUG_PRIORITY_LABELS,
  BUG_SEVERITY_LABELS,
  BUG_SEVERITY_PILL,
  BUG_STATUS_LABELS,
} from "@/lib/bug-labels";
import { getErrorMessage } from "@/lib/error-message";

const META_LABEL = "text-[10px] font-bold uppercase tracking-widest text-slate-400";
const SELECT =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none";

export function BugDetail({ initial }: { initial: AdminBugReportDetail }) {
  const [report, setReport] = useState(initial);
  const [status, setStatus] = useState<BugStatus>(initial.status);
  const [priority, setPriority] = useState<BugPriority>(initial.priority);
  const [assignedToId, setAssignedToId] = useState(initial.assignedToId ?? "");
  const [resolutionNote, setResolutionNote] = useState(
    initial.resolutionNote ?? "",
  );
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(false);

  const save = useMutation({
    mutationFn: () => {
      const dto: AdminUpdateBugReportDto = {
        status,
        priority,
        assignedToId: assignedToId.trim() || null,
        resolutionNote: resolutionNote.trim() || null,
      };
      return createApiClient().admin.bugReports.update(report.id, dto);
    },
    onSuccess: (updated) => {
      setReport(updated);
      toast.success("บันทึกแล้ว");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Left — content */}
      <div className="min-w-0 space-y-5">
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                BUG_SEVERITY_PILL[report.severity],
              )}
            >
              {BUG_SEVERITY_LABELS[report.severity]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
              {BUG_CATEGORY_LABELS[report.category]}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{report.title}</h1>
          <p className="thai whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {report.description}
          </p>
        </div>

        {/* Screenshots */}
        {report.screenshotUrls.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6">
            <p className={META_LABEL}>ภาพหน้าจอ</p>
            <div className="flex flex-wrap gap-3">
              {report.screenshotUrls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightbox(url)}
                  className="h-28 w-28 overflow-hidden rounded-lg border border-slate-200 transition-transform hover:scale-[1.02]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`screenshot ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Console log */}
        {report.consoleLog && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <button
              type="button"
              onClick={() => setShowConsole((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className={META_LABEL}>Console log</span>
              <ChevronDown
                size={16}
                className={cn(
                  "text-slate-400 transition-transform",
                  showConsole && "rotate-180",
                )}
              />
            </button>
            {showConsole && (
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100">
                {report.consoleLog}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Right — meta + actions */}
      <div className="space-y-5">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <p className={META_LABEL}>ข้อมูล</p>
          <MetaRow label="หน้าที่เกิดปัญหา">
            <a
              href={report.pageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 break-all text-indigo-600 hover:underline"
            >
              {report.pageUrl}
              <ExternalLink size={12} className="shrink-0" />
            </a>
          </MetaRow>
          <MetaRow label="หน้าจอ">{report.viewport}</MetaRow>
          <MetaRow label="User agent">
            <span className="break-all">{report.userAgent}</span>
          </MetaRow>
          <MetaRow label="เวอร์ชัน">{report.appVersion ?? "—"}</MetaRow>
          <MetaRow label="ผู้แจ้ง">
            {report.reporterName ? (
              <span>
                {report.reporterName}
                {report.reporterEmail ? (
                  <span className="text-slate-400"> · {report.reporterEmail}</span>
                ) : null}
              </span>
            ) : (
              "ผู้ใช้ทั่วไป"
            )}
          </MetaRow>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <p className={META_LABEL}>จัดการ</p>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">สถานะ</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BugStatus)}
              className={SELECT}
            >
              {BUG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BUG_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">ความสำคัญ</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as BugPriority)}
              className={SELECT}
            >
              {BUG_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {BUG_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">
              ผู้รับผิดชอบ (user id)
            </span>
            <input
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              placeholder="ว่าง = ยังไม่มอบหมาย"
              className={SELECT}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">
              บันทึกการแก้ไข
            </span>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={4}
              maxLength={3000}
              placeholder="สรุปสิ่งที่ทำ / เหตุผลที่ปิด — ผู้แจ้งจะเห็นข้อความนี้"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <Button
            type="button"
            variant="primary"
            size="brand-md"
            fullWidth
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึก"
            )}
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="ปิด"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="screenshot"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5 text-[12.5px]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="text-slate-700">{children}</div>
    </div>
  );
}
