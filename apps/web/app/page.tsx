import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  GraduationCap,
  MessagesSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { TutorCard } from "@/app/tutors/_components/tutor-card";
import { createApiClient } from "@/lib/api-client";

const TRUST_PILLARS = [
  {
    icon: BadgeCheck,
    title: "Verified KYC",
    body: "ทุกพี่ติวส่งบัตรประชาชน + ทรานสคริปต์ ให้ Admin ตรวจสอบ ก่อนได้รับ Badge",
  },
  {
    icon: ShieldCheck,
    title: "Escrow Payment",
    body: "เงินค่าติวถูกถือไว้กลางๆ จนเรียนเสร็จ ไม่พอใจขอคืนได้ภายใน 24 ชม.",
  },
  {
    icon: Wallet,
    title: "PromptPay One-Tap",
    body: "จ่ายตรงผ่าน PromptPay QR ตรวจยอดอัตโนมัติด้วย SlipOK ไม่ต้องรอแอดมิน",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "หาพี่ที่ใช่",
    body: "กรองตามวิชา มหาวิทยาลัย หรืออัตราต่อชั่วโมง — ดูรีวิวจากนักเรียนคนอื่นก่อนตัดสินใจ",
    icon: Search,
  },
  {
    n: "02",
    title: "แชทและจอง",
    body: "คุยกับพี่ติวก่อนจองให้แน่ใจว่าตรงกัน เลือกเวลานัด แล้วยืนยันการจอง",
    icon: MessagesSquare,
  },
  {
    n: "03",
    title: "เรียนและรีวิว",
    body: "ชำระเงินผ่าน Escrow เรียนเสร็จ ระบบโอนเงินให้พี่ติวอัตโนมัติ คุณรีวิวให้ดาว",
    icon: GraduationCap,
  },
] as const;

export default async function HomePage() {
  const api = createApiClient();
  const featuredTutors = await api.tutors
    .search({ sort: "rating", page: 1, pageSize: 4 })
    .catch(() => ({ items: [], total: 0, page: 1, pageSize: 4 }));

  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="relative rounded-[48px] overflow-hidden bg-slate-900 p-8 md:p-20 text-white shadow-2xl shadow-slate-200">
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-16 items-center relative z-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              <ShieldCheck size={14} />
              Safe &amp; Verified EdTech Thailand
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95]">
              เรียนกับพี่ติว <br />
              <span className="text-indigo-500">มหา&apos;ลัยชั้นนำ</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-xl leading-relaxed font-medium">
              ทุกพี่ผ่านการยืนยันบัตรประชาชน • ค่าติวถูกถือ Escrow จนคุณพอใจ •
              คืนเงิน 100% ถ้าไม่ตรงสเปก
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/tutors"
                className="px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-lg hover:bg-indigo-700 shadow-2xl shadow-indigo-900/40 transition-all transform hover:-translate-y-1 inline-flex items-center gap-3"
              >
                หาพี่ติว
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/tutors/onboarding"
                className="px-10 py-5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-[24px] font-black text-lg backdrop-blur-md transition-all"
              >
                สมัครเป็นติวเตอร์
              </Link>
            </div>
          </div>

          {/* Stat tiles — replaces the empty decorative panel */}
          <div className="hidden md:grid grid-cols-2 gap-4">
            <StatTile
              label="Verified tutors"
              value={`${featuredTutors.total}+`}
              tint="from-indigo-500/30 to-indigo-500/0"
            />
            <StatTile
              label="Universities"
              value="20+"
              tint="from-emerald-500/30 to-emerald-500/0"
            />
            <StatTile
              label="Refund window"
              value="24 ชม."
              tint="from-amber-500/30 to-amber-500/0"
            />
            <StatTile
              label="Subjects"
              value="7"
              tint="from-rose-500/30 to-rose-500/0"
            />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[28rem] h-[28rem] bg-indigo-600/20 blur-[140px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[24rem] h-[24rem] bg-emerald-500/10 blur-[140px] rounded-full translate-y-1/2 pointer-events-none" />
      </section>

      {/* Trust pillars */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
            Why Pee Rahat
          </p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            แพลตฟอร์มที่ออกแบบบนความไว้ใจ
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TRUST_PILLARS.map((p) => (
            <div
              key={p.title}
              className="bg-white p-8 rounded-[32px] border border-slate-100 space-y-5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50 transition-all"
            >
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <p.icon size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">{p.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured tutors */}
      {featuredTutors.items.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
                Featured Tutors
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                พี่ติวคะแนนสูงสุดในเดือนนี้
              </h2>
            </div>
            <Link
              href="/tutors"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              ดูทั้งหมด
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredTutors.items.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            จากค้นหา ถึงเรียน ภายใน 3 ขั้นตอน
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="bg-white p-8 rounded-[32px] border border-slate-100 space-y-5 relative"
            >
              <span className="absolute top-6 right-8 text-7xl font-black text-slate-50 select-none leading-none">
                {s.n}
              </span>
              <div className="relative w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                <s.icon size={26} />
              </div>
              <div className="relative space-y-2">
                <h3 className="text-xl font-black text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TCAS callout */}
      <section className="rounded-[48px] overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-10 md:p-16 grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
            <Sparkles size={12} />
            Free Tool
          </div>
          <h3 className="text-3xl md:text-4xl font-black tracking-tight">
            คำนวณโอกาสสอบติด TCAS
          </h3>
          <p className="text-emerald-50 text-base max-w-xl leading-relaxed">
            ใส่คะแนนของคุณ ระบบจะคำนวณโอกาสติดของแต่ละมหา&apos;ลัย พร้อมแนะนำว่าวิชาไหนต้องติวเพิ่มเพื่อให้ถึงเป้า
          </p>
          <Link
            href="/tcas"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-2xl font-black hover:bg-emerald-50 transition-all"
          >
            <Calculator size={18} />
            ลองใช้ TCAS Calculator
          </Link>
        </div>
        <div className="hidden md:flex justify-center">
          <Calculator
            size={160}
            className="text-white/20"
            strokeWidth={1.2}
          />
        </div>
      </section>

      {/* Become a tutor */}
      <section className="bg-slate-900 rounded-[48px] p-10 md:p-16 text-white grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
        <div className="space-y-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
            For University Students
          </p>
          <h3 className="text-3xl md:text-4xl font-black tracking-tight">
            สร้างรายได้ระหว่างเรียน
          </h3>
          <p className="text-slate-400 leading-relaxed max-w-xl">
            สมัครเป็นพี่ติวกับ Pee Rahat ส่งบัตรประชาชน + ทรานสคริปต์
            ผ่านการอนุมัติแล้วเปิดรับนักเรียนได้ทันที — ระบบ Escrow ดูแลให้คุณได้ค่าตอบแทน 100%
          </p>
          <Link
            href="/tutors/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black transition-all"
          >
            สมัครเป็นพี่ติว
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="hidden md:flex justify-center">
          <GraduationCap
            size={180}
            className="text-white/15"
            strokeWidth={1.2}
          />
        </div>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div
      className={`relative bg-gradient-to-br ${tint} border border-white/10 rounded-[28px] p-6 overflow-hidden`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
        {label}
      </p>
      <p className="text-4xl font-black mt-2 tracking-tight">{value}</p>
    </div>
  );
}
