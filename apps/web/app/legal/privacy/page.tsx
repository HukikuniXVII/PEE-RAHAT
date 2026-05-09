import { ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 md:p-12 space-y-6">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <ShieldCheck size={12} />
          ฉบับร่าง
        </div>
        <h1 className="text-3xl font-black text-slate-900">
          นโยบายความเป็นส่วนตัว (PDPA)
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          ปรับปรุงล่าสุด: เมษายน 2026
        </p>
      </header>

      <section className="prose prose-slate max-w-none space-y-4 text-sm leading-relaxed text-slate-600">
        <p>
          Pee Rahat ปฏิบัติตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          (PDPA) อย่างเคร่งครัด เราเก็บข้อมูลของผู้ใช้เพียงเท่าที่จำเป็น
          และใช้ตามวัตถุประสงค์ที่ระบุไว้เท่านั้น
        </p>
        <h2 className="text-base font-bold text-slate-800 pt-4">
          ข้อมูลที่เก็บ
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>ชื่อ อีเมล รูปโปรไฟล์ — เพื่อแสดงตัวตนในแพลตฟอร์ม</li>
          <li>
            เอกสาร KYC (บัตรประชาชน, Transcript) — เก็บแบบเข้ารหัส AES-256
            และย้ายไปยัง Cold Storage ภายใน 24 ชั่วโมงหลังตรวจสอบเสร็จ
          </li>
          <li>ประวัติคลาส/บุ๊กกิ้ง — เพื่อจัดการระบบ Escrow และข้อพิพาท</li>
          <li>ข้อความสนทนา — กรองช่องทางติดต่อภายนอกตามข้อกำหนด FR-PM-08</li>
        </ul>
        <h2 className="text-base font-bold text-slate-800 pt-4">สิทธิของคุณ</h2>
        <p>
          คุณสามารถขอเข้าถึง แก้ไข ลบ หรือถอนความยินยอมในข้อมูลของคุณได้ตลอดเวลา
          โดยติดต่อ DPO ของเราที่ <strong>privacy@peerahat.com</strong>
        </p>
        <p className="text-xs text-slate-400 pt-6 border-t border-slate-100">
          เนื้อหาฉบับสมบูรณ์อยู่ระหว่างการตรวจสอบโดย DPO และที่ปรึกษากฎหมาย
        </p>
      </section>
    </article>
  );
}
