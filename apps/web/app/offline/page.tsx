import { WifiOff } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "ออฟไลน์ — Pee Rahat",
  description: "ไม่พบการเชื่อมต่ออินเทอร์เน็ต",
};

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-12">
      <div className="inline-flex w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl items-center justify-center mx-auto">
        <WifiOff size={32} />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900">คุณกำลังออฟไลน์</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          ดูเหมือนว่าตอนนี้ไม่มีอินเทอร์เน็ต ลองเชื่อมต่อใหม่แล้วรีเฟรชหน้านี้ —
          ข้อมูลของคุณยังอยู่ครบ ไม่หายไปไหน
        </p>
      </div>
    </div>
  );
}
