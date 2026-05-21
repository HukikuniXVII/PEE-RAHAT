import { PageBackground } from "@peerahat/ui";
import { WifiOff } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "ออฟไลน์ — Pee Rahat",
  description: "ไม่พบการเชื่อมต่ออินเทอร์เน็ต",
};

export default function OfflinePage() {
  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="max-w-md mx-auto text-center space-y-6 py-16">
        <div className="inline-flex w-16 h-16 bg-violet-500 text-white rounded-2xl items-center justify-center mx-auto shadow-[0_8px_18px_-8px_rgba(85,65,139,0.55)]">
          <WifiOff size={28} />
        </div>
        <div className="space-y-3">
          <h1
            className="thai font-bold text-grape-deep"
            style={{
              fontSize: "clamp(28px, 2.8vw, 38px)",
              letterSpacing: "-0.02em",
            }}
          >
            คุณกำลังออฟไลน์
          </h1>
          <p className="text-[15px] text-ink-soft leading-relaxed thai">
            ดูเหมือนว่าตอนนี้ไม่มีอินเทอร์เน็ต ลองเชื่อมต่อใหม่แล้วรีเฟรชหน้านี้ —
            ข้อมูลของคุณยังอยู่ครบ ไม่หายไปไหน
          </p>
        </div>
      </div>
    </>
  );
}
