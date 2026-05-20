import { Card, PageBackground } from "@peerahat/ui";
import { Mail, MessageSquare, Phone } from "lucide-react";

const CHANNELS = [
  {
    icon: Mail,
    label: "อีเมลทั่วไป",
    value: "hello@peerahat.com",
    href: "mailto:hello@peerahat.com",
  },
  {
    icon: MessageSquare,
    label: "ช่วยเหลือผู้ใช้",
    value: "support@peerahat.com",
    href: "mailto:support@peerahat.com",
  },
  {
    icon: Phone,
    label: "โทรศัพท์",
    value: "02-000-0000",
    href: "tel:+6620000000",
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 thai text-[12px] font-semibold text-dusty-grape border border-dusty-grape/25 rounded-full px-4 py-1.5 bg-white/60 backdrop-blur-sm">
            ติดต่อ
          </div>
          <h1
            className="thai font-bold text-grape-deep"
            style={{
              fontSize: "clamp(32px, 3vw, 44px)",
              letterSpacing: "-0.02em",
            }}
          >
            ติดต่อทีมงาน
          </h1>
          <p className="thai text-[15px] text-ink-soft leading-relaxed max-w-xl mx-auto">
            ทีม Pee Rahat ตอบกลับภายใน 24 ชั่วโมงในเวลาทำการ
            (จ.-ศ. 9:00-18:00)
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-5">
          {CHANNELS.map((c) => (
            <a
              key={c.value}
              href={c.href}
              className="group block"
            >
              <Card
                variant="glass"
                className="p-7 h-full space-y-4 group-hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-xl bg-grape-soft text-violet-500 flex items-center justify-center shadow-[0_8px_18px_-8px_rgba(85,65,139,0.35)] group-hover:bg-violet-500 group-hover:text-white transition-all">
                  <c.icon size={22} />
                </div>
                <div>
                  <p className="thai text-[10px] font-bold uppercase tracking-widest text-ink-mute">
                    {c.label}
                  </p>
                  <p className="font-semibold text-violet-700 mt-1 break-all text-[14px]">
                    {c.value}
                  </p>
                </div>
              </Card>
            </a>
          ))}
        </div>

        <Card variant="frosted" className="p-8 space-y-3">
          <h2 className="thai text-[12px] font-bold uppercase tracking-widest text-dusty-grape">
            สำนักงาน
          </h2>
          <p className="thai text-sm text-ink-soft leading-relaxed">
            Pee Rahat (Thailand) Co., Ltd. <br />
            เลขทะเบียนพาณิชย์ DBD: xxxxxxxxxx <br />
            อาคาร xxx ชั้น xx ถนน xxx แขวง xxx เขต xxx กรุงเทพฯ 10xxx
          </p>
        </Card>
      </div>
    </>
  );
}
