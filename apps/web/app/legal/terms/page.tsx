import { Card, PageBackground } from "@peerahat/ui";
import { ScrollText } from "lucide-react";

export default function TermsPage() {
  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <Card
        variant="frosted"
        className="max-w-3xl mx-auto p-8 md:p-12 space-y-6"
      >
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
            <ScrollText size={12} />
            ฉบับร่าง
          </div>
          <h1
            className="thai font-bold text-grape-deep leading-[1.15]"
            style={{
              fontSize: "clamp(28px, 2.6vw, 38px)",
              letterSpacing: "-0.02em",
            }}
          >
            ข้อกำหนดและเงื่อนไขการใช้งาน
          </h1>
          <p className="text-xs text-ink-mute font-medium thai">
            ปรับปรุงล่าสุด: เมษายน 2026
          </p>
        </header>

        <section className="space-y-4 text-sm leading-relaxed text-ink-soft thai">
          <p>
            การใช้งาน Pee Rahat ("แพลตฟอร์ม") ถือว่าผู้ใช้ยอมรับข้อกำหนดเหล่านี้ทั้งหมด
            กรุณาอ่านโดยละเอียดก่อนสมัครหรือซื้อบริการ
          </p>
          <h2 className="text-base font-bold text-grape-deep pt-4">
            1. การยืนยันตัวตน
          </h2>
          <p>
            ติวเตอร์ทุกคนต้องผ่านการยืนยันตัวตน (KYC) โดยส่งบัตรประชาชน
            เซลฟี่คู่กับบัตร และใบ Transcript ก่อนเปิดบริการ ข้อมูลเหล่านี้
            จะถูกเก็บแบบเข้ารหัสและใช้เพื่อการยืนยันตัวตนเท่านั้น
          </p>
          <h2 className="text-base font-bold text-grape-deep pt-4">
            2. ระบบ Escrow
          </h2>
          <p>
            การชำระเงินทุกรายการจะถูกพักไว้ในบัญชี Escrow ของแพลตฟอร์ม
            และโอนให้พี่รหัส/ผู้ขายเมื่อบริการเสร็จสมบูรณ์โดยไม่มีการรายงานปัญหา
            ภายใน 24 ชั่วโมง
          </p>
          <h2 className="text-base font-bold text-grape-deep pt-4">
            3. การห้ามติดต่อนอกแพลตฟอร์ม
          </h2>
          <p>
            เพื่อรักษาความปลอดภัยของระบบ Escrow ห้ามแลกเปลี่ยนช่องทางติดต่อ
            ภายนอก (เช่น Line, IG, เบอร์โทร) ระบบจะกรองข้อความอัตโนมัติ
            และอาจระงับบัญชีที่พยายามหลบเลี่ยง
          </p>
          <p className="text-xs text-ink-mute pt-6 border-t border-[rgba(85,65,139,0.1)]">
            เนื้อหาฉบับสมบูรณ์อยู่ระหว่างการตรวจสอบโดยที่ปรึกษากฎหมาย
            หากมีคำถามกรุณาติดต่อทีมงานที่{" "}
            <strong className="text-dusty-grape">legal@peerahat.com</strong>
          </p>
        </section>
      </Card>
    </>
  );
}
