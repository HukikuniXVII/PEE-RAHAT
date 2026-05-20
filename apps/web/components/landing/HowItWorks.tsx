import { Sparkles } from "lucide-react";

const STEPS = [
  {
    n: "01",
    taupe: false,
    title: "ทำแบบทดสอบสั้น ๆ",
    body: "20 ข้อต่อวิชา 3 นาที เรามองออกว่าควรเริ่มซ่อมตรงไหน",
  },
  {
    n: "02",
    taupe: true,
    title: "เลือกพี่ที่เข้าใจ",
    body: "ระบบเรียงพี่ติวให้ตามจุดอ่อน วิชา และงบของน้อง",
  },
  {
    n: "03",
    taupe: false,
    title: "นัดคาบและรับลิงก์",
    body: "พี่ยืนยันภายใน 24 ชม. พร้อมลิงก์ Google Meet อัตโนมัติ",
  },
  {
    n: "04",
    taupe: true,
    title: "จ่ายผ่าน PromptPay",
    body: "เงินถูก Escrow ไว้ ปล่อยให้พี่เมื่อเรียนจบจริงเท่านั้น",
  },
  {
    n: "05",
    taupe: false,
    title: "ให้รีวิวหลังเรียน",
    body: "5 ดาวพร้อมคอมเมนต์สั้น ๆ ส่งต่อให้รุ่นน้องคนถัดไป",
  },
];

export function HowItWorks() {
  return (
    <div className="flex-1 flex items-center justify-center px-16">
      <div className="w-full max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 thai text-[13px] font-semibold text-dusty-grape border border-dusty-grape/25 rounded-full px-4 py-1.5 bg-white/50 backdrop-blur-sm mb-5">
            <Sparkles size={12} />
            พี่รหัสทำงานยังไง?
          </div>
          <h2
            className="thai font-bold text-grape-deep leading-tight"
            style={{ fontSize: "clamp(28px, 2.8vw, 44px)", letterSpacing: "-0.02em" }}
          >
            ห้าขั้นตอน จากแบบทดสอบ ถึงห้องสอบ
          </h2>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-5 gap-0">

          {/* Gradient connector line */}
          <div
            className="hidden md:block absolute top-7 left-[10%] right-[10%] h-0.5 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(85,65,139,0.4) 15%, rgba(187,160,160,0.55) 50%, rgba(85,65,139,0.4) 85%, transparent 100%)",
            }}
            aria-hidden="true"
          />

          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex flex-col items-center text-center px-4 relative z-10"
            >
              {/* Step circle */}
              <div
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full text-[15px] font-bold text-white transition-transform hover:scale-105 ${
                  s.taupe
                    ? "bg-[#BBA0A0] shadow-[0_14px_32px_-10px_rgba(187,160,160,0.65)]"
                    : "bg-dusty-grape shadow-[0_14px_32px_-10px_rgba(85,65,139,0.45)]"
                }`}
              >
                {s.n}
              </div>

              {/* Step content */}
              <h3
                className={`thai font-bold text-[16px] mb-2 leading-tight ${
                  s.taupe ? "text-[#8E7373]" : "text-grape-deep"
                }`}
              >
                {s.title}
              </h3>
              <p className="thai text-[13px] text-ink-soft leading-relaxed max-w-[170px]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
