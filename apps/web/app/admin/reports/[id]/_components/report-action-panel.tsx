"use client";

import {
  REPORT_RESOLUTION_LABELS,
  REPORT_STATUS_LABELS,
  type AdminReportDetail,
  type ReportResolution,
  type ReportStatus,
  type ResolveReportDto,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";
import { useMutationWithToast } from "@/lib/hooks/use-mutation-with-toast";

/** Statuses the admin can set directly — resolving / duplicating have their
 *  own flows below. */
const WORKFLOW_STATUSES: ReportStatus[] = [
  "pending",
  "under_review",
  "escalated",
  "rejected",
];

const RESOLUTIONS: ReportResolution[] = [
  "no_action",
  "warning_issued",
  "suspension_temp",
  "suspension_perm",
  "refund_partial",
  "refund_full",
  "content_removed",
  "account_banned",
  "reporter_warned",
];

const labelClass =
  "text-[10px] font-bold uppercase tracking-widest text-slate-400";
const fieldClass =
  "w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20";

interface Props {
  report: AdminReportDetail;
  adminUserId: string;
}

export function ReportActionPanel({ report, adminUserId }: Props) {
  const closed = ["resolved", "rejected", "duplicate"].includes(report.status);

  const [status, setStatus] = useState<ReportStatus>(
    WORKFLOW_STATUSES.includes(report.status) ? report.status : "under_review",
  );
  const [statusNote, setStatusNote] = useState("");
  const [note, setNote] = useState("");
  const [duplicateOf, setDuplicateOf] = useState("");

  const [resolution, setResolution] = useState<ReportResolution>("no_action");
  const [resolutionNote, setResolutionNote] = useState("");
  const [publicResponse, setPublicResponse] = useState("");
  const [removedReason, setRemovedReason] = useState("");
  const [tutorAtFault, setTutorAtFault] = useState(false);
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [split, setSplit] = useState({ student: 100, tutor: 0, platform: 0 });

  const api = () => createApiClient().admin.reports;
  const invalidateKeys = [["admin", "reports", "detail", report.id]] as const;

  const assign = useMutationWithToast({
    mutationFn: () => api().assign(report.id, adminUserId),
    successMessage: "รับเรื่องแล้ว",
    errorMessage: "มอบหมายไม่สำเร็จ",
    invalidateKeys,
  });

  const updateStatus = useMutationWithToast({
    mutationFn: () =>
      api().updateStatus(report.id, {
        status,
        note: statusNote.trim() || undefined,
      }),
    successMessage: "อัปเดตสถานะแล้ว",
    errorMessage: "อัปเดตสถานะไม่สำเร็จ",
    invalidateKeys,
    onSuccess: () => setStatusNote(""),
  });

  const addNote = useMutationWithToast({
    mutationFn: () => api().addNote(report.id, note.trim()),
    successMessage: "บันทึกโน้ตแล้ว",
    errorMessage: "บันทึกโน้ตไม่สำเร็จ",
    invalidateKeys,
    onSuccess: () => setNote(""),
  });

  const markDuplicate = useMutationWithToast({
    mutationFn: () => api().markDuplicate(report.id, duplicateOf.trim()),
    successMessage: "ทำเครื่องหมายว่าซ้ำแล้ว",
    errorMessage: "ทำเครื่องหมายไม่สำเร็จ",
    invalidateKeys,
  });

  const resolve = useMutationWithToast({
    mutationFn: () => {
      const dto: ResolveReportDto = {
        resolution,
        resolutionNote: resolutionNote.trim(),
        publicResponse: publicResponse.trim() || undefined,
        ...(resolution === "refund_partial" && {
          refundSplit: {
            studentPct: split.student,
            tutorPct: split.tutor,
            platformPct: split.platform,
          },
        }),
        ...(resolution === "content_removed" && {
          removedReason: removedReason.trim(),
        }),
        ...(resolution === "refund_full" && { tutorAtFault }),
        ...(resolution === "suspension_temp" && { suspensionDays }),
      };
      return api().resolve(report.id, dto);
    },
    successMessage: "ปิดเรื่องเรียบร้อย",
    errorMessage: "ปิดเรื่องไม่สำเร็จ",
    invalidateKeys,
  });

  const splitSum = split.student + split.tutor + split.platform;
  const resolveBlocked =
    resolutionNote.trim().length === 0 ||
    (resolution === "refund_partial" && splitSum !== 100) ||
    (resolution === "content_removed" && removedReason.trim().length === 0);

  // Third-strike helper — chat-message warnings escalate toward suspension.
  const nextWarning = (report.targetUser?.warningCount ?? 0) + 1;
  const showStrike =
    resolution === "warning_issued" && report.targetUser !== null;

  if (closed) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          การดำเนินการ
        </h2>
        <p className="text-sm font-medium text-slate-500">
          รายงานนี้ปิดแล้ว ({REPORT_STATUS_LABELS[report.status]})
          {report.resolution
            ? ` — ${REPORT_RESOLUTION_LABELS[report.resolution]}`
            : ""}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
        การดำเนินการ
      </h2>

      {/* Assignee */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          ผู้ดูแล: {report.assignedToName ?? "ยังไม่มี"}
        </span>
        <Button
          type="button"
          variant="muted"
          size="sm"
          onClick={() => assign.mutate()}
          disabled={assign.isPending || report.assignedToId === adminUserId}
        >
          รับเรื่องเอง
        </Button>
      </div>

      {/* Status */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <label className={labelClass}>สถานะ</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReportStatus)}
          className={cn(fieldClass, "font-bold")}
        >
          {WORKFLOW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REPORT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {status === "under_review" && (
          <p className="text-[10px] text-slate-400">
            การตั้งเป็น &quot;กำลังตรวจสอบ&quot; จะแจ้งผู้ถูกรายงาน
            (โดยไม่เปิดเผยตัวผู้รายงาน)
          </p>
        )}
        <input
          value={statusNote}
          onChange={(e) => setStatusNote(e.target.value)}
          placeholder="โน้ตภายใน (ทางเลือก)"
          className={fieldClass}
        />
        <Button
          type="button"
          variant="muted"
          size="sm"
          onClick={() => updateStatus.mutate()}
          disabled={updateStatus.isPending}
          className="w-full"
        >
          อัปเดตสถานะ
        </Button>
      </div>

      {/* Resolve */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <label className={labelClass}>ปิดเรื่อง (Resolution)</label>
        <select
          value={resolution}
          onChange={(e) =>
            setResolution(e.target.value as ReportResolution)
          }
          className={cn(fieldClass, "font-bold")}
        >
          {RESOLUTIONS.map((r) => (
            <option key={r} value={r}>
              {REPORT_RESOLUTION_LABELS[r]}
            </option>
          ))}
        </select>

        {showStrike && (
          <div
            className={cn(
              "rounded-xl px-3 py-2 text-[11px] font-bold",
              nextWarning >= 3
                ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-700",
            )}
          >
            การเตือนครั้งที่ {nextWarning}
            {nextWarning >= 3 && (
              <span className="mt-0.5 flex items-center gap-1 font-medium">
                <AlertTriangle size={11} />
                ผู้ใช้รายนี้ถูกเตือนครั้งที่ 3 — แนะนำให้พักบัญชี
              </span>
            )}
          </div>
        )}

        {resolution === "refund_partial" && (
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-2">
              {(["student", "tutor", "platform"] as const).map((k) => (
                <label key={k} className="space-y-1">
                  <span className="text-[10px] text-slate-400">{k} %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={split[k]}
                    onChange={(e) =>
                      setSplit((s) => ({
                        ...s,
                        [k]: Number(e.target.value),
                      }))
                    }
                    className={fieldClass}
                  />
                </label>
              ))}
            </div>
            <p
              className={cn(
                "text-[10px] font-bold",
                splitSum === 100 ? "text-slate-400" : "text-rose-500",
              )}
            >
              รวม {splitSum}% (ต้องเท่ากับ 100)
            </p>
          </div>
        )}
        {resolution === "refund_full" && (
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={tutorAtFault}
              onChange={(e) => setTutorAtFault(e.target.checked)}
            />
            ติวเตอร์เป็นฝ่ายผิด (เพิ่ม defectCount)
          </label>
        )}
        {resolution === "content_removed" && (
          <textarea
            value={removedReason}
            onChange={(e) => setRemovedReason(e.target.value)}
            placeholder="เหตุผลการซ่อนเนื้อหา (แสดงให้เจ้าของเนื้อหา)"
            className={cn(fieldClass, "min-h-[60px] resize-none")}
          />
        )}
        {resolution === "suspension_temp" && (
          <label className="space-y-1">
            <span className="text-[10px] text-slate-400">
              จำนวนวันที่พักบัญชี
            </span>
            <input
              type="number"
              min={1}
              max={90}
              value={suspensionDays}
              onChange={(e) => setSuspensionDays(Number(e.target.value))}
              className={fieldClass}
            />
          </label>
        )}

        <textarea
          value={resolutionNote}
          onChange={(e) => setResolutionNote(e.target.value)}
          placeholder="โน้ตภายใน (จำเป็น — ไม่แสดงให้ผู้รายงาน)"
          className={cn(fieldClass, "min-h-[60px] resize-none")}
        />
        <textarea
          value={publicResponse}
          onChange={(e) => setPublicResponse(e.target.value)}
          placeholder="ข้อความที่จะส่งให้ผู้รายงาน (ทางเลือก)"
          className={cn(fieldClass, "min-h-[60px] resize-none")}
        />
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => resolve.mutate()}
          disabled={resolve.isPending || resolveBlocked}
          className="w-full"
        >
          ปิดเรื่อง
        </Button>
      </div>

      {/* Internal note */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <label className={labelClass}>โน้ตภายใน (สำหรับทีมแอดมิน)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="บันทึกเพื่อประสานงานกับแอดมินคนอื่น"
          className={cn(fieldClass, "min-h-[60px] resize-none")}
        />
        <Button
          type="button"
          variant="muted"
          size="sm"
          onClick={() => addNote.mutate()}
          disabled={addNote.isPending || note.trim().length === 0}
          className="w-full"
        >
          เพิ่มโน้ต
        </Button>
      </div>

      {/* Mark duplicate */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <label className={labelClass}>ทำเครื่องหมายว่าซ้ำกับ</label>
        <input
          value={duplicateOf}
          onChange={(e) => setDuplicateOf(e.target.value)}
          placeholder="วาง report id ของรายงานต้นทาง"
          className={fieldClass}
        />
        <Button
          type="button"
          variant="muted"
          size="sm"
          onClick={() => markDuplicate.mutate()}
          disabled={markDuplicate.isPending || duplicateOf.trim().length === 0}
          className="w-full"
        >
          ทำเครื่องหมายว่าซ้ำ
        </Button>
      </div>
    </section>
  );
}
