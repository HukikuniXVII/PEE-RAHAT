import {
  ArrowRight,
  CalendarClock,
  Check,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

const CARDS = [
  {
    icon: <Search size={22} strokeWidth={1.9} />,
    title: "ค้นหา",
    body: "เลือกพี่ที่ถูกใจ\nตามรายวิชาและคุณสมบัติ",
  },
  {
    icon: <CalendarClock size={22} strokeWidth={1.9} />,
    title: "จองเวลาเรียน",
    body: "ส่งคำขอจองคาบ\nพี่ตอบรับใน 24 ชม.",
  },
  {
    icon: <ShieldCheck size={22} strokeWidth={1.9} />,
    title: "ชำระเงิน",
    body: "ชำระผ่าน PromptPay QR\nปลอดภัย Escrow 24 ชม.",
  },
];

export function Hero() {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-8 pb-12 overflow-hidden">
      <Sparkles />

      {/* Main headline */}
      <h1
        className="relative z-10 thai font-bold text-grape-deep text-center leading-[1.1] tracking-tight"
        style={{ fontSize: "clamp(48px, 4vw, 78px)", letterSpacing: "-0.02em" }}
      >
        ติวถูกจุด คุยถูกคอ สไตล์พี่รหัส
      </h1>

      {/* Subtitle */}
      <p className="relative z-10 mt-6 thai text-center text-[18px] text-ink-soft leading-[1.8] max-w-[600px]">
        หาพี่ติวเองก็เหนื่อย จะตามโฆษณาก็ไม่มั่นใจ บางทีก็เรียนไม่เข้าใจ
        <br />
        ที่นี่เราให้น้องเจอพี่รหัส ที่คุยภาษาเดียวกันที่นี่
      </p>

      {/* Feature cards — icon overflows the top edge of each card */}
      <div className="relative z-10 mt-14 grid grid-cols-3 gap-6 w-full max-w-[860px]">
        {CARDS.map((c) => (
          <OverflowCard key={c.title} icon={c.icon} title={c.title} body={c.body} />
        ))}
      </div>

      {/* CTAs */}
      <div className="relative z-10 mt-10 flex items-center gap-4">
        <Link
          href={"/login" as Route}
          className="thai inline-flex items-center gap-2 rounded-[16px] bg-dusty-grape px-8 py-4 text-[16px] font-bold text-white-smoke hover:opacity-90 transition-opacity shadow-lg"
        >
          เริ่มต้นใช้งาน
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
        <a
          href="#about"
          className="thai inline-flex items-center gap-2 rounded-[16px] border-[2px] border-dusty-grape px-8 py-4 text-[16px] font-bold text-dusty-grape hover:bg-dusty-grape/5 transition-colors"
        >
          อะไรคือพี่รหัส?
        </a>
      </div>

      {/* Trust row */}
      <div className="relative z-10 mt-8 flex items-center gap-7 text-[13px] text-ink-mute thai">
        <span className="flex items-center gap-1.5">
          <Check size={13} className="text-dusty-grape" /> พี่รหัสผ่านการยืนยันตัวตน
        </span>
        <span className="flex items-center gap-1.5">
          <Check size={13} className="text-dusty-grape" /> รีวิวจริงจากรุ่นน้อง
        </span>
        <span className="flex items-center gap-1.5">
          <Check size={13} className="text-dusty-grape" /> PromptPay
        </span>
        <span className="flex items-center gap-1.5">
          <Check size={13} className="text-dusty-grape" /> ยกเลิกได้ภายใน 24 ชม.
        </span>
      </div>
    </div>
  );
}

/** Card where the icon circle straddles the top edge — half above, half inside. */
function OverflowCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    // pt-6 = half of icon height (h-12 = 48px → 24px = 6 × 4px)
    <div className="relative pt-6">
      {/* Icon — centered at the top boundary of the card */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 h-12 w-12 flex items-center justify-center rounded-full bg-violet-500 text-neutral-50 shadow-[0_8px_20px_-6px_rgba(85,65,139,0.45)]">
        {icon}
      </div>

      {/* Card body */}
      <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 pt-8 pb-6 text-center shadow-card">
        <h3 className="text-base font-semibold text-violet-700 thai">{title}</h3>
        <p className="text-xs leading-[1.6] text-neutral-500 thai whitespace-pre-line">
          {body}
        </p>
      </div>
    </div>
  );
}

function Sparkles() {
  const positions = [
    { top: "8%", left: "5%", size: "text-2xl", opacity: "opacity-40" },
    { top: "12%", right: "9%", size: "text-lg", opacity: "opacity-50" },
    { top: "30%", left: "3%", size: "text-base", opacity: "opacity-30" },
    { top: "55%", left: "7%", size: "text-xl", opacity: "opacity-35" },
    { top: "25%", right: "4%", size: "text-2xl", opacity: "opacity-40" },
    { top: "60%", right: "6%", size: "text-lg", opacity: "opacity-45" },
    { top: "75%", left: "14%", size: "text-base", opacity: "opacity-30" },
    { top: "80%", right: "16%", size: "text-xl", opacity: "opacity-35" },
    { top: "15%", left: "22%", size: "text-sm", opacity: "opacity-30" },
    { top: "18%", right: "24%", size: "text-sm", opacity: "opacity-30" },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {positions.map((p, i) => (
        <span
          key={i}
          className={`absolute text-violet-200 ${p.size} ${p.opacity}`}
          style={{
            top: p.top,
            left: "left" in p ? p.left : undefined,
            right: "right" in p ? p.right : undefined,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
