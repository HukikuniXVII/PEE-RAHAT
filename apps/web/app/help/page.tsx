import { Card, PageBackground } from "@peerahat/ui";
import {
  AlertTriangle,
  GraduationCap,
  HelpCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

const FAQ = [
  {
    icon: GraduationCap,
    question: "ฉันเป็นนักเรียน เริ่มต้นใช้งานยังไง?",
    answer:
      "เลือกพี่รหัสจากหน้าค้นหา กดส่งคำขอจองคลาส รอพี่รหัสกดรับภายใน 24 ชั่วโมง แล้วชำระเงินผ่าน PromptPay เราจะพักเงินไว้ตัวกลางจนกว่าคลาสจะเสร็จ",
  },
  {
    icon: ShieldCheck,
    question: "เงินของฉันปลอดภัยแค่ไหน?",
    answer:
      "ทุกการจ่ายผ่านระบบพักเงินตัวกลางที่เก็บเงินไว้ 24 ชั่วโมงหลังเรียนเสร็จ หากมีปัญหาสามารถกดปุ่ม 'แจ้งปัญหา' บนคลาสนั้นๆ ทีมงานจะระงับการจ่ายและตรวจสอบ",
  },
  {
    icon: Wallet,
    question: "ฉันโอนเงินแล้วแต่สลิปไม่ผ่าน?",
    answer:
      "ระบบตรวจสลิปอัตโนมัติ หากไม่ผ่านอาจเกิดจากภาพเบลอ หรือยอดไม่ตรง ลองอัปโหลดสลิปใหม่ หากยังไม่สำเร็จติดต่อ support@peerahat.com",
  },
  {
    icon: AlertTriangle,
    question: "ห้ามแลกเปลี่ยนช่องทางติดต่อจริงเหรอ?",
    answer:
      "ใช่ครับ เพื่อให้ระบบพักเงินตัวกลางป้องกันคุณได้ ระบบจะกรองข้อความที่มี Line, ไอจี, เบอร์โทร และอาจระงับบัญชีที่หลบเลี่ยงระบบ",
  },
] as const;

export default function HelpPage() {
  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-4 text-center">
          <div className="inline-flex w-14 h-14 bg-violet-500 text-white rounded-2xl items-center justify-center mx-auto shadow-[0_8px_18px_-8px_rgba(85,65,139,0.55)]">
            <HelpCircle size={26} />
          </div>
          <h1
            className="thai font-bold text-grape-deep"
            style={{
              fontSize: "clamp(32px, 3vw, 44px)",
              letterSpacing: "-0.02em",
            }}
          >
            ศูนย์ช่วยเหลือ
          </h1>
          <p className="thai text-[15px] text-ink-soft leading-relaxed max-w-xl mx-auto">
            คำถามที่พบบ่อย — หากไม่เจอคำตอบ ทักทีมงานได้ที่{" "}
            <Link
              href={"/contact" as Route}
              className="text-dusty-grape font-semibold hover:text-accent-700 transition-colors"
            >
              หน้าติดต่อ
            </Link>
          </p>
        </header>

        <ul className="space-y-4">
          {FAQ.map((item) => (
            <li key={item.question}>
              <Card variant="glass" className="p-6 flex gap-4">
                <div className="w-11 h-11 bg-grape-soft text-violet-500 rounded-xl flex items-center justify-center shrink-0 shadow-[0_6px_14px_-6px_rgba(85,65,139,0.35)]">
                  <item.icon size={18} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-grape-deep text-base thai">
                    {item.question}
                  </h3>
                  <p className="text-sm text-ink-soft leading-relaxed thai">
                    {item.answer}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
