import { FeatureCard } from "@peerahat/ui";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getInitialUser } from "@/lib/auth";

// Palette tokens are defined in packages/config/tailwind/preset.ts.
// Most landing-specific styling lives in app/globals.css under `.landing-*`
// utilities — these reproduce the glassy gradient look from the mockup.

const HERO_CARDS = [
  {
    icon: Search,
    accent: "grape" as const,
    title: "เลือกพี่ที่ใช่",
    body: "กรองตามวิชา คณะ\nมหาวิทยาลัย และงบ",
  },
  {
    icon: CalendarClock,
    accent: "taupe" as const,
    title: "นัดเวลาเรียน",
    body: "ส่งคำขอจองคาบ\nพี่ตอบรับใน 24 ชม.",
  },
  {
    icon: ShieldCheck,
    accent: "grape" as const,
    title: "จ่ายแล้วอุ่นใจ",
    body: "PromptPay + Escrow\nคืนเงินถ้าไม่ได้เรียน",
  },
];

const FEATURES = [
  {
    n: "01",
    href: "/tcas" as Route,
    title: "Diagnostic Quiz",
    thai: "แบบทดสอบหาจุดอ่อน",
    body: "ตอบ 20 ข้อต่อวิชา รู้ทันทีว่าควรซ่อมบทไหนก่อน",
  },
  {
    n: "02",
    href: "/tutors" as Route,
    title: "Tutor Match",
    thai: "ระบบจับคู่พี่ติวอัตโนมัติ",
    body: "แนะนำพี่ที่ติดคณะตรงเป้า ในงบที่น้องไหว",
  },
  {
    n: "03",
    href: "/sheets" as Route,
    title: "Sheet Market",
    thai: "ตลาดชีทสรุปจากรุ่นพี่ตัวจริง",
    body: "PDF พรีวิวได้ก่อนซื้อ พิมพ์อ่านได้เลยไม่ต้องสรุปเอง",
  },
  {
    n: "04",
    href: "/tcas" as Route,
    title: "TCAS Calc",
    thai: "คำนวณคะแนนแบบ What-If",
    body: "บอกชัด ๆ ว่ายังขาดอีกกี่คะแนนต่อวิชา ถึงจะติดเป้า",
  },
];

const HOW_STEPS = [
  {
    n: "01",
    tone: "grape" as const,
    title: "ทำแบบทดสอบสั้น ๆ",
    body: "20 ข้อต่อวิชา 3 นาที — เรามองออกว่าควรเริ่มซ่อมตรงไหน",
  },
  {
    n: "02",
    tone: "taupe" as const,
    title: "เลือกพี่ที่เข้าใจ",
    body: "ระบบเรียงพี่ติวให้ตามจุดอ่อน วิชา และงบของน้อง",
  },
  {
    n: "03",
    tone: "grape" as const,
    title: "นัดคาบและรับลิงก์",
    body: "พี่ยืนยันภายใน 24 ชม. พร้อมลิงก์ Google Meet อัตโนมัติ",
  },
  {
    n: "04",
    tone: "taupe" as const,
    title: "จ่ายผ่าน PromptPay",
    body: "เงินถูก Escrow ไว้ ปล่อยให้พี่เมื่อเรียนจบจริงเท่านั้น",
  },
  {
    n: "05",
    tone: "grape" as const,
    title: "ให้รีวิวหลังเรียน",
    body: "5 ดาวพร้อมคอมเมนต์สั้น ๆ ส่งต่อให้รุ่นน้องคนถัดไป",
  },
];

