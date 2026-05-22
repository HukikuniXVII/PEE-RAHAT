import { PageBackground } from "@peerahat/ui";
import { Flag } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { MyReportsList } from "./_components/my-reports-list";

/** FR-CM-05: the reporter's own filed reports. */
export default async function MyReportsPage() {
  const token = await requireAuth("/account/reports");
  const api = createApiClient({ accessToken: token });
  const initial = await api.reports.mine();

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="mx-auto max-w-3xl space-y-8 pb-20">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-grape-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
            <Flag size={12} />
            My Reports
          </div>
          <h1
            className="thai font-bold leading-[1.15] text-grape-deep"
            style={{
              fontSize: "clamp(28px, 2.6vw, 40px)",
              letterSpacing: "-0.02em",
            }}
          >
            รายงานของฉัน
          </h1>
          <p className="thai text-[15px] leading-relaxed text-ink-soft">
            ติดตามสถานะเรื่องที่คุณรายงาน และเพิ่มข้อมูลหรือหลักฐานเพิ่มเติมได้
            ระหว่างที่แอดมินกำลังตรวจสอบ
          </p>
        </header>

        <MyReportsList initial={initial} />
      </div>
    </>
  );
}
