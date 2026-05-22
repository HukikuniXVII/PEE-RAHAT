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
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

/** Client-side per-file cap — the API re-checks against REPORT_MAX_EVIDENCE_MB. */
const MAX_EVIDENCE_MB = 10;

interface EvidenceItem {
  objectKey: string;
  name: string;
  /** Object URL for an image preview; undefined for non-image files. */
  previewUrl?: string;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmed = description.trim();
  const descriptionValid =
    trimmed.length >= REPORT_DESCRIPTION_MIN &&
    trimmed.length <= REPORT_DESCRIPTION_MAX;

  const upload = useMutation({
    mutationFn: (file: File) => createApiClient().reports.uploadEvidence(file),
  });

  const submit = useMutation({
    mutationFn: () =>
      createApiClient().reports.create({
        targetType,
        targetId,
        category,
        description: trimmed,
        evidenceKeys: evidence.map((e) => e.objectKey),
      }),
    onSuccess: () => {
      setDone(true);
      toast.success("ส่งรายงานเรียบร้อย");
      onReported?.();
      setTimeout(onClose, 2000);
    },
  });

  async function handleFiles(files: FileList | null): Promise<void> {
    if (files) {
      for (const file of Array.from(files)) {
        if (evidence.length >= REPORT_MAX_EVIDENCE_FILES) {
          toast.error(`แนบหลักฐานได้สูงสุด ${REPORT_MAX_EVIDENCE_FILES} ไฟล์`);
          break;
        }
        if (file.size > MAX_EVIDENCE_MB * 1024 * 1024) {
          toast.error(`ไฟล์ "${file.name}" ใหญ่เกิน ${MAX_EVIDENCE_MB} MB`);
          continue;
        }
        try {
          const { objectKey } = await upload.mutateAsync(file);
          setEvidence((prev) =>
            prev.length >= REPORT_MAX_EVIDENCE_FILES
              ? prev
              : [
                  ...prev,
                  {
                    objectKey,
                    name: file.name,
                    previewUrl: file.type.startsWith("image/")
                      ? URL.createObjectURL(file)
                      : undefined,
                  },
                ],
          );
        } catch {
          toast.error(`อัปโหลด "${file.name}" ไม่สำเร็จ`);
        }
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeEvidence(objectKey: string): void {
    setEvidence((prev) => {
      const found = prev.find((e) => e.objectKey === objectKey);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((e) => e.objectKey !== objectKey);
    });
  }

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
              <div className="flex flex-wrap gap-2">
                {evidence.map((e) => (
                  <div
                    key={e.objectKey}
                    className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {e.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- blob preview, not an optimisable asset
                      <img
                        src={e.previewUrl}
                        alt={e.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FileText size={20} className="text-slate-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeEvidence(e.objectKey)}
                      aria-label={`ลบหลักฐาน ${e.name}`}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {evidence.length < REPORT_MAX_EVIDENCE_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={upload.isPending}
                    aria-label="แนบไฟล์หลักฐาน"
                    className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-50"
                  >
                    {upload.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Paperclip size={18} />
                    )}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />
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
                disabled={
                  !descriptionValid || submit.isPending || upload.isPending
                }
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
