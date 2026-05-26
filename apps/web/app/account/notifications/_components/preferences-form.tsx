"use client";

import type {
  NotificationCategory,
  NotificationPreferenceDto,
  NotificationType,
} from "@peerahat/types";
import { NOTIFICATION_CATEGORY_BY_TYPE } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

/**
 * FR-CM-08 — per-event preference accordion. typeOverrides is the
 * source of truth: missing key = enabled. Toggling a row sends a
 * PATCH that merges (server-side) into the existing map. pushEnabled +
 * quietHours UI stays disabled until Phase 3 ships push delivery.
 */

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  bookings: "📅 จอง / คลาส",
  payments: "💰 ชำระเงิน",
  chat: "💬 แชท",
  reports: "🚨 รายงานปัญหา",
  reviews: "⭐ รีวิว",
  account: "🔧 บัญชี",
  system: "🔧 ระบบ",
};

const TYPE_LABELS: Partial<Record<NotificationType, string>> = {
  // Bookings / sessions
  booking_requested: "มีคำขอจองใหม่",
  booking_accepted: "พี่รหัสรับงานแล้ว",
  booking_rejected: "พี่รหัสปฏิเสธคำขอ",
  booking_paid: "ชำระเงินเรียบร้อย",
  booking_meeting_ready: "ลิงก์ห้องเรียนพร้อมแล้ว",
  booking_starting_soon: "คลาสกำลังจะเริ่ม",
  group_invite: "ได้รับคำเชิญเข้ากลุ่ม",
  group_approval_needed: "กลุ่มรอการอนุมัติจากติวเตอร์",
  group_confirmed: "กลุ่มได้รับการยืนยัน",
  group_failed: "กลุ่มไม่สำเร็จ — คืนเงินแล้ว",
  group_invite_responded: "เพื่อนตอบรับ / ปฏิเสธคำเชิญ",
  group_ready_for_review: "กลุ่มพร้อมรอตรวจสอบ (ติวเตอร์)",
  group_decision: "ติวเตอร์ตัดสินใจกลุ่มแล้ว",
  group_status_changed: "สถานะกลุ่มเปลี่ยนแปลง",
  postpone_requested: "มีคำขอเลื่อนคลาส",
  postpone_proposal: "เสนอเวลาใหม่",
  postpone_agreed: "ตกลงเวลาใหม่แล้ว",
  postpone_expired: "การเจรจาเลื่อนคลาสหมดเวลา",
  // Payments
  payment_verified: "สลิปได้รับการตรวจสอบ",
  payment_failed: "ตรวจสอบสลิปไม่ผ่าน",
  payout_processed: "โอนเงินรอบนี้แล้ว",
  // Chat
  chat_new_message: "ข้อความใหม่ในแชท",
  // Reports
  report_filed: "ส่งรายงานเรียบร้อย",
  report_received: "ได้รับรายงานใหม่",
  report_under_review: "มีรายงานเกี่ยวกับคุณ",
  report_resolved: "รายงานได้รับการดำเนินการ",
  report_warning: "บัญชีได้รับคำเตือน",
  report_suspension: "บัญชีถูกพักการใช้งาน",
  report_content_removed: "เนื้อหาถูกลบ",
  report_reporter_warned: "การรายงานล่าสุดไม่เป็นความจริง",
  report_sla_overdue: "รายงานเกินกำหนด SLA",
  // Reviews
  review_received: "ได้รับรีวิวใหม่",
  // Account
  kyc_approved: "KYC ได้รับการอนุมัติ",
  kyc_rejected: "KYC ไม่ผ่าน",
  account_warning: "บัญชีได้รับคำเตือน",
  account_suspended: "บัญชีถูกพักการใช้งาน",
};

// Order categories so the most-used ones surface first.
const CATEGORY_ORDER: NotificationCategory[] = [
  "bookings",
  "payments",
  "chat",
  "reports",
  "reviews",
  "account",
  "system",
];

interface Props {
  initial: NotificationPreferenceDto;
}

