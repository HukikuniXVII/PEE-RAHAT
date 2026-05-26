"use client";

import type {
  NotificationCategory,
  NotificationPreferenceDto,
  NotificationType,
  PushDeviceItem,
} from "@peerahat/types";
import { NOTIFICATION_CATEGORY_BY_TYPE } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";
import {
  getCurrentSubscription,
  getPermission,
  isPushSupported,
  subscribePush,
  unsubscribePush,
} from "@/lib/push";

/**
 * FR-CM-08 — per-event preference accordion. typeOverrides is the
 * source of truth: missing key = enabled. Toggling a row sends a
 * PATCH that merges (server-side) into the existing map.
 *
 * FR-CM-08 Phase 3 — the master push toggle, quiet-hours selects,
 * devices list, and test button are wired against the new
 * /push/* endpoints. pushEnabled is the user's STORED preference;
 * the device's current PushSubscription is read live from the
 * browser via getCurrentSubscription() so the UI reflects reality
 * even after a permission revoke from browser settings.
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
  // System
  system_test: "การแจ้งเตือนทดสอบ",
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
  const [pushEnabled, setPushEnabled] = useState(initial.pushEnabled);
  const [quietStart, setQuietStart] = useState<number | null>(
    initial.quietHoursStart,
  );
  const [quietEnd, setQuietEnd] = useState<number | null>(
    initial.quietHoursEnd,
  );

  // Live device state — separate from the stored preference. The user
  // may have pushEnabled=true server-side but not actually granted the
  // browser permission yet, or vice versa (revoked from chrome://).
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [permission, setPermissionState] =
    useState<NotificationPermission>("default");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setPermissionState(getPermission());
    void (async () => {
      const sub = await getCurrentSubscription();
      setCurrentEndpoint(sub?.endpoint ?? null);
    })();
  }, []);

  const save = useMutation({
    mutationFn: (patch: {
      typeOverrides?: Partial<Record<NotificationType, boolean>>;
      pushEnabled?: boolean;
      quietHoursStart?: number | null;
      quietHoursEnd?: number | null;
    }) => createApiClient().notifications.updatePreferences(patch),
    onSuccess: (next) => {
      setOverrides(next.typeOverrides);
      setPushEnabled(next.pushEnabled);
      setQuietStart(next.quietHoursStart);
      setQuietEnd(next.quietHoursEnd);
      queryClient.setQueryData(["notifications", "preferences"], next);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    },
  });

  const devices = useQuery({
    queryKey: ["push", "devices"],
    queryFn: () => createApiClient().push.listDevices(),
  });

  const revokeDevice = useMutation({
    mutationFn: async (id: string) => {
      const api = createApiClient();
      // If revoking the row that matches the current browser, also
      // unsubscribe locally so the browser doesn't keep its now-orphan
      // PushSubscription.
      const matchingCurrent =
        currentEndpoint &&
        devices.data?.some(
          (d) => d.id === id && d.userAgent === navigator.userAgent,
        );
      if (matchingCurrent) {
        await unsubscribePush(api);
        setCurrentEndpoint(null);
      } else {
        await api.push.revokeDevice(id);
      }
    },
    onSuccess: () => {
      toast.success("ลบอุปกรณ์แล้ว");
      void devices.refetch();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    },
  });

  const testPush = useMutation({
    mutationFn: () => createApiClient().push.test(),
    onSuccess: () => toast.success("ส่งการแจ้งเตือนทดสอบแล้ว"),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ"),
  });

  const byCategory = groupTypesByCategory();

  function toggle(type: NotificationType) {
    const current = overrides[type] ?? true;
    save.mutate({ typeOverrides: { [type]: !current } });
  }

  const onTogglePush = useCallback(async () => {
    setPushBusy(true);
    const api = createApiClient();
    try {
      if (pushEnabled && currentEndpoint) {
        // Stored "on" + this device subscribed → flip stored off AND
        // unsubscribe this browser. Other devices keep their subs.
        await unsubscribePush(api);
        setCurrentEndpoint(null);
        await save.mutateAsync({ pushEnabled: false });
        toast.success("ปิดการแจ้งเตือนแล้ว");
      } else {
        // Stored "off" OR this device not subscribed → subscribe now,
        // then flip stored on.
        const result = await subscribePush(api);
        if (!result.ok) {
          if (result.reason === "denied") {
            toast.error(
              "เบราว์เซอร์บล็อกการแจ้งเตือน — เปิดในการตั้งค่าเบราว์เซอร์",
            );
          } else if (result.reason === "not-configured") {
            toast.error("ระบบยังไม่ได้ตั้งค่า VAPID — โปรดติดต่อแอดมิน");
          } else if (result.reason === "unsupported") {
            toast.error("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน");
          } else {
            toast.error("เปิดการแจ้งเตือนไม่สำเร็จ");
          }
          return;
        }
        setCurrentEndpoint(result.subscription.endpoint);
        setPermissionState("granted");
        await save.mutateAsync({ pushEnabled: true });
        await devices.refetch();
        toast.success("เปิดการแจ้งเตือนแล้ว");
      }
    } finally {
      setPushBusy(false);
    }
  }, [pushEnabled, currentEndpoint, save, devices]);

  function setQuiet(side: "start" | "end", v: string) {
    const parsed = v === "" ? null : Number.parseInt(v, 10);
    const normalized = parsed != null && !Number.isNaN(parsed) ? parsed : null;
    if (side === "start") {
      setQuietStart(normalized);
      save.mutate({ quietHoursStart: normalized });
    } else {
      setQuietEnd(normalized);
      save.mutate({ quietHoursEnd: normalized });
    }
  }

  const pushSupported = isPushSupported();
  const blocked = permission === "denied";
  const deviceMatch = (d: PushDeviceItem) =>
    !!currentEndpoint && d.userAgent === navigator.userAgent;

  return (
    <div className="space-y-6">
      {/* Master push toggle. */}
      <section className="bg-white rounded-[28px] border border-violet-100 shadow-sm p-6 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="thai text-sm font-bold text-grape-deep">
              การแจ้งเตือนบนอุปกรณ์นี้
            </h2>
            <p className="thai text-xs text-ink-mute">
              ส่งการแจ้งเตือนมายังเบราว์เซอร์/มือถือ แม้คุณจะไม่ได้เปิดเว็บอยู่
            </p>
          </div>
          <button
            type="button"
            onClick={onTogglePush}
            disabled={!pushSupported || pushBusy || blocked}
            aria-pressed={pushEnabled && !!currentEndpoint}
            aria-label={
              pushEnabled && currentEndpoint
                ? "ปิดการแจ้งเตือน"
                : "เปิดการแจ้งเตือน"
            }
          >
            <Switch checked={pushEnabled && !!currentEndpoint} />
          </button>
        </header>

        {!pushSupported && (
          <p className="thai text-[11px] text-amber-600">
            เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ web push
          </p>
        )}
        {pushSupported && blocked && (
          <p className="thai text-[11px] text-rose-600">
            คุณบล็อกการแจ้งเตือนในการตั้งค่าเบราว์เซอร์ — เปิดได้จาก lock icon บน address bar
          </p>
        )}
        {pushSupported && !blocked && pushEnabled && currentEndpoint && (
          <button
            type="button"
            onClick={() => testPush.mutate()}
            disabled={testPush.isPending}
            className="thai inline-flex items-center gap-1.5 text-xs font-bold text-dusty-grape hover:text-accent-500 disabled:opacity-50"
          >
            <Send size={12} />
            {testPush.isPending ? "กำลังส่ง…" : "ส่งทดสอบ"}
          </button>
        )}
      </section>

      {/* Quiet hours. */}
      <section className="bg-white rounded-[28px] border border-violet-100 shadow-sm p-6 space-y-4">
        <header className="space-y-1">
          <h2 className="thai text-sm font-bold text-grape-deep">
            เวลาเงียบ (ไม่ส่ง push)
          </h2>
          <p className="thai text-xs text-ink-mute">
            ในช่วงนี้ การแจ้งเตือนจะยังเข้าหน้าเว็บ (กระดิ่ง) ปกติ — แค่ไม่มี push
            ขึ้นเครื่อง
          </p>
        </header>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="thai text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              เริ่ม
            </span>
            <select
              value={quietStart ?? ""}
              onChange={(e) => setQuiet("start", e.target.value)}
              className="thai w-full px-3 py-2 border border-violet-200 rounded-xl text-sm bg-white focus:border-violet-400 outline-none"
            >
              <option value="">— ไม่กำหนด —</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="thai text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              สิ้นสุด
            </span>
            <select
              value={quietEnd ?? ""}
              onChange={(e) => setQuiet("end", e.target.value)}
              className="thai w-full px-3 py-2 border border-violet-200 rounded-xl text-sm bg-white focus:border-violet-400 outline-none"
            >
              <option value="">— ไม่กำหนด —</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Devices list. */}
      <section className="bg-white rounded-[28px] border border-violet-100 shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-100">
          <h2 className="thai text-sm font-bold text-grape-deep">
            อุปกรณ์ที่รับการแจ้งเตือน
          </h2>
        </header>
        {devices.isLoading ? (
          <p className="thai text-xs text-ink-mute px-6 py-4">กำลังโหลด…</p>
        ) : (devices.data ?? []).length === 0 ? (
          <p className="thai text-xs text-ink-mute px-6 py-4">
            ยังไม่มีอุปกรณ์ที่ลงทะเบียนรับการแจ้งเตือน
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(devices.data ?? []).map((d) => (
              <li
                key={d.id}
                className="px-6 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="thai text-sm text-slate-700 truncate">
                    {summarizeUserAgent(d.userAgent)}
                    {deviceMatch(d) && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                        อุปกรณ์นี้
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    ล่าสุด {new Date(d.lastSeenAt).toLocaleString("th-TH")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeDevice.mutate(d.id)}
                  disabled={revokeDevice.isPending}
                  aria-label="ลบอุปกรณ์"
                  className="text-rose-500 hover:text-rose-700 disabled:opacity-50 p-2"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

/** Coarse user-agent summary for the devices list — full UA strings
 *  are noisy. Picks the first matching browser × first matching OS. */
function summarizeUserAgent(ua: string | null): string {
  if (!ua) return "อุปกรณ์ไม่ทราบ";
  const browser = ua.match(/Edg\/|Chrome\/|Firefox\/|Safari\//);
  const os = ua.match(/Windows|Macintosh|Linux|Android|iPhone|iPad/);
  const browserName = browser?.[0]?.replace("/", "") ?? "Browser";
  const osName = os?.[0] ?? "Unknown";
  return `${browserName} on ${osName}`;
}
