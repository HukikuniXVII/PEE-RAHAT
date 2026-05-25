"use client";

import { Film, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * FR-TH-04 dashboard nudge for tutors who skipped the intro-video step
 * during onboarding. Sunglow-bordered (accent-500) so it stands out
 * against the BankStatusBanner/GoogleCalendarCard which use the muted
 * Required/Connected grammar. Only rendered when `introVideoUrl` is
 * null — once a URL is saved, both this banner and the search/booking
 * gates disappear together.
 *
 * The CTA scrolls + focuses + flashes the intro-video input that already
 * lives inside ProfileEditForm; the form picks up `?focus=video` from the
 * URL and animates a ring around its input for ~1.5s. Same field powers
 * the milestone tick in ProfileCompletionPanel.
 */
export function VideoPendingBanner() {
  const router = useRouter();

  function focusVideoInput() {
    router.replace("/tutors/me/edit?focus=video", { scroll: false });
    requestAnimationFrame(() => {
      const el = document.getElementById("intro-video-input");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // The form's own ?focus=video effect handles focus + flash; we
        // only smooth-scroll because the form lives below this banner.
      }
    });
  }

  return (
    <section className="rounded-[40px] border-2 border-accent-500 bg-accent-50/80 shadow-[0_8px_24px_-16px_rgba(240,203,103,0.45)] p-6 md:p-8 space-y-4">
      <header className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-2xl bg-accent-500/20 text-accent-700 inline-flex items-center justify-center shrink-0">
          <Lock size={22} strokeWidth={2.2} />
        </span>
        <div className="space-y-1 min-w-0">
          <h2 className="thai text-xl font-black text-grape-deep">
            โปรไฟล์ของคุณยังไม่ถูกเปิดให้ค้นหา 🔒
          </h2>
          <p className="thai text-sm text-ink-soft leading-relaxed">
            อัปโหลดคลิปแนะนำตัวและสไตล์การสอน
            เพื่อให้ทีมงานยืนยันโปรไฟล์ของคุณ
            และเริ่มรับการจองคลาสจากน้องๆ ได้เลย!
          </p>
        </div>
      </header>

      <button
        type="button"
        onClick={focusVideoInput}
        className="thai inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl bg-accent-500 text-grape-deep hover:bg-accent-600 transition-colors shadow-[0_4px_10px_-4px_rgba(240,203,103,0.6)]"
      >
        <Film size={14} />
        อัปโหลดคลิปเลย
      </button>
    </section>
  );
}
