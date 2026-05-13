import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { HeroSearch } from "@/app/_components/hero-search";
import { SubjectRow } from "@/app/_components/subject-row";
import { TutorCard } from "@/app/tutors/_components/tutor-card";
import { createApiClient } from "@/lib/api-client";

const TRUST_BADGES = [
  { icon: BadgeCheck, label: "ยืนยันตัวตน 100%" },
  { icon: ShieldCheck, label: "Escrow Payment" },
  { icon: Wallet, label: "คืนเงิน 100%" },
] as const;

const TRUST_PILLARS = [
  {
    icon: BadgeCheck,
    title: "Verified KYC",
    body: "ทุกพี่ติวส่งบัตรประชาชน + ทรานสคริปต์ ให้ Admin ตรวจสอบก่อนรับ Badge",
  },
  {
    icon: ShieldCheck,
    title: "Escrow Payment",
    body: "เงินค่าติวถูกถือไว้กลางๆ จนเรียนเสร็จ ไม่พอใจขอคืนได้ภายใน 24 ชม.",
  },
  {
    icon: Wallet,
    title: "PromptPay One-Tap",
    body: "จ่ายตรงผ่าน PromptPay QR ตรวจยอดอัตโนมัติ ไม่ต้องรอแอดมิน",
  },
] as const;

const HOW_IT_WORKS = [
  {
    n: "01",
    icon: Search,
    title: "ค้นหา",
    body: "เลือกวิชาหรือมหา'ลัย ดูรีวิวจากนักเรียนคนอื่นก่อนตัดสินใจ",
  },
  {
    n: "02",
    icon: CalendarCheck,
    title: "จองล่วงหน้า",
    body: "เลือกวันและเวลา ส่งคำขอ พี่ติวยืนยันภายใน 24 ชม.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "จ่ายผ่าน Escrow",
    body: "เงินถูกถือกลางๆ จะโอนให้พี่ติวก็ต่อเมื่อคลาสเสร็จ",
  },
] as const;

export default async function HomePage() {
  const api = createApiClient();
  const featuredTutors = await api.tutors
    .search({ sort: "rating", page: 1, pageSize: 4 })
    .catch(() => ({ items: [], total: 0, page: 1, pageSize: 4 }));

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero — soft pastel, greeting + accent word */}
      <section className="relative rounded-[40px] overflow-hidden bg-gradient-to-br from-violet-100 via-rose-50 to-sky-100 px-6 sm:px-12 pt-14 sm:pt-20 pb-12 sm:pb-16 text-slate-900 shadow-xl shadow-violet-100/60">
        <div className="absolute -top-24 -left-16 w-72 h-72 bg-rose-200/60 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 right-0 w-80 h-80 bg-violet-300/40 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-12 right-12 w-40 h-40 bg-sky-200/40 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/70 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 ring-1 ring-white">
            <Sparkles size={12} />
            สวัสดี Pee Rahat
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05]">
            วันนี้อยาก
            <span className="relative inline-block text-rose-500 ml-2">
              เรียนพิเศษ
              <span
                aria-hidden
                className="absolute -right-3 top-0 bottom-0 w-[3px] bg-rose-500 animate-pulse"
              />
            </span>
            <br />
            <span className="text-slate-700">วิชาอะไรดี?</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            ยืนยันตัวตน 100% • Escrow Payment • คืนเงินภายใน 24 ชม. ถ้าไม่พอใจ
          </p>

          <HeroSearch />

          <ul className="flex flex-wrap justify-center gap-2 pt-1">
            {TRUST_BADGES.map((b) => (
              <li
                key={b.label}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur rounded-full text-xs font-bold text-slate-700 ring-1 ring-white"
              >
                <b.icon size={14} className="text-emerald-500" />
                {b.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Subject row — overlapping the hero foot like the reference */}
        <div className="relative z-10 mt-12 sm:mt-14 -mb-2">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl ring-1 ring-white shadow-lg shadow-violet-200/40 px-5 sm:px-8 py-6">
            <SubjectRow />
          </div>
        </div>
      </section>

      {/* Featured tutors */}
      {featuredTutors.items.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">
                Featured Tutors
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                พี่ติวคะแนนสูงสุดเดือนนี้
              </h2>
            </div>
            <Link
              href="/tutors"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              ดูทั้งหมด
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredTutors.items.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            จองคลาสง่ายๆ ใน 3 ขั้นตอน
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map((s) => (
            <div
              key={s.n}
              className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 relative overflow-hidden"
            >
              <span className="absolute top-3 right-5 text-5xl font-black text-slate-50 select-none leading-none">
                {s.n}
              </span>
              <div className="relative w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center">
                <s.icon size={20} />
              </div>
              <div className="relative space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">
            Why Pee Rahat
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            แพลตฟอร์มที่ออกแบบบนความไว้ใจ
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {TRUST_PILLARS.map((p) => (
            <div
              key={p.title}
              className="bg-white p-5 rounded-2xl border border-slate-200 flex gap-4 items-start"
            >
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <p.icon size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900">
                  {p.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Become a tutor — colorful ribbon banner */}
      <section className="relative rounded-[32px] overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500 p-8 sm:p-12 text-white grid sm:grid-cols-[1.4fr_1fr] gap-8 items-center shadow-xl shadow-rose-200/40">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 left-10 w-72 h-72 bg-amber-300/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-white ring-1 ring-white/20">
            <Sparkles size={12} />
            For University Students
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
            สร้างรายได้ระหว่างเรียน
          </h3>
          <p className="text-sm text-white/85 leading-relaxed max-w-xl">
            สมัครเป็นพี่ติวกับ Pee Rahat ส่งบัตรประชาชน + ทรานสคริปต์
            ผ่านการอนุมัติแล้วเปิดรับนักเรียนได้ทันที — ระบบ Escrow ดูแลให้คุณได้ค่าตอบแทน 100%
          </p>
          <Link
            href="/tutors/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 hover:bg-rose-50 rounded-2xl font-bold text-sm transition-all shadow-md"
          >
            สมัครเป็นพี่ติว
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="relative hidden sm:flex justify-center">
          <GraduationCap
            size={140}
            className="text-white/30"
            strokeWidth={1.2}
          />
        </div>
      </section>
    </div>
  );
}
