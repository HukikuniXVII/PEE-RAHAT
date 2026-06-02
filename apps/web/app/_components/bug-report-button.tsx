"use client";

import { cn } from "@peerahat/ui";
import { Bug } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { installConsoleCapture } from "@/lib/console-capture";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { BugReportDialog } from "./bug-report-dialog";

/**
 * Floating "report a bug" launcher, mounted globally for every visitor
 * (logged-in or not). Sits bottom-right, 20px from the edges, so it never
 * competes with the top-right notification bell. Hidden on /admin/* — admins
 * use their own queue. Pill with label on desktop, icon-only circle on
 * mobile (<640px, 44px+ tap target).
 */
export function BugReportButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // Start buffering console errors/warns as early as this mounts so a
  // report filed later can attach them (opt-in).
  useEffect(() => {
    installConsoleCapture();
  }, []);

  // Best-effort auth check to tailor the post-submit follow-up toast.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (active) setIsAuthed(!!data.session);
      } catch {
        if (active) setIsAuthed(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Admins have their own tooling — don't show the button on /admin/*.
  if (pathname?.startsWith("/admin")) return null;

  // The notification bell (authed users only) is a 48px circle at
  // bottom-4 right-4 / md:bottom-6 md:right-6 (see notification-bell.tsx).
  // When it's present, sit on the SAME baseline just to its left so the
  // two never overlap; otherwise tuck into the corner.
  const position = isAuthed
    ? "bottom-4 right-[76px] md:bottom-6 md:right-[84px]"
    : "bottom-4 right-4 md:bottom-6 md:right-6";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="แจ้งบั๊ก"
        className={cn(
          "group fixed z-40 flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-slate-700 text-white ring-1 ring-white/10 shadow-lg shadow-slate-900/30 transition-all duration-200 hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 focus-visible:outline-none focus-visible:shadow-focus sm:w-auto sm:px-4 sm:pr-5",
          position,
        )}
      >
        <Bug
          size={18}
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:rotate-12"
        />
        <span className="thai hidden text-sm font-bold sm:inline">แจ้งบั๊ก</span>
      </button>

      <BugReportDialog open={open} onOpenChange={setOpen} isAuthed={isAuthed} />
    </>
  );
}