export function PreferencesForm({ initial }: Props) {
  const queryClient = useQueryClient();
  const [overrides, setOverrides] = useState<
    Partial<Record<NotificationType, boolean>>
  >(initial.typeOverrides);
  const [pushEnabled] = useState(initial.pushEnabled);

  const save = useMutation({
    mutationFn: (patch: Partial<Record<NotificationType, boolean>>) =>
      createApiClient().notifications.updatePreferences({
        typeOverrides: patch,
      }),
    onSuccess: (next) => {
      setOverrides(next.typeOverrides);
      queryClient.setQueryData(
        ["notifications", "preferences"],
        next,
      );
      toast.success("บันทึกแล้ว");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    },
  });

  // Group every type by its category. Iterate the type map's keys
  // (rather than hard-coding) so adding a new type later wires it in
  // for free.
  const byCategory = groupTypesByCategory();

  function toggle(type: NotificationType) {
    // Default (missing key) is enabled — so the first click should
    // flip to false. Subsequent clicks bounce between true / false.
    const current = overrides[type] ?? true;
    const next = !current;
    save.mutate({ [type]: next });
  }

  return (
    <div className="space-y-6">
      {/* Master push toggle — UI present but disabled until Phase 3
          ships push delivery. Keeps the spec layout intact. */}
      <section className="bg-white rounded-[28px] border border-violet-100 shadow-sm p-6 space-y-3">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="thai text-sm font-bold text-grape-deep">
              การแจ้งเตือนบนมือถือ (Push)
            </h2>
            <p className="thai text-xs text-ink-mute">
              ส่งการแจ้งเตือนไปยังโทรศัพท์เมื่อปิดเว็บไซต์ — เปิดใช้งานเร็วๆ นี้
            </p>
          </div>
          <div className="opacity-50 pointer-events-none">
            <Switch checked={pushEnabled} />
          </div>
        </header>
        <p className="thai text-[11px] text-ink-mute italic">
          (รออัปเดต) ฟีเจอร์นี้กำลังจะเปิดใช้งานในเวอร์ชันถัดไป
        </p>
      </section>

      {/* Per-type accordion sections, one per category. */}
      {CATEGORY_ORDER.map((cat) => {
        const types = byCategory[cat] ?? [];
        if (types.length === 0) return null;
        return (
          <section
            key={cat}
            className="bg-white rounded-[28px] border border-violet-100 shadow-sm overflow-hidden"
          >
            <header className="px-6 py-4 border-b border-slate-100">
              <h2 className="thai text-sm font-bold text-grape-deep">
                {CATEGORY_LABELS[cat]}
              </h2>
            </header>
            <ul className="divide-y divide-slate-100">
              {types.map((type) => {
                const enabled = overrides[type] ?? true;
                return (
                  <li
                    key={type}
                    className="px-6 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="thai text-sm text-slate-700 truncate">
                        {TYPE_LABELS[type] ?? type}
                      </p>
                      <p className="thai text-[10px] text-slate-400 font-mono">
                        {type}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(type)}
                      disabled={save.isPending}
                      aria-pressed={enabled}
                      aria-label={`${TYPE_LABELS[type] ?? type} — ${enabled ? "เปิด" : "ปิด"}`}
                    >
                      <Switch checked={enabled} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {save.isPending && (
        <p className="text-center text-xs text-slate-400 thai inline-flex items-center justify-center gap-1.5">
          <Loader2 size={12} className="animate-spin" />
          กำลังบันทึก…
        </p>
      )}
      {!save.isPending && save.isSuccess && (
        <p className="text-center text-xs text-emerald-600 thai inline-flex items-center justify-center gap-1.5 w-full">
          <CheckCircle2 size={12} />
          บันทึกแล้ว
        </p>
      )}
    </div>
  );
}

function Switch({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex w-11 h-6 rounded-full transition-colors items-center",
        checked ? "bg-violet-600" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "w-5 h-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </span>
  );
}

function groupTypesByCategory(): Record<
  NotificationCategory,
  NotificationType[]
> {
  const out = {
    bookings: [],
    payments: [],
    chat: [],
    reports: [],
    reviews: [],
    account: [],
    system: [],
  } as Record<NotificationCategory, NotificationType[]>;
  for (const [type, cat] of Object.entries(NOTIFICATION_CATEGORY_BY_TYPE) as [
    NotificationType,
    NotificationCategory,
  ][]) {
    out[cat].push(type);
  }
  return out;
}
