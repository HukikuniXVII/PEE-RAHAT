"use client";

import {
  BUG_CATEGORIES,
  BUG_MAX_SCREENSHOTS,
  BUG_SCREENSHOT_MAX_MB,
  BUG_SEVERITIES,
  type BugCategory,
  type BugSeverity,
} from "@peerahat/types";
import { Button, cn, Dialog, DialogContent, Input } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Loader2, Bug as BugIcon, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";
import {
  BUG_CATEGORY_LABELS,
  BUG_SEVERITY_ACTIVE,
  BUG_SEVERITY_LABELS,
} from "@/lib/bug-labels";
import { getConsoleLog } from "@/lib/console-capture";
import { getErrorMessage } from "@/lib/error-message";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Drives the "view status in your account" follow-up toast. */
  isAuthed: boolean;
}

interface Shot {
  objectKey: string;
  previewUrl: string;
}

const MAX_BYTES = BUG_SCREENSHOT_MAX_MB * 1024 * 1024;

export function BugReportDialog({ open, onOpenChange, isAuthed }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BugCategory | "">("");
  const [severity, setSeverity] = useState<BugSeverity>("normal");
  const [description, setDescription] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [uploading, setUploading] = useState(false);
  const [includeConsole, setIncludeConsole] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setCategory("");
    setSeverity("normal");
    setDescription("");
    shots.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setShots([]);
    setUploading(false);
    setIncludeConsole(true);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = BUG_MAX_SCREENSHOTS - shots.length;
    const picked = Array.from(files).slice(0, room);
    setUploading(true);
    try {
      for (const file of picked) {
        if (!file.type.startsWith("image/")) {
          setError("รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
          continue;
        }
        if (file.size > MAX_BYTES) {
          setError(`ไฟล์ต้องไม่เกิน ${BUG_SCREENSHOT_MAX_MB}MB`);
          continue;
        }
        const { objectKey } = await createApiClient().bugReports.uploadScreenshot(
          file,
        );
        setShots((prev) => [
          ...prev,
          { objectKey, previewUrl: URL.createObjectURL(file) },
        ]);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function removeShot(key: string) {
    setShots((prev) => {
      const gone = prev.find((s) => s.objectKey === key);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((s) => s.objectKey !== key);
    });
  }

  const submit = useMutation({
    mutationFn: () => {
      const consoleLog = includeConsole ? getConsoleLog() : "";
      return createApiClient().bugReports.create({
        title: title.trim(),
        category: category as BugCategory,
        severity,
        description: description.trim(),
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
        screenshotKeys: shots.map((s) => s.objectKey),
        consoleLog: consoleLog || undefined,
      });
    },
    onSuccess: () => {
      toast.success("ส่งแล้ว ขอบคุณที่ช่วยให้พี่รหัสดีขึ้น 🙏");
      if (isAuthed) {
        toast("ดูสถานะที่ บัญชีของฉัน > บั๊กที่แจ้งไว้");
      }
      handleOpenChange(false);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const titleOk = title.trim().length >= 5 && title.trim().length <= 120;
  const descOk =
    description.trim().length >= 20 && description.trim().length <= 3000;
  const canSubmit =
    titleOk && descOk && category !== "" && !uploading && !submit.isPending;

  const fieldLabel =
    "thai text-[12px] font-bold uppercase tracking-widest text-ink-mute";
  const fieldBox =
    "min-h-[44px] w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-800 transition-shadow hover:border-violet-200 focus:border-[1.5px] focus:border-violet-500 focus:shadow-focus focus:outline-none";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col p-0 sm:max-w-[540px] max-sm:h-[100dvh] max-sm:max-h-none max-sm:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-white">
              <BugIcon size={17} aria-hidden="true" />
            </span>
            <h2 className="text-lg font-bold text-grape-deep">แจ้งบั๊ก</h2>
          </div>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            aria-label="ปิด"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mute hover:bg-neutral-100 hover:text-grape-deep"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <form
          id="bug-report-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) submit.mutate();
          }}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="bug-title" className={fieldLabel}>
              หัวข้อ
            </label>
            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="สรุปปัญหาในประโยคเดียว"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label htmlFor="bug-category" className={fieldLabel}>
              หมวดหมู่
            </label>
            <select
              id="bug-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as BugCategory | "")}
              className={fieldBox}
            >
              <option value="">— เลือกหมวดหมู่ —</option>
              {BUG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {BUG_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          {/* Severity — segmented */}
          <div className="space-y-1.5">
            <span className={fieldLabel}>ความรุนแรง</span>
            <div className="grid grid-cols-3 gap-2">
              {BUG_SEVERITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={cn(
                    "min-h-[44px] rounded-md border px-2 text-[12.5px] font-bold transition-colors thai",
                    severity === s
                      ? `${BUG_SEVERITY_ACTIVE[s]} border-transparent`
                      : "border-neutral-200 bg-white text-ink-soft hover:border-violet-200",
                  )}
                >
                  {BUG_SEVERITY_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="bug-desc" className={fieldLabel}>
              รายละเอียด
            </label>
            <textarea
              id="bug-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={3000}
              rows={4}
              placeholder="เกิดอะไรขึ้น? คุณกำลังทำอะไรอยู่ตอนเกิดปัญหา? คาดหวังให้เกิดอะไร?"
              className={cn(fieldBox, "thai resize-none py-2 leading-relaxed")}
            />
          </div>

          {/* Screenshots */}
          <div className="space-y-2">
            <span className={fieldLabel}>
              ภาพหน้าจอ (ไม่บังคับ · สูงสุด {BUG_MAX_SCREENSHOTS})
            </span>
            <div className="flex flex-wrap gap-2.5">
              {shots.map((s) => (
                <div
                  key={s.objectKey}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.previewUrl}
                    alt="screenshot"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeShot(s.objectKey)}
                    aria-label="ลบภาพ"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {shots.length < BUG_MAX_SCREENSHOTS && (
                <label
                  className={cn(
                    "flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 text-ink-mute hover:border-violet-300 hover:text-violet-500",
                    uploading && "pointer-events-none opacity-60",
                  )}
                >
                  {uploading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ImagePlus size={18} />
                  )}
                  <span className="text-[10px] font-bold">เพิ่มภาพ</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void onPickFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Console log opt-in */}
          <label className="flex items-start gap-2.5 rounded-lg bg-neutral-50 p-3">
            <input
              type="checkbox"
              checked={includeConsole}
              onChange={(e) => setIncludeConsole(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-violet-500"
            />
            <span className="thai text-[12.5px] leading-relaxed text-ink-soft">
              แนบ console log (50 รายการล่าสุด) — ช่วยให้ทีมงานหาสาเหตุได้เร็วขึ้น
            </span>
          </label>

          {error && <p className="thai text-sm text-rose-600">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4">
          <Button
            type="button"
            variant="ghost-brand"
            size="brand-md"
            onClick={() => handleOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="bug-report-form"
            variant="primary"
            size="brand-md"
            disabled={!canSubmit}
          >
            {submit.isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                กำลังส่ง...
              </>
            ) : (
              "ส่งรายงาน"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
