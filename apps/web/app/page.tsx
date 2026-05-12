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
import { SubjectGrid } from "@/app/_components/subject-grid";
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
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative rounded-[40px] overflow-hidden bg-slate-900 px-6 sm:px-12 py-12 sm:py-20 text-white shadow-2xl shadow-slate-200">
        <div className="relative z-10 max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
            <ShieldCheck size={12} />
            Safe &amp; Verified EdTech Thailand
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05]">
            หาพี่ติวมหา&apos;ลัยชั้นนำ
            <br />
            <span className="text-indigo-400">ในไม่กี่คลิก</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            ยืนยันตัวตน 100% • Escrow Payment • คืนเงินภายใน 24 ชม. ถ้าไม่พอใจ
          </p>
          <HeroSearch />

          <ul className="flex flex-wrap gap-3 pt-2">
            {TRUST_BADGES.map((b) => (
              <li
                key={b.label}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-xs font-bold text-slate-100"
              >
                <b.icon size={14} className="text-emerald-400" />
                {b.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="absolute top-0 right-0 w-[24rem] h-[24rem] bg-indigo-600/30 blur-[140px] rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[20rem] h-[20rem] bg-emerald-500/15 blur-[140px] rounded-full translate-y-1/2 pointer-events-none" />
      </section>

      {/* Subject grid */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
              Browse by subject
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              เลือกวิชาที่อยากเรียน
            </h2>
          </div>
          <Link
            href="/tutors"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            ดูพี่ติวทั้งหมด
            <ArrowRight size={14} />
          </Link>
        </div>
        <SubjectGrid />
      </section>

      {/* Featured tutors */}
      {featuredTutors.items.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
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
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
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

      {/* Pillars — downsized */}
      <section className="space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
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

      {/* Become a tutor */}
      <section className="bg-slate-900 rounded-[32px] p-8 sm:p-12 text-white grid sm:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300">
            <Sparkles size={12} />
            For University Students
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
            สร้างรายได้ระหว่างเรียน
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
            สมัครเป็นพี่ติวกับ Pee Rahat ส่งบัตรประชาชน + ทรานสคริปต์
            ผ่านการอนุมัติแล้วเปิดรับนักเรียนได้ทันที — ระบบ Escrow ดูแลให้คุณได้ค่าตอบแทน 100%
          </p>
          <Link
            href="/tutors/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold text-sm transition-all"
          >
            สมัครเป็นพี่ติว
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hidden sm:flex justify-center">
          <GraduationCap
            size={140}
            className="text-white/15"
            strokeWidth={1.2}
          />
        </div>
      </section>
    </div>
  );
}