const TESTIMONIALS = [
  {
    name: "ไอซ์ · ม.6",
    uni: "เป้า: จุฬาฯ บัญชี",
    tone: "grape" as const,
    body:
      "เคยกลัวเลขมาตลอด พอเจอพี่ที่ติดบัญชีปีนี้ คุยกันคนละโทน รู้ตรง ๆ ว่าต้องซ้อมข้อสอบแบบไหน",
  },
  {
    name: "ภพ · ม.6",
    uni: "ติดมหิดล แพทย์",
    tone: "taupe" as const,
    body:
      "ที่ชอบสุดคือไม่ต้องไล่หาเอง ระบบเลือกพี่ให้ตามจุดที่เราอ่อนเลย เซฟเวลาไปอ่านต่อได้อีกเยอะ",
  },
  {
    name: "แทน · ม.5",
    uni: "กำลังเตรียม TCAS68",
    tone: "grape" as const,
    body:
      "PromptPay + Escrow ทำให้กล้าจองคาบแรก เพราะถ้าวันนั้นไม่ว่างจริง ๆ ก็ยกเลิกได้ใน 24 ชม.",
  },
];

export default async function HomePage() {
  const user = await getInitialUser();

  // Logged-in users skip the marketing landing and go straight to Tutor Hub.
  if (user) {
    redirect("/tutors");
  }

  return (
    <div className="landing-page relative min-h-screen w-full overflow-x-hidden">
      <BackgroundBlobs />

      <div className="relative max-w-[1280px] mx-auto px-4 lg:px-8">
        <Nav />
        <Hero />
        <About />
        <FeatureGrid />
        <HowItWorks />
        <Testimonials />
        <BottomCTA />
        <Footer />
      </div>
    </div>
  );
}

// ---------- Sections ----------

