"use client";

import { Button } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import { Film, Link2, Upload } from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@peerahat/ui";

// Final step of tutor onboarding (FR-TH-04). Surfaces a soft nudge to
// upload an intro video before landing on the dashboard. The skip path
// is intentional — the user lands on /tutors/me/edit with the profile
// hidden from search (gate enforced server-side in tutors.search and
// bookings.create) so they can come back and finish from the dashboard.

type SubmitAction = "saved" | "skipped";

interface Props {
  open: boolean;
  onClose: (action: SubmitAction) => void;
}

const URL_VIDEO_HOSTS = /(youtube\.com|youtu\.be|vimeo\.com)/i;
const URL_DIRECT_VIDEO = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

function looksLikeVideoUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return URL_VIDEO_HOSTS.test(u.hostname) || URL_DIRECT_VIDEO.test(u.pathname);
  } catch {
    return false;
  }
}

export function IntroVideoModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (videoUrl: string) => {
      await createApiClient().tutors.updateMe({ introVideoUrl: videoUrl });
    },
    onSuccess: () => {
      onClose("saved");
    },
    onError: (err) => {
      setServerError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    },
  });

  const trimmed = url.trim();
  const hasInput = trimmed.length > 0;
  const isValid = hasInput && looksLikeVideoUrl(trimmed);
  const validationError =
    touched && hasInput && !isValid
      ? "ลิงก์ไม่ใช่ YouTube, Vimeo หรือไฟล์วิดีโอโดยตรง (.mp4 / .webm / .mov)"
      : null;

  // Backdrop / Esc → treat as skip (same as the explicit skip button).
  function handleOpenChange(next: boolean) {
    if (!next && !save.isPending) onClose("skipped");
  }

  function handleSubmit() {
    if (tab !== "url") return;
    setTouched(true);
    setServerError(null);
    if (!isValid) return;
    save.mutate(trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-soft-periwinkle/15 text-soft-periwinkle inline-flex items-center justify-center">
              <Film size={22} />
            </span>
            <DialogTitle className="thai text-[20px] leading-tight">
              ดึงดูดน้องๆ เข้าคลาส ด้วยคลิปแนะนำตัวของคุณ!
            </DialogTitle>
          </div>
          <DialogDescription className="thai text-[13px] mt-1">
            คลิปนี้จะถูกแสดงบนหน้าโปรไฟล์ของคุณ
            เพื่อให้น้องๆ เห็นสไตล์การสอนและตัดสินใจเลือกคุณได้ง่ายขึ้น
            (ความยาว 1–3 นาที)
            ทีมงานจะใช้คลิปนี้เพื่อยืนยันโปรไฟล์ของคุณให้พร้อมรับงาน
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 pb-2">
          <div
            role="tablist"
            aria-label="วิธีอัปโหลดคลิป"
            className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-grape-soft border border-violet-100"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "url"}
              onClick={() => setTab("url")}
              className={`thai text-[13px] font-bold py-2 rounded-xl transition inline-flex items-center justify-center gap-1.5 ${
                tab === "url"
                  ? "bg-white text-grape-deep shadow-[0_2px_6px_-2px_rgba(85,65,139,0.25)]"
                  : "text-grape-deep/70 hover:text-grape-deep"
              }`}
            >
              <Link2 size={14} />
              วางลิงก์วิดีโอ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "file"}
              onClick={() => setTab("file")}
              className={`thai text-[13px] font-bold py-2 rounded-xl transition inline-flex items-center justify-center gap-1.5 ${
                tab === "file"
                  ? "bg-white text-grape-deep shadow-[0_2px_6px_-2px_rgba(85,65,139,0.25)]"
                  : "text-grape-deep/70 hover:text-grape-deep"
              }`}
            >
              <Upload size={14} />
              อัปโหลดคลิป
            </button>
          </div>
        </div>

        <div className="px-8 pt-4 pb-2 min-h-[140px]">
          {tab === "url" ? (
            <div className="space-y-2">
              <label
                htmlFor="intro-video-url"
                className="thai block text-[12px] font-bold text-ink-soft"
              >
                ลิงก์ YouTube, Vimeo หรือไฟล์ .mp4
              </label>
              <input
                id="intro-video-url"
                type="url"
                inputMode="url"
                autoFocus
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (serverError) setServerError(null);
                }}
                onBlur={() => setTouched(true)}
                placeholder="https://youtu.be/..."
                disabled={save.isPending}
                className={`thai w-full px-4 py-3 rounded-2xl bg-white border text-[14px] text-ink placeholder:text-ink-mute focus:shadow-focus outline-none transition-all ${
                  validationError
                    ? "border-rose-300 focus:border-rose-400"
                    : "border-violet-100 focus:border-violet-300"
                }`}
              />
              {validationError && (
                <p className="thai text-[11.5px] text-rose-600 font-medium">
                  {validationError}
                </p>
              )}
              {serverError && (
                <p className="thai text-[11.5px] text-rose-600 font-medium">
                  {serverError}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-grape-soft/30 p-6 text-center space-y-2">
              <Upload
                size={24}
                className="text-violet-300 mx-auto"
                strokeWidth={1.8}
              />
              <p className="thai text-[13px] font-bold text-grape-deep">
                เร็วๆ นี้
              </p>
              <p className="thai text-[11.5px] text-ink-mute leading-relaxed">
                ตอนนี้กรุณาใช้ลิงก์ YouTube หรือ Vimeo ไปก่อน
                ลิงก์โหลดเร็วกว่าและไม่เสียพื้นที่จัดเก็บ
              </p>
            </div>
          )}
        </div>

        <div className="px-8 pb-8 pt-2 flex flex-col items-stretch gap-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={tab === "file" || save.isPending || !hasInput || !isValid}
            className="thai w-full !bg-soft-periwinkle !text-white hover:!bg-[#6063C6] disabled:!bg-ink-mute/30 disabled:!text-ink-mute disabled:!cursor-not-allowed"
          >
            {save.isPending
              ? "กำลังบันทึก..."
              : tab === "url"
                ? "บันทึกลิงก์วิดีโอ"
                : "อัปโหลดคลิป / วางลิงก์วิดีโอ"}
          </Button>
          <button
            type="button"
            onClick={() => {
              if (!save.isPending) onClose("skipped");
            }}
            disabled={save.isPending}
            className="thai text-[12.5px] text-ink-mute hover:text-ink-soft font-semibold py-1 transition-colors disabled:opacity-40"
          >
            ข้ามไปก่อน (อัปโหลดทีหลังเพื่อเปิดการมองเห็นโปรไฟล์)
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
