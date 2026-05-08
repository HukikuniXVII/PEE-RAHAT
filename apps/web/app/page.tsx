import { BookOpen, Calculator, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";

const PILLARS = [
  {
    href: "/tutors",
    label: "Tutor Hub",
    icon: Search,
    description:
      "ระบบค้นหาพี่ติวเตอร์ที่ผ่านการยืนยันตัวตน พร้อมระบบ Diagnostic Quiz",
  },
  {
    href: "/sheets",
    label: "Sheets",
    icon: BookOpen,
    description:
      "ตลาดรวมชีทสรุปคุณภาพสูง พร้อมระบบ Escrow ดูแลความปลอดภัยทุกยอดโอน",
  },
  {
    href: "/tcas",
    label: "TCAS Calc",
    icon: Calculator,
    description:
      "คำนวณโอกาสสอบติด TCAS พร้อมอัลกอริทึม What-If วางแผนการติวให้ตรงจุด",
  },
  {
    href: "/community",
    label: "Webboard",
    icon: Users,
    description:
      "พื้นที่แลกเปลี่ยนกระทู้สำหรับเด็ก ม.ปลาย และรุ่นพี่มหาลัย",
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-24">
      <section className="relative rounded-[48px] overflow-hidden bg-slate-900 p-8 md:p-20 text-white shadow-2xl shadow-slate-200">
        <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              <ShieldCheck size={14} />
              Safe & Verified EdTech Thailand
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter leading-[0.9]">
              TRANSFORM <br />
              <span className="text-indigo-500">YOUR FUTURE.</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed font-medium">
              เชื่อมต่อเด็ก ม.6 กับพี่ติวเตอร์มหาวิทยาลัยชั้นนำ <br />
              ปลอดภัยด้วยระบบ Escrow และการยืนยันตัวตน 100%
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/tutors"
                className="px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-lg hover:bg-indigo-700 shadow-2xl shadow-indigo-900/40 transition-all transform hover:-translate-y-1"
              >
                Find a Tutor
              </Link>
              <Link
                href="/sheets"
                className="px-10 py-5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-[24px] font-black text-lg backdrop-blur-md transition-all"
              >
                Buy Sheets
              </Link>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="w-full aspect-square bg-gradient-to-br from-indigo-500/20 to-transparent rounded-[64px] border border-white/5 flex items-center justify-center relative overflow-hidden">
              <Sparkles size={120} className="text-indigo-500/20 animate-pulse" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4" />
      </section>

      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
            the 4 core pillars
          </h2>
          <div className="w-20 h-1.5 bg-indigo-600 mx-auto rounded-full" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PILLARS.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group bg-white p-10 rounded-[40px] border border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all space-y-8"
            >
              <div className="w-16 h-16 bg-slate-50 group-hover:bg-indigo-600 rounded-2xl flex items-center justify-center text-slate-900 group-hover:text-white transition-all duration-500">
                <feature.icon size={32} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {feature.label}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {feature.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 rounded-[48px] p-12 md:p-20 text-center space-y-12 border border-slate-100">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            PLATFORM BUILT ON TRUST.
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            เพราะการศึกษาคืออนาคต เราจึงให้ความสำคัญกับความปลอดภัยและความถูกต้องสูงสุด <br />
            ทุกติวเตอร์ต้องผ่านการส่ง Transcript และบัตรประชาชน และทุกการชำระเงินถูกดูแลแบบ Escrow
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 items-center justify-center opacity-40 grayscale contrast-125">
          <span className="text-2xl font-black italic">SlipOK</span>
          <span className="text-2xl font-black italic">PromptPay</span>
          <span className="text-2xl font-black italic md:col-span-1 col-span-2">
            DBD Verified
          </span>
        </div>
      </section>
    </div>
  );
}
