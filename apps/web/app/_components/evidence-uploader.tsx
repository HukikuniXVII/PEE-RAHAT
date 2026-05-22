"use client";

import { REPORT_MAX_EVIDENCE_FILES } from "@peerahat/types";
import { useMutation } from "@tanstack/react-query";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

/** Client-side per-file cap — the API re-checks against REPORT_MAX_EVIDENCE_MB. */
const MAX_EVIDENCE_MB = 10;

export interface EvidenceItem {
  objectKey: string;
  name: string;
  /** Object URL for an image preview; undefined for non-image files. */
  previewUrl?: string;
}

interface Props {
  value: EvidenceItem[];
  onChange: (next: EvidenceItem[]) => void;
}

/**
 * Evidence drop zone shared by the report dialog and the follow-up
 * comment dialog (FR-CM-05). Files upload to object storage as they are
 * picked; the parent owns the resulting EvidenceItem list.
 */
export function EvidenceUploader({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: (file: File) => createApiClient().reports.uploadEvidence(file),
  });

  async function handleFiles(files: FileList | null): Promise<void> {
    if (files) {
      let current = value;
      for (const file of Array.from(files)) {
        if (current.length >= REPORT_MAX_EVIDENCE_FILES) {
          toast.error(`แนบหลักฐานได้สูงสุด ${REPORT_MAX_EVIDENCE_FILES} ไฟล์`);
          break;
        }
        if (file.size > MAX_EVIDENCE_MB * 1024 * 1024) {
          toast.error(`ไฟล์ "${file.name}" ใหญ่เกิน ${MAX_EVIDENCE_MB} MB`);
          continue;
        }
        try {
          const { objectKey } = await upload.mutateAsync(file);
          current = [
            ...current,
            {
              objectKey,
              name: file.name,
              previewUrl: file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : undefined,
            },
          ];
          onChange(current);
        } catch {
          toast.error(`อัปโหลด "${file.name}" ไม่สำเร็จ`);
        }
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function remove(objectKey: string): void {
    const found = value.find((e) => e.objectKey === objectKey);
    if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
    onChange(value.filter((e) => e.objectKey !== objectKey));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((e) => (
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
            onClick={() => remove(e.objectKey)}
            aria-label={`ลบหลักฐาน ${e.name}`}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white"
          >
            <X size={11} />
          </button>
        </div>
      ))}
      {value.length < REPORT_MAX_EVIDENCE_FILES && (
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
