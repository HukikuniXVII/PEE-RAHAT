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
      "เลือกพี่ติวจาก Tutor Hub กดส่งคำขอจองคลาส รอพี่ติวกดรับภายใน 24 ชั่วโมง แล้วชำระเงินผ่าน PromptPay ระบบจะเก็บเงินไว้ใน Escrow จนกว่าคลาสจะเสร็จ",
  },
  {
    icon: ShieldCheck,
    question: "เงินของฉันปลอดภัยแค่ไหน?",
    answer:
      "ทุกการจ่ายผ่านระบบ Escrow ที่พักเงินไว้ 24 ชั่วโมงหลังเรียนเสร็จ หากมีปัญหาสามารถกด 'Report Issue' บนคลาสนั้นๆ ทีมงานจะระงับการจ่ายและตรวจสอบ",
  },
  {
    icon: Wallet,
    question: "ฉันโอนเงินแล้วแต่สลิปไม่ผ่าน?",
    answer:
      "ระบบใช้ SlipOK ตรวจสลิปอัตโนมัติ หากไม่ผ่านอาจเกิดจากภาพเบลอ หรือยอดไม่ตรง ลองอัปโหลดสลิปใหม่ หากยังไม่สำเร็จติดต่อ support@peerahat.com",
  },
  {
    icon: AlertTriangle,
    question: "ห้ามแลกเปลี่ยนช่องทางติดต่อจริงเหรอ?",
    answer:
      "ใช่ครับ เพื่อให้ระบบ Escrow ป้องกันคุณได้ ระบบจะกรองข้อความที่มี Line, ไอจี, เบอร์โทร และอาจระงับบัญชีที่หลบเลี่ยงระบบ",
  },
] as const;

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-3 text-center">
        <div className="inline-flex w-12 h-12 bg-grape-soft text-violet-500 rounded-xl items-center justify-center mx-auto">
          <HelpCircle size={24} />
        </div>
        <h1 className="text-3xl font-bold text-violet-700 thai">ศูนย์ช่วยเหลือ</h1>
        <p className="text-sm text-neutral-500 thai">
          คำถามที่พบบ่อย — หากไม่เจอคำตอบ ทักทีมงานได้ที่{" "}
          <Link
            href={"/contact" as Route}
            className="text-violet-500 font-semibold hover:underline"
          >
            หน้าติดต่อ
          </Link>
        </p>
      </header>

      <ul className="space-y-4">
        {FAQ.map((item) => (
          <li
            key={item.question}
            className="bg-white p-6 rounded-xl border border-neutral-200 shadow-card flex gap-4"
          >
            <div className="w-10 h-10 bg-grape-soft text-violet-500 rounded-xl flex items-center justify-center shrink-0">
              <item.icon size={18} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-neutral-800 text-base thai">
                {item.question}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed thai">
                {item.answer}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
