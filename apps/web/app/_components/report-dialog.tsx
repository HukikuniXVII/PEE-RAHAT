"use client";

import {
  CATEGORIES_BY_TARGET,
  REPORT_CATEGORY_LABELS,
  REPORT_DESCRIPTION_MAX,
  REPORT_DESCRIPTION_MIN,
  REPORT_MAX_EVIDENCE_FILES,
  type ReportCategory,
  type ReportTarget,
} from "@peerahat/types";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@peerahat/ui";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";
import { useMutationWithToast } from "@/lib/hooks/use-mutation-with-toast";

import { EvidenceUploader, type EvidenceItem } from "./evidence-uploader";

interface Props {
  targetType: ReportTarget;
  targetId: string;
  onClose: () => void;
  onReported?: () => void;
}

/**
 * Shared report dialog (FR-CM-05 / FR-SM-07 / FR-PM-05). The category list
 * is filtered by `targetType`; evidence files upload to object storage as
 * they are picked and the returned keys ride along with the report.
 */
export function ReportDialog({
  targetType,
  targetId,
  onClose,
  onReported,
}: Props) {
  const categories = CATEGORIES_BY_TARGET[targetType];
  const [category, setCategory] = useState<ReportCategory>(
    categories[0] ?? "other",
  );
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [done, setDone] = useState(false);

  const trimmed = description.trim();
  const descriptionValid =
    trimmed.length >= REPORT_DESCRIPTION_MIN &&
    trimmed.length <= REPORT_DESCRIPTION_MAX;

  const submit = useMutationWithToast({
    mutationFn: () =>
      createApiClient().reports.create({
        targetType,
        targetId,
        category,
        description: trimmed,
        evidenceKeys: evidence.map((e) => e.objectKey),
      }),
    successMessage: "ส่งรายงานเรียบร้อย",
    onSuccess: () => {
      setDone(true);
      onReported?.();
      setTimeout(onClose, 2000);
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="p-8 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <DialogTitle>ส่งรายงานเรียบร้อย</DialogTitle>
            <DialogDescription className="text-xs">
              ทีมงานจะตรวจสอบและตอบกลับ — ดูสถานะได้ที่{" "}
              <Link
                href={"/account/reports" as Route}
                className="font-bold text-indigo-600 underline"
              >
                บัญชีของฉัน &gt; รายงาน
              </Link>
            </DialogDescription>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (descriptionValid && !submit.isPending) submit.mutate();
            }}
            className="p-8 space-y-5"
          >
            <div className="space-y-2">
              <DialogTitle>รายงานปัญหา</DialogTitle>
              <DialogDescription className="text-xs">
                แอดมินจะตรวจสอบรายงานของคุณด้วยตนเอง
                เวลาตอบกลับโดยเฉลี่ยขึ้นกับความเร่งด่วนของเรื่อง
              </DialogDescription>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="report-category"
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                หมวดหมู่
              </label>
              <select
                id="report-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {REPORT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="report-description"
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  รายละเอียด
                </label>
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    descriptionValid ? "text-slate-400" : "text-rose-500",
                  )}
                >
                  {trimmed.length}/{REPORT_DESCRIPTION_MAX}
                </span>
              </div>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={REPORT_DESCRIPTION_MAX}
                placeholder={`เล่ารายละเอียดให้ทีมงานตรวจสอบได้ถูกต้อง (อย่างน้อย ${REPORT_DESCRIPTION_MIN} ตัวอักษร)`}
                className="min-h-[120px] w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                หลักฐาน (ไม่บังคับ — สูงสุด {REPORT_MAX_EVIDENCE_FILES} ไฟล์)
              </label>
              <EvidenceUploader value={evidence} onChange={setEvidence} />
            </div>

            <div className="flex gap-2 rounded-2xl bg-slate-50 p-3">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="text-[11px] leading-relaxed text-slate-500">
                ข้อมูลในหลักฐานจะถูกเก็บเพื่อการตรวจสอบเท่านั้น
                และจะถูกลบหลังจากปิดเรื่องแล้ว 90 วัน
              </p>
            </div>

            {submit.error && (
              <p className="text-xs font-medium text-rose-600">
                {submit.error.message}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="muted"
                onClick={onClose}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!descriptionValid || submit.isPending}
                className="flex-1"
              >
                {submit.isPending ? "กำลังส่ง..." : "ส่งรายงาน"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