function Nav() {
  return (
    <nav className="relative z-10 flex items-center justify-between px-2 lg:px-4 pt-7">
      <Link href="/" className="flex items-center gap-2.5">
        <LogoMark />
        <span
          className="text-[24px] font-bold text-grape-deep tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          PeeRahat
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-9 thai">
        <a href="#about" className="landing-nav-link">
          อะไรคือพี่รหัส?
        </a>
        <a href="#features" className="landing-nav-link">
          ฟีเจอร์
        </a>
        <a href="#how" className="landing-nav-link">
          พี่รหัสทำงานยังไง?
        </a>
      </div>

      <Link href={"/login" as Route} className="landing-nav-pill thai">
        เริ่มต้นใช้งาน
      </Link>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative pt-16 pb-20 px-4">
      <SparkleField />

      <div className="relative max-w-[1080px] mx-auto text-center">
        <div className="landing-chip thai mb-7">
          <Sparkles size={12} className="text-dusty-grape" />
          แพลตฟอร์มจับคู่พี่ติวรุ่นจริงจาก TCAS
        </div>

        <h1
          className="thai text-grape-deep font-bold tracking-tight leading-[1.1]"
          style={{
            fontSize: "clamp(40px, 6.4vw, 78px)",
            letterSpacing: "-0.02em",
          }}
        >
          ติวถูกจุด คุยถูกคอ{" "}
          <span className="whitespace-nowrap">สไตล์พี่รหัส</span>
        </h1>

        <p className="thai mt-7 text-[17px] md:text-[19px] text-ink-soft leading-[1.85] max-w-[640px] mx-auto">
          จะหาพี่ติวเองก็เหนื่อย จะตามโฆษณาก็ไม่มั่นใจ —
          <br />
          ที่นี่เราให้น้องเจอพี่ที่เพิ่งติดคณะเดียวกับที่น้องอยากเข้า
        </p>

        {/* Hero feature trio — uses shared FeatureCard from design system */}
        <div className="grid md:grid-cols-3 gap-5 mt-16 max-w-[920px] mx-auto">
          {HERO_CARDS.map((c) => (
            <FeatureCard
              key={c.title}
              icon={<c.icon size={22} strokeWidth={1.9} />}
              title={<span className="thai">{c.title}</span>}
              description={
                <span className="thai whitespace-pre-line">{c.body}</span>
              }
            />
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-14">
          <Link href={"/login" as Route} className="landing-btn-grape thai">
            เริ่มต้นใช้งาน
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
          <a href="#about" className="landing-btn-soft thai">
            อะไรคือพี่รหัส?
          </a>
        </div>

        {/* Trust row */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[13px] text-ink-mute thai">
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-dusty-grape" /> ผ่าน KYC ทุกคน
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-taupe-deep" /> รีวิวจริงจากรุ่นน้อง
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-dusty-grape" /> ยกเลิกได้ภายใน 24 ชม.
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-taupe-deep" /> Escrow ผ่าน
            ZercleSlip
          </span>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section
      id="about"
      className="relative max-w-[1080px] mx-auto px-4 py-12"
    >
      <div className="landing-section-card p-10 lg:p-14">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <p className="landing-chip landing-chip--taupe thai mb-5">
              <Sparkles size={12} className="text-taupe-deep" />
              อะไรคือพี่รหัส?
            </p>
            <h2
              className="thai text-[34px] lg:text-[42px] font-bold text-grape-deep leading-[1.15]"
              style={{ letterSpacing: "-0.02em" }}
            >
              พี่ที่{" "}
              <span className="text-taupe-deep">เพิ่งสอบติด</span>
              <br />
              ไม่ใช่ครูในตำรา
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-5">
            <p className="thai text-[16px] text-ink-soft leading-[1.9]">
              พี่รหัสคือพื้นที่ที่น้องจะได้เจอ "รุ่นพี่ตัวจริง"
              ที่กำลังเรียนในคณะที่น้องอยากเข้า
              ไม่ต้องเสียค่าเทอมโรงเรียนกวด ไม่ต้องเดาว่าใครเก่งตรงจุด
              เราคัดพี่ที่เพิ่งผ่านสนามสอบมา และจำได้ดีว่าข้อสอบหน้าตาเป็นยังไง
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="landing-hairline rounded-2xl p-4 bg-grape-soft">
                <p className="thai text-[13px] text-grape-deep font-semibold mb-1">
                  พี่ติวรุ่นจริง
                </p>
                <p className="thai text-[12.5px] text-ink-soft leading-relaxed">
                  เพิ่งติดคณะที่น้องเล็ง ผ่าน KYC ทุกคน
                </p>
              </div>
              <div className="landing-hairline rounded-2xl p-4 bg-taupe-soft">
                <p className="thai text-[13px] text-taupe-deep font-semibold mb-1">
                  คุยสบาย ไม่กดดัน
                </p>
                <p className="thai text-[12.5px] text-ink-soft leading-relaxed">
                  อายุใกล้กัน ใช้ภาษาเดียวกัน ถามซ้ำได้ไม่อาย
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section
      id="features"
      className="relative max-w-[1180px] mx-auto px-4 py-12"
    >
      <div className="text-center mb-12">
        <p className="landing-chip landing-chip--taupe thai mb-4">
          <Sparkles size={12} className="text-taupe-deep" />
          ฟีเจอร์
        </p>
        <h2
          className="thai text-[34px] lg:text-[44px] font-bold text-grape-deep leading-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          ทุกอย่างที่ต้องใช้ ในที่เดียว
        </h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURES.map((it, i) => {
          const isTaupe = i % 2 === 1;
          return (
            <Link
              key={it.n}
              href={it.href}
              className="landing-section-card p-7 block transition-transform hover:-translate-y-0.5"
            >
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg text-white ${
                  isTaupe
                    ? "bg-rosy-taupe shadow-[0_8px_18px_-8px_rgba(187,160,160,0.7)]"
                    : "bg-dusty-grape shadow-[0_8px_18px_-8px_rgba(85,65,139,0.55)]"
                }`}
              >
                <span className="font-mono text-[15px] font-semibold">
                  {it.n}
                </span>
              </div>
              <h3
                className={`font-bold text-[18px] leading-tight mb-1 ${
                  isTaupe ? "text-taupe-deep" : "text-grape-deep"
                }`}
              >
                {it.title}
              </h3>
              <p
                className={`thai text-[13px] font-semibold mb-3 ${
                  isTaupe ? "text-taupe-deep" : "text-soft-periwinkle"
                }`}
              >
                {it.thai}
              </p>
              <p className="thai text-[13.5px] text-ink-soft leading-relaxed">
                {it.body}
              </p>
              <div
                className={`mt-5 flex items-center gap-1.5 text-[13px] font-semibold ${
                  isTaupe ? "text-taupe-deep" : "text-dusty-grape"
                }`}
              >
                ดูเพิ่ม <ArrowRight size={14} strokeWidth={2} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="relative max-w-[1180px] mx-auto px-4 py-12">
      <div className="landing-section-card p-10 lg:p-14">
        <div className="text-center mb-12">
          <p className="landing-chip thai mb-4">
            <Sparkles size={12} className="text-dusty-grape" />
            พี่รหัสทำงานยังไง?
          </p>
          <h2
            className="thai text-[34px] lg:text-[44px] font-bold text-grape-deep leading-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            ห้าขั้นตอน จากแบบทดสอบ ถึงห้องสอบ
          </h2>
        </div>
        <div className="grid md:grid-cols-5 gap-0 relative">
          {/* connector line between step circles */}
          <div
            className="hidden md:block absolute top-7 left-[10%] right-[10%] h-0.5"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(125,128,218,0.45) 15%, rgba(187,160,160,0.55) 50%, rgba(125,128,218,0.45) 85%, transparent 100%)",
            }}
            aria-hidden="true"
          />
          {HOW_STEPS.map((s) => {
            const isTaupe = s.tone === "taupe";
            return (
              <div
                key={s.n}
                className="flex flex-col items-center text-center px-3 mb-6 md:mb-0 relative z-10"
              >
                <div
                  className={`mb-5 num flex h-14 w-14 items-center justify-center rounded-full text-[15px] font-bold text-white ${
                    isTaupe
                      ? "bg-rosy-taupe shadow-[0_14px_30px_-10px_rgba(187,160,160,0.7)]"
                      : "bg-dusty-grape shadow-[0_14px_30px_-10px_rgba(85,65,139,0.45)]"
                  }`}
                >
                  {s.n}
                </div>
                <h3
                  className={`thai font-bold text-[16px] mb-2 leading-tight ${
                    isTaupe ? "text-taupe-deep" : "text-grape-deep"
                  }`}
                >
                  {s.title}
                </h3>
                <p className="thai text-[13px] text-ink-soft leading-relaxed max-w-[200px]">
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="relative max-w-[1180px] mx-auto px-4 py-12">
      <div className="grid md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((r) => {
          const isTaupe = r.tone === "taupe";
          return (
            <div
              key={r.name}
              className={`landing-section-card p-7 ${
                isTaupe ? "bg-taupe-soft/70" : ""
              }`}
            >
              <div
                className={`mb-4 flex items-center gap-1 ${
                  isTaupe ? "text-rosy-taupe" : "text-dusty-grape"
                }`}
              >
                {[0, 1, 2, 3, 4].map((j) => (
                  <Star key={j} size={15} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="thai text-[14.5px] text-ink-soft leading-[1.85] mb-6">
                &ldquo;{r.body}&rdquo;
              </p>
              <div className="flex items-center gap-3 border-t border-dashed border-dusty-grape/15 pt-4">
                <div
                  className={`thai flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-bold text-white ${
                    isTaupe ? "bg-rosy-taupe" : "bg-dusty-grape"
                  }`}
                  aria-hidden="true"
                >
                  {r.name.slice(0, 1)}
                </div>
                <div>
                  <p
                    className={`thai text-[13.5px] font-semibold leading-tight ${
                      isTaupe ? "text-taupe-deep" : "text-grape-deep"
                    }`}
                  >
                    {r.name}
                  </p>
                  <p className="thai text-[12px] text-ink-mute mt-0.5">
                    {r.uni}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="relative max-w-[1080px] mx-auto px-4 py-12">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-dusty-grape via-[#6B5A8E] to-taupe-deep p-12 text-white lg:p-16">
        <Sparkles
          className="absolute -top-6 -right-2 text-white opacity-20"
          size={120}
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        <Sparkles
          className="absolute -bottom-6 left-10 text-taupe-soft opacity-25"
          size={80}
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        <Sparkles
          className="absolute top-10 left-1/2 text-taupe-soft opacity-30"
          size={22}
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        <Sparkles
          className="absolute top-1/2 right-1/3 text-white opacity-20"
          size={40}
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />

        <div className="relative grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <h2
              className="thai text-[34px] lg:text-[44px] font-bold leading-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              พร้อมเจอพี่ติว
              <br />
              ที่คุยภาษาเดียวกันรึยัง?
            </h2>
            <p className="thai mt-4 text-[16px] text-white/80">
              สมัครฟรี ไม่มีค่าสมาชิก จ่ายก็ต่อเมื่อจองคาบเรียน
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-3">
            <Link
              href={"/login" as Route}
              className="thai flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-center text-[15px] font-semibold text-grape-deep transition-transform hover:scale-[1.02]"
            >
              เริ่มต้นใช้งานฟรี <ArrowRight size={16} strokeWidth={2} />
            </Link>
            <Link
              href={"/tutors" as Route}
              className="thai rounded-2xl border border-white/30 px-7 py-3 text-center text-[14px] font-medium text-white"
            >
              ดูพี่ติวก่อน
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative max-w-[1180px] mx-auto px-4 pt-8 pb-12">
      <div className="grid md:grid-cols-12 gap-8 mb-10">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5 mb-4">
            <LogoMark />
            <span className="text-[22px] font-bold text-grape-deep tracking-tight">
              PeeRahat
            </span>
          </div>
          <p className="thai text-[13.5px] text-ink-soft leading-relaxed max-w-[40ch]">
            ตามหาพี่ติวที่คุยภาษาเดียวกัน — สำหรับน้อง ม.ปลาย
            ที่กำลังเตรียมเข้ามหา&apos;ลัย
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <span className="landing-chip">DBD Verified</span>
            <span className="landing-chip">PDPA Compliant</span>
            <span className="landing-chip">ETDA Registered</span>
          </div>
        </div>
        <div className="md:col-span-2">
          <p className="thai text-[12px] font-semibold text-grape-deep mb-3 uppercase tracking-wider">
            ผลิตภัณฑ์
          </p>
          <ul className="space-y-2 text-[13.5px] text-ink-soft thai">
            <li>
              <Link
                href={"/tutors" as Route}
                className="hover:text-dusty-grape"
              >
                ติวเตอร์
              </Link>
            </li>
            <li>
              <Link
                href={"/sheets" as Route}
                className="hover:text-dusty-grape"
              >
                ชีทสรุป
              </Link>
            </li>
            <li>
              <Link href={"/tcas" as Route} className="hover:text-dusty-grape">
                TCAS Calc
              </Link>
            </li>
            <li>
              <Link
                href={"/community" as Route}
                className="hover:text-dusty-grape"
              >
                เว็บบอร์ด
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="thai text-[12px] font-semibold text-grape-deep mb-3 uppercase tracking-wider">
            ช่วยเหลือ
          </p>
          <ul className="space-y-2 text-[13.5px] text-ink-soft thai">
            <li>
              <Link href={"/help" as Route} className="hover:text-dusty-grape">
                ศูนย์ช่วยเหลือ
              </Link>
            </li>
            <li>
              <Link
                href={"/contact" as Route}
                className="hover:text-dusty-grape"
              >
                ติดต่อทีม
              </Link>
            </li>
            <li>
              <Link
                href={"/legal/terms" as Route}
                className="hover:text-dusty-grape"
              >
                ข้อกำหนด
              </Link>
            </li>
            <li>
              <Link
                href={"/legal/privacy" as Route}
                className="hover:text-dusty-grape"
              >
                ความเป็นส่วนตัว
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="thai text-[12px] font-semibold text-grape-deep mb-3 uppercase tracking-wider">
            ติดตาม
          </p>
          <ul className="space-y-2 text-[13.5px] text-ink-soft">
            <li>Instagram · @peerahat</li>
            <li>TikTok · @peerahat</li>
            <li>LINE OA · @peerahat</li>
          </ul>
        </div>
      </div>
      <div className="pt-6 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-dusty-grape/15 text-[12px] text-ink-mute">
        <span className="thai">© 2569 PeeRahat Co., Ltd.</span>
        <span className="font-mono">ติวถูกจุด · คุยถูกคอ · v0.3</span>
      </div>
    </footer>
  );
}

// ---------- Decorative ----------

function LogoMark() {
  // Open-book logo with a star, matching .idea/Landing.html.
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12 Q5 10 7 10 L17 10 Q19 10 20 12 L20 33 Q19 31 17 31 L7 31 Q5 31 5 33 Z"
        fill="#7D80DA"
        stroke="#55418B"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M35 12 Q35 10 33 10 L23 10 Q21 10 20 12 L20 33 Q21 31 23 31 L33 31 Q35 31 35 33 Z"
        fill="#9DA0E8"
        stroke="#55418B"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M30 4 L31.4 7.2 L34.6 8.6 L31.4 10 L30 13.2 L28.6 10 L25.4 8.6 L28.6 7.2 Z"
        fill="#F5C24B"
        stroke="#55418B"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleField() {
  const sparkles = [
    { l: "3%", t: "22%", s: 56, o: 0.22, r: 0, c: "#7D80DA" },
    { l: "7%", t: "50%", s: 28, o: 0.28, r: 12, c: "#BBA0A0" },
    { l: "11%", t: "72%", s: 40, o: 0.28, r: -8, c: "#7D80DA" },
    { l: "4%", t: "86%", s: 22, o: 0.32, r: 0, c: "#BBA0A0" },
    { l: "93%", t: "14%", s: 32, o: 0.3, r: 6, c: "#BBA0A0" },
    { l: "88%", t: "36%", s: 48, o: 0.26, r: -10, c: "#7D80DA" },
    { l: "96%", t: "62%", s: 24, o: 0.3, r: 0, c: "#BBA0A0" },
    { l: "85%", t: "82%", s: 56, o: 0.22, r: 8, c: "#7D80DA" },
    { l: "21%", t: "10%", s: 16, o: 0.28, r: 0, c: "#BBA0A0" },
    { l: "77%", t: "8%", s: 18, o: 0.22, r: 0, c: "#7D80DA" },
  ];
  return (
    <div aria-hidden="true">
      {sparkles.map((sp, i) => (
        <div
          key={i}
          className="landing-sparkle"
          style={{
            left: sp.l,
            top: sp.t,
            opacity: sp.o,
            transform: `rotate(${sp.r}deg)`,
          }}
        >
          <Sparkles
            size={sp.s}
            color={sp.c}
            fill={sp.c}
            strokeWidth={0}
          />
        </div>
      ))}
    </div>
  );
}

function BackgroundBlobs() {
  // Large soft radial blobs behind the entire page.
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Background photo — 35% opacity over the .landing-page gradient */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/background.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-[0.35]"
      />
      <div
        className="absolute"
        style={{
          left: "-10%",
          top: "10%",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(closest-side, rgba(187,160,160,0.32), rgba(187,160,160,0))",
        }}
      />
      <div
        className="absolute"
        style={{
          right: "-8%",
          top: "20%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(closest-side, rgba(125,128,218,0.22), rgba(125,128,218,0))",
        }}
      />
      <div
        className="absolute"
        style={{
          left: "30%",
          bottom: "-10%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(closest-side, rgba(187,160,160,0.26), rgba(187,160,160,0))",
        }}
      />
      <div
        className="absolute"
        style={{
          right: "15%",
          bottom: "25%",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background:
            "radial-gradient(closest-side, rgba(187,160,160,0.20), rgba(187,160,160,0))",
        }}
      />
    </div>
  );
}
