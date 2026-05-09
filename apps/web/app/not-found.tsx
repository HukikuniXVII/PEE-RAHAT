import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto bg-white p-12 rounded-[32px] border border-slate-200 shadow-sm text-center space-y-6">
      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
        <Compass size={32} />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800">
          ไม่พบหน้าที่คุณกำลังหา
        </h2>
        <p className="text-sm text-slate-500">
          ลิงก์อาจหมดอายุ หรือพิมพ์ที่อยู่ผิด ลองกลับไปเริ่มต้นใหม่
        </p>
      </div>
      <Link
        href="/"
        className="inline-block px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all"
      >
        กลับหน้าแรก
      </Link>
    </div>
  );
}
