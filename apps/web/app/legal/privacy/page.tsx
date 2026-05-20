import { Card, PageBackground } from "@peerahat/ui";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <Card
        variant="frosted"
        className="max-w-3xl mx-auto p-8 md:p-12 space-y-6"
      >
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
            <ShieldCheck size={12} />
            ฉบับร่าง
          </div>
          <h1
            className="thai font-bold text-grape-deep leading-[1.15]"
            style={{
              fontSize: "clamp(28px, 2.6vw, 38px)",
              letterSpacing: "-0.02em",
            }}
          >
            นโยบายความเป็นส่วนตัว (PDPA)
          </h1>
          <p className="text-xs text-ink-mute font-medium thai">
            ปรับปรุงล่าสุด: เมษายน 2026
          </p>
        </header>

        <section className="space-y-4 text-sm leading-relaxed text-ink-soft thai">
          <p>
            Pee Rahat ปฏิบัติตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
            (PDPA) อย่างเคร่งครัด เราเก็บข้อมูลของผู้ใช้เพียงเท่าที่จำเป็น
            และใช้ตามวัตถุประสงค์ที่ระบุไว้เท่านั้น
          </p>
          <h2 className="text-base font-bold text-grape-deep pt-4">
            ข้อมูลที่เก็บ
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>ชื่อ อีเมล รูปโปรไฟล์ — เพื่อแสดงตัวตนในแพลตฟอร์ม</li>
            <li>
              เอกสารยืนยันตัวตน (บัตรประชาชน, ใบแสดงผลการเรียน) — เก็บแบบเข้ารหัส
              และย้ายไปเก็บถาวรภายใน 24 ชั่วโมงหลังตรวจสอบเสร็จ
            </li>
            <li>ประวัติคลาสและการจอง — เพื่อจัดการการพักเงินและข้อพิพาท</li>
            <li>
              ข้อความสนทนา — กรองช่องทางติดต่อภายนอกอัตโนมัติเพื่อความปลอดภัยของระบบพักเงิน
            </li>
          </ul>
          <h2 className="text-base font-bold text-grape-deep pt-4">
            สิทธิของคุณ
          </h2>
          <p>
            คุณสามารถขอเข้าถึง แก้ไข ลบ หรือถอนความยินยอมในข้อมูลของคุณได้ตลอดเวลา
            โดยติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลของเราที่{" "}
            <strong className="text-dusty-grape">privacy@peerahat.com</strong>
          </p>
          <p className="text-xs text-ink-mute pt-6 border-t border-[rgba(85,65,139,0.1)]">
            เนื้อหาฉบับสมบูรณ์อยู่ระหว่างการตรวจสอบโดยเจ้าหน้าที่และที่ปรึกษากฎหมาย
          </p>
        </section>
      </Card>
    </>
  );
}
