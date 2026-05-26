"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";
import {
  getCurrentSubscription,
  getPermission,
  isPushSupported,
  subscribePush,
} from "@/lib/push";

/**
 * FR-CM-08 Phase 3 — push permission nudge.
 *
 * Surfaces a non-modal banner asking the user to enable web push. Held
 * back until BOTH:
 *   - the user has been actively engaged for ≥ 5 minutes (any
 *     pointer / keyboard / focus event resets the inactivity timer),
 *   - and the snooze localStorage flag isn't current.
 *
 * Dismissing snoozes for 7 days. Granting / denying suppresses the
 * banner via the permission state itself (only shown when permission
 * is "default"). The banner also self-hides once the device is already
 * subscribed — re-renders trigger after a successful subscribe.
 */

const SNOOZE_KEY = "peerahat.push.snoozeUntil";
const SNOOZE_DAYS = 7;
const ACTIVITY_DELAY_MS = 5 * 60_000;

export function PushPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (getPermission() !== "default") return;
    if (isSnoozed()) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const reset = () => {
      if (disposed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        // Re-check at fire-time — the user may have already subscribed
        // from the settings page during the inactivity window.
        if (disposed) return;
        if (getPermission() !== "default") return;
        const existing = await getCurrentSubscription();
        if (existing) return;
        setShow(true);
      }, ACTIVITY_DELAY_MS);
    };

    const events = ["pointerdown", "keydown", "focus"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  async function onEnable() {
    setBusy(true);
    try {
      const result = await subscribePush(createApiClient());
      if (result.ok) {
        toast.success("เปิดการแจ้งเตือนแล้ว");
        setShow(false);
      } else if (result.reason === "denied") {
        toast.error("เบราว์เซอร์บล็อกการแจ้งเตือน — เปิดในการตั้งค่าเบราว์เซอร์");
        snooze();
        setShow(false);
      } else if (result.reason === "not-configured") {
        // Quietly hide — admin hasn't wired VAPID yet.
        setShow(false);
      } else {
        toast.error("เปิดการแจ้งเตือนไม่สำเร็จ");
      }
    } finally {
      setBusy(false);
    }
  }

  function onDismiss() {
    snooze();
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] max-w-sm w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-violet-200 p-4 flex gap-3"
    >
      <span className="shrink-0 w-10 h-10 rounded-full bg-grape-soft flex items-center justify-center">
        <Bell size={18} className="text-dusty-grape" />
      </span>
      <div className="flex-1 min-w-0 space-y-2">
        <h3 className="thai text-sm font-bold text-grape-deep">
          เปิดการแจ้งเตือน?
        </h3>
        <p className="thai text-xs text-ink-soft leading-relaxed">
          รับการแจ้งเตือนเมื่อมีคำขอจองใหม่ ข้อความใหม่ หรือคลาสกำลังจะเริ่ม
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onEnable}
            disabled={busy}
            className="thai text-xs font-bold rounded-full bg-dusty-grape text-white px-4 py-2 hover:bg-accent-500 hover:text-neutral-800 transition-colors disabled:opacity-50"
          >
            {busy ? "กำลังเปิด…" : "เปิดเลย"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="thai text-xs font-medium text-ink-mute px-3 py-2 hover:text-ink"
          >
            ทีหลัง
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="ปิด"
        className="absolute top-2 right-2 text-ink-mute hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function isSnoozed(): boolean {
  try {
    const raw = window.localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const until = Number.parseInt(raw, 10);
    if (Number.isNaN(until)) return false;
    return Date.now() < until;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    window.localStorage.setItem(
      SNOOZE_KEY,
      String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60_000),
    );
  } catch {
    /* localStorage blocked → skip; we'll just re-show next session */
  }
}
