import { PageBackground } from "@peerahat/ui";
import { Bug } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { MyBugsList } from "./_components/my-bugs-list";

/** The user's own filed bug reports (read-only — no follow-ups; file a new
 *  one if there's more to add). */
export default async function MyBugsPage() {
  const token = await requireAuth("/account/bugs");
  const initial = await createApiClient({ accessToken: token }).bugReports.mine();

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="mx-auto max-w-3xl space-y-8 pb-20">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-grape-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
            <Bug size={12} />
            My Bug Reports
          </div>
          <h1
            className="thai font-bold leading-[1.15] text-grape-deep"
            style={{
              fontSize: "clamp(28px, 2.6vw, 40px)",
              letterSpacing: "-0.02em",
            }}
          >
            บั๊กที่แจ้งไว้
          </h1>
          <p className="thai text-[15px] leading-relaxed text-ink-soft">
            ติดตามสถานะบั๊กที่คุณแจ้ง พร้อมบันทึกการแก้ไขจากทีมงานเมื่อมีอัปเดต
          </p>
        </header>

        <MyBugsList initial={initial} />
      </div>
    </>
  );
}
