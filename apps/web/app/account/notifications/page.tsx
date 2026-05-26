import { PageBackground } from "@peerahat/ui";
import { Bell } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { PreferencesForm } from "./_components/preferences-form";

/**
 * FR-CM-08 — full notification settings. Per-type accordion grouped by
 * category + master push toggle (inert until Phase 3 ships push) +
 * quiet hours (also inert). Server-loads the initial preference snapshot
 * so the form is fully populated on first paint.
 */
export default async function NotificationSettingsPage() {
  const token = await requireAuth("/account/notifications");
  const api = createApiClient({ accessToken: token });
  const initial = await api.notifications.getPreferences();

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
            <Bell size={12} />
            Notifications
          </div>
          <h1 className="thai font-bold text-grape-deep text-[clamp(28px,2.6vw,40px)] leading-[1.15]">
            ตั้งค่าการแจ้งเตือน
          </h1>
          <p className="thai text-[15px] text-ink-soft leading-relaxed">
            เลือกประเภทเหตุการณ์ที่อยากรับการแจ้งเตือน — เปิด/ปิดได้ทีละข้อ
          </p>
        </header>
        <PreferencesForm initial={initial} />
      </div>
    </>
  );
}
