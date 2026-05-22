import { Card, PageBackground } from "@peerahat/ui";
import { ScrollText } from "lucide-react";

export const metadata = {
  title: "ข้อกำหนดและเงื่อนไขการใช้งาน",
  description:
    "ข้อกำหนดและเงื่อนไขการใช้งานแพลตฟอร์ม Pee Rahat ครอบคลุมการจับคู่ติวเตอร์รุ่นพี่ ตลาดชีตสรุป ชุมชน เครื่องมือ TCAS และระบบตัวกลางพักเงิน",
};

// Terms of service. Drafted to:
//   - Describe each of the four product pillars (FR-TH-*, FR-SM-*, FR-CM-01,
//     FR-TC-01..04) so users know what they're agreeing to use.
//   - Set expectations on escrow (FR-TH-06), refund split (FR-TH-11),
//     postpone flow (FR-TH-10/12/13), KYC (FR-TH-02), and the
//     external-contact ban (existing platform rule).
//   - Disclose the TCAS calculator's no-warranty positioning so we are
//     not held to admission outcomes.
//   - Reference Thai governing law to support PDPA + consumer-protection
//     framing.
// Phase 1 scope only per CLAUDE.md — no in-platform video, no recurring
// slots, no Plan-B suggestions, no watermarking guarantees, no bounty.
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
            ปรับปรุงล่าสุด: พฤษภาคม 2026
          </p>
        </header>

        <section className="space-y-4 text-sm leading-relaxed text-ink-soft thai">
          <p>
            การใช้งาน Pee Rahat (&ldquo;แพลตฟอร์ม&rdquo;){" "}
            ถือว่าผู้ใช้ยอมรับข้อกำหนดเหล่านี้ทั้งหมด
            กรุณาอ่านโดยละเอียดก่อนสมัครหรือซื้อบริการ
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            1. นิยามและขอบเขตบริการ
          </h2>
          <p>
            Pee Rahat (พี่รหัส) เป็นแพลตฟอร์ม EdTech สำหรับนักเรียนมัธยมปลาย
            ประกอบด้วย 4 บริการหลัก:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>การจับคู่ติวเตอร์ (Tutor Hub)</strong> —
              ค้นหาและจองคลาสกับรุ่นพี่มหาวิทยาลัยที่ผ่านการยืนยันตัวตน
              พร้อมระบบจัดตารางและลิงก์ Google Meet อัตโนมัติ
            </li>
            <li>
              <strong>ตลาดชีตสรุป (Sheet Marketplace)</strong> —
              ซื้อ-ขายเอกสารสรุปบทเรียนที่จัดทำโดยติวเตอร์ที่ผ่านการยืนยันตัวตน
            </li>
            <li>
              <strong>ชุมชน (Community)</strong> — กระดานถาม-ตอบ
              พูดคุยแลกเปลี่ยนความรู้ระหว่างนักเรียนและรุ่นพี่
            </li>
            <li>
              <strong>เครื่องมือคำนวณคะแนน TCAS</strong> — กรอกคะแนน TGAT, TPAT,
              A-Level, NETSAT เพื่อประเมินโอกาสติดในหลักสูตรที่สนใจ
              พร้อมคำแนะนำเชิงวิชาที่ควรเสริม
            </li>
          </ul>
          <p>ทุกบริการดำเนินการผ่าน{" "}
            <strong>ระบบตัวกลางพักเงิน (escrow)</strong>{" "}
            ที่ Pee Rahat เป็นผู้ดูแลเพื่อความปลอดภัยของทั้งผู้ซื้อและผู้ขาย
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            2. การสมัครและคุณสมบัติผู้ใช้
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>ผู้ใช้ต้องสมัครด้วยอีเมลจริงและให้ข้อมูลที่ถูกต้องครบถ้วน</li>
            <li>
              ผู้ใช้ที่อายุต่ำกว่า 20 ปีต้องได้รับความยินยอมจากผู้ปกครองก่อนการสมัคร
              และการชำระเงิน
            </li>
            <li>
              ผู้ใช้แต่ละคนสามารถมีบัญชีได้เพียง 1 บัญชี
              การมีบัญชีซ้ำโดยเจตนาทุจริตจะถูกระงับทันที
            </li>
          </ul>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            3. การยืนยันตัวตนติวเตอร์ (KYC)
          </h2>
          <p>
            ติวเตอร์ทุกคนต้องผ่านการยืนยันตัวตน โดยส่งบัตรประชาชน เซลฟี่คู่กับบัตร
            และใบแสดงผลการเรียนหรือผลสอบ ก่อนเปิดบริการ ข้อมูลเหล่านี้ถูกเก็บแบบ
            เข้ารหัสและใช้เพื่อการยืนยันตัวตนเท่านั้น
            ติวเตอร์ที่ผ่านการตรวจสอบจะได้รับเครื่องหมาย{" "}
            <strong>Verified Badge</strong> บนโปรไฟล์
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            4. ระบบพักเงินตัวกลาง (Escrow)
          </h2>
          <p>
            การชำระเงินทุกรายการในแพลตฟอร์มจะถูกพักไว้กับ Pee Rahat
            และโอนให้ติวเตอร์/ผู้ขายเมื่อบริการเสร็จสมบูรณ์ตามเงื่อนไขดังนี้:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>คลาสติวเตอร์:</strong>{" "}
              ปลดเงินให้ติวเตอร์เมื่อคลาสเสร็จสิ้นและไม่มีการรายงานปัญหาภายใน 24
              ชั่วโมง
            </li>
            <li>
              <strong>การซื้อชีตสรุป:</strong>{" "}
              ปลดเงินให้ผู้ขายเมื่อผู้ซื้อยืนยันการรับไฟล์
            </li>
            <li>
              กรณีมีข้อพิพาท ทีมงานจะเข้าตรวจสอบและตัดสินภายใน 7 วันทำการ
              โดยพิจารณาจากประวัติข้อความและหลักฐานในระบบ
            </li>
          </ul>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            5. การจอง การเลื่อน และการคืนเงิน
          </h2>
          <p>
            ผู้ใช้สามารถขอเลื่อนคลาสที่จองและชำระเงินแล้วได้ ก่อนเวลานัดหมาย
            ระบบจะเปิดห้องเจรจาให้คู่กรณีพูดคุย 2 ชั่วโมง หากเลื่อนสำเร็จ
            เงินยังคงพักไว้กับระบบจนถึงคลาสใหม่ หากเลื่อนไม่สำเร็จ
            การคืนเงินเป็นไปตามนโยบาย:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>นักเรียนขอเลื่อนแบบกระชั้น (น้อยกว่า 24 ชม.)</strong> —
              คืนเงิน 40%, ค่าตอบแทนติวเตอร์ 50%, ค่าธรรมเนียมแพลตฟอร์ม 10%
            </li>
            <li>
              <strong>ติวเตอร์ไม่ตอบหรือเป็นฝ่ายขอเลื่อนแล้วถูกปฏิเสธ</strong>{" "}
              — คืนเงินให้นักเรียน 100%
            </li>
            <li>
              เหตุการณ์ที่ติวเตอร์ผิดนัดจะถูกบันทึกในประวัติคุณภาพและอาจมีผลต่อ
              ลำดับการแสดงในผลค้นหา
            </li>
          </ul>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            6. การห้ามติดต่อนอกแพลตฟอร์ม
          </h2>
          <p>
            เพื่อรักษาความปลอดภัยของระบบพักเงิน{" "}
            <strong>ห้ามแลกเปลี่ยนช่องทางติดต่อภายนอก</strong> (เช่น Line,
            Instagram, เบอร์โทรศัพท์, อีเมลส่วนตัว)
            ระบบจะกรองข้อความที่มีลักษณะดังกล่าวโดยอัตโนมัติ
            บัญชีที่พยายามหลบเลี่ยงอาจถูกระงับการใช้งานและริบเงินในระบบพัก
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            7. ตลาดชีตสรุป
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              ผู้ขายต้องเป็นเจ้าของลิขสิทธิ์ในเนื้อหาที่อัปโหลด
              การละเมิดลิขสิทธิ์จะถูกระงับและรับผิดทางกฎหมาย
            </li>
            <li>
              ผู้ซื้อตกลงที่จะไม่เผยแพร่ ขายต่อ หรือทำสำเนาไฟล์ที่ซื้อมา
              เพื่อแจกจ่ายโดยไม่ได้รับอนุญาตจากเจ้าของผลงาน
            </li>
            <li>
              การคืนเงินสำหรับชีตสรุปจำกัดเฉพาะกรณีที่ไฟล์ไม่ตรงกับคำอธิบาย
              หรือไฟล์เสียหายไม่สามารถเปิดได้
            </li>
          </ul>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            8. การเชื่อมต่อกับ Google Calendar (สำหรับติวเตอร์)
          </h2>
          <p>
            ติวเตอร์สามารถเลือกเชื่อมต่อบัญชี Google เพื่อให้ระบบสร้างลิงก์ Google
            Meet อัตโนมัติเมื่อมีคลาสที่ชำระเงินแล้ว เมื่อเชื่อมต่อแล้ว
            ผู้ใช้ตกลงให้ Pee Rahat สามารถสร้าง แก้ไข
            หรือลบเฉพาะอีเวนต์ที่ระบบสร้างเองในปฏิทินของผู้ใช้
            รายละเอียดเพิ่มเติมอยู่ในนโยบายความเป็นส่วนตัว
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            9. เครื่องมือคำนวณคะแนน TCAS
          </h2>
          <p>
            เครื่องมือนี้เป็นการประมาณการเพื่อวางแผนเท่านั้น
            โดยอ้างอิงสถิติการรับเข้าศึกษาในปีก่อนหน้าจาก mytcas.com
            และข้อมูลสาธารณะอื่น{" "}
            <strong>
              Pee Rahat ไม่รับประกันผลการรับเข้าจริงในปีปัจจุบันหรือปีถัดไป
            </strong>{" "}
            ผู้ใช้ควรตรวจสอบประกาศจากมหาวิทยาลัยและระบบ TCAS อย่างเป็นทางการ
            (https://mytcas.com) ก่อนการสมัครจริง
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            10. ชุมชนและความประพฤติของผู้ใช้
          </h2>
          <p>ในการใช้งานพื้นที่ชุมชน ผู้ใช้ตกลงที่จะ:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ไม่โพสต์เนื้อหาที่ผิดกฎหมาย ลามก หรือล่วงละเมิดบุคคลอื่น</li>
            <li>
              ไม่สแปม โฆษณาบริการนอกแพลตฟอร์ม หรือเชิญชวนไปยังช่องทางอื่น
            </li>
            <li>
              เคารพความเป็นส่วนตัวของผู้อื่น
              ไม่เผยแพร่ข้อมูลส่วนบุคคลโดยไม่ได้รับอนุญาต
            </li>
            <li>
              ไม่ใช้บอตหรือสคริปต์อัตโนมัติเพื่อโพสต์ คอมเมนต์
              หรือสกัดเนื้อหาจากระบบ
            </li>
          </ul>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            11. ทรัพย์สินทางปัญญา
          </h2>
          <p>
            ชื่อ Pee Rahat, โลโก้, การออกแบบเว็บไซต์, และซอร์สโค้ดที่เกี่ยวข้อง
            เป็นทรัพย์สินของ Pee Rahat
            เนื้อหาที่ผู้ใช้สร้างขึ้น (เช่น โพสต์ในชุมชน, ชีตสรุป)
            เป็นของผู้สร้าง โดยให้สิทธิ์ Pee Rahat ในการแสดงและจัดเก็บ
            เพื่อการให้บริการเท่านั้น
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            12. การยกเลิกบัญชี
          </h2>
          <p>
            ผู้ใช้สามารถยกเลิกบัญชีได้ตลอดเวลาผ่านหน้าตั้งค่า
            เงินที่อยู่ในระบบพักจะถูกดำเนินการตามนโยบายคืนเงิน
            ข้อมูลส่วนบุคคลจะถูกลบหรือเก็บตามที่ระบุในนโยบายความเป็นส่วนตัว
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            13. การเปลี่ยนแปลงข้อกำหนด
          </h2>
          <p>
            Pee Rahat อาจปรับปรุงข้อกำหนดเหล่านี้เป็นครั้งคราว
            การเปลี่ยนแปลงสำคัญจะแจ้งให้ผู้ใช้ทราบล่วงหน้าผ่านอีเมลหรือประกาศ
            ในแพลตฟอร์มอย่างน้อย 14 วันก่อนมีผลบังคับใช้
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            14. กฎหมายที่ใช้บังคับและการระงับข้อพิพาท
          </h2>
          <p>
            ข้อกำหนดนี้อยู่ภายใต้กฎหมายแห่งราชอาณาจักรไทย
            ข้อพิพาทใดๆ ที่ไม่สามารถระงับด้วยการเจรจาภายใน 30 วัน
            จะนำเข้าสู่การพิจารณาของศาลในประเทศไทย
          </p>

          <p className="text-xs text-ink-mute pt-6 border-t border-[rgba(85,65,139,0.1)]">
            เนื้อหาฉบับสมบูรณ์อยู่ระหว่างการตรวจสอบโดยที่ปรึกษากฎหมาย
            หากมีคำถาม กรุณาติดต่อทีมงานที่{" "}
            <strong className="text-dusty-grape">legal@peerahat.com</strong>{" "}
            หรือทีมงานทั่วไปที่{" "}
            <strong className="text-dusty-grape">support@peerahat.com</strong>
          </p>
        </section>
      </Card>
    </>
  );
}
