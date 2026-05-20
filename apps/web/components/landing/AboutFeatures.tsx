import { ArrowRight, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

const FEATURES = [
  {
    n: "01",
    href: "/tcas" as Route,
    title: "Diagnostic Quiz",
    thai: "แบบทดสอบหาจุดอ่อน",
    body: "ตอบ 20 ข้อต่อวิชา รู้ทันทีว่าควรซ่อมบทไหนก่อน",
    taupe: false,
  },
  {
    n: "02",
    href: "/tutors" as Route,
    title: "Tutor Match",
    thai: "ระบบจับคู่พี่ติวอัตโนมัติ",
    body: "แนะนำพี่ที่ติดคณะตรงเป้า ในงบที่น้องไหว",
    taupe: true,
  },
  {
    n: "03",
    href: "/sheets" as Route,
    title: "Sheet Market",
    thai: "ตลาดชีทสรุปจากรุ่นพี่ตัวจริง",
    body: "PDF พรีวิวได้ก่อนซื้อ พิมพ์อ่านได้เลยไม่ต้องสรุปเอง",
    taupe: false,
  },
  {
    n: "04",
    href: "/tcas" as Route,
    title: "TCAS Calc",
    thai: "คำนวณคะแนนแบบ What-If",
    body: "บอกชัด ๆ ว่ายังขาดอีกกี่คะแนนต่อวิชา ถึงจะติดเป้า",
    taupe: true,
  },
];

export function AboutFeatures() {
  return (
    <div className="flex-1 flex items-center px-16">
      <div className="w-full max-w-[1400px] mx-auto grid grid-cols-12 gap-14 items-center">

        {/* ── Left: อะไรคือพี่รหัส? ── */}
        <div className="col-span-5 space-y-6">
          {/* Chip */}
          <div className="inline-flex items-center gap-2 thai text-[13px] font-semibold text-dusty-grape border border-dusty-grape/25 rounded-full px-4 py-1.5 bg-white/50 backdrop-blur-sm">
            <Sparkles size={12} />
            อะไรคือพี่รหัส?
          </div>

          <h2
            className="thai font-bold text-grape-deep leading-[1.15]"
            style={{ fontSize: "clamp(28px, 2.6vw, 42px)", letterSpacing: "-0.02em" }}
          >
            พี่ที่{" "}
            <span className="text-dusty-grape">เพิ่งสอบติด</span>
            <br />
            ไม่ใช่ครูในตำรา
          </h2>

          <p className="thai text-[16px] text-ink-soft leading-[1.9] max-w-[420px]">
            พี่รหัสคือพื้นที่ที่น้องจะได้เจอ{" "}
            <span className="font-semibold text-grape-deep">"รุ่นพี่ตัวจริง"</span>{" "}
            ที่กำลังเรียนในคณะที่น้องอยากเข้า ไม่ต้องเสียค่าเทอมโรงเรียนกวด
            เราคัดพี่ที่เพิ่งผ่านสนามสอบมา
          </p>

          {/* Mini stat cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl p-4 bg-white/60 border border-dusty-grape/10 backdrop-blur-sm shadow-card">
              <p className="thai text-[13px] font-bold text-dusty-grape mb-1">
                พี่ติวรุ่นจริง
              </p>
              <p className="thai text-[12px] text-ink-soft leading-relaxed">
                เพิ่งติดคณะที่น้องเล็ง
                <br />
                ผ่าน KYC ทุกคน
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-white/60 border border-[#BBA0A0]/20 backdrop-blur-sm shadow-card">
              <p className="thai text-[13px] font-bold text-[#8E7373] mb-1">
                คุยสบาย ไม่กดดัน
              </p>
              <p className="thai text-[12px] text-ink-soft leading-relaxed">
                อายุใกล้กัน ใช้ภาษาเดียวกัน
                <br />
                ถามซ้ำได้ไม่อาย
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: ฟีเจอร์ ── */}
        <div className="col-span-7">
          {/* Section label */}
          <div className="inline-flex items-center gap-2 thai text-[13px] font-semibold text-dusty-grape border border-dusty-grape/25 rounded-full px-4 py-1.5 bg-white/50 backdrop-blur-sm mb-5">
            <Sparkles size={12} />
            ฟีเจอร์
          </div>

          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map((it) => (
              <Link
                key={it.n}
                href={it.href}
                className="group block rounded-2xl p-6 bg-white/65 border border-white/80 backdrop-blur-sm shadow-card hover:-translate-y-0.5 transition-all hover:shadow-lg hover:bg-white/80"
              >
                <div
                  className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white text-[13px] font-mono font-bold ${
                    it.taupe
                      ? "bg-[#BBA0A0] shadow-[0_6px_16px_-6px_rgba(187,160,160,0.6)]"
                      : "bg-dusty-grape shadow-[0_6px_16px_-6px_rgba(85,65,139,0.5)]"
                  }`}
                >
                  {it.n}
                </div>
                <h3
                  className={`font-bold text-[16px] leading-tight mb-1 ${
                    it.taupe ? "text-[#7a5a5a]" : "text-grape-deep"
                  }`}
                >
                  {it.title}
                </h3>
                <p
                  className={`thai text-[12px] font-semibold mb-2 ${
                    it.taupe ? "text-[#BBA0A0]" : "text-soft-periwinkle"
                  }`}
                >
                  {it.thai}
                </p>
                <p className="thai text-[13px] text-ink-soft leading-relaxed">
                  {it.body}
                </p>
                <div
                  className={`mt-3 flex items-center gap-1 text-[12px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${
                    it.taupe ? "text-[#BBA0A0]" : "text-dusty-grape"
                  }`}
                >
                  ดูเพิ่ม <ArrowRight size={12} strokeWidth={2.5} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
