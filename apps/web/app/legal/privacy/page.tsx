 import { Card, PageBackground } from "@peerahat/ui";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "นโยบายความเป็นส่วนตัว",
  description:
    "นโยบายความเป็นส่วนตัวของแพลตฟอร์ม Pee Rahat ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ครอบคลุมการจับคู่ติวเตอร์ ตลาดชีตสรุป ชุมชน และเครื่องมือ TCAS",
};

// Privacy policy. Drafted to satisfy:
//   - Thai PDPA 2562 (data categories, rights, retention, DPO contact)
//   - Google OAuth verification (per-scope justification for FR-TH-17
//     Calendar integration; Limited Use compliance statement)
//   - Disclosure of all data Pee Rahat actually collects across the four
//     product pillars (Tutor Hub, Sheet Marketplace, Community, TCAS Calc)
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
            ปรับปรุงล่าสุด: พฤษภาคม 2026
          </p>
        </header>

        <section className="space-y-4 text-sm leading-relaxed text-ink-soft thai">
          <p>
            Pee Rahat (พี่รหัส) เป็นแพลตฟอร์ม EdTech สำหรับนักเรียนมัธยมปลาย
            ครอบคลุม 4 บริการ ได้แก่ การจับคู่ติวเตอร์รุ่นพี่มหาวิทยาลัย
            ตลาดชีตสรุป ชุมชนพูดคุย และเครื่องมือคำนวณคะแนน TCAS
            พร้อมระบบตัวกลางพักเงินที่ปลอดภัย เราปฏิบัติตามพระราชบัญญัติคุ้มครอง
            ข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) อย่างเคร่งครัด เก็บข้อมูลเท่าที่จำเป็น
            และใช้ตามวัตถุประสงค์ที่ระบุไว้เท่านั้น
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            1. ข้อมูลที่เก็บและวัตถุประสงค์
          </h2>

          <h3 className="text-sm font-bold text-grape-deep pt-2">
            บัญชีและโปรไฟล์
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>ชื่อ-นามสกุล, อีเมล, รูปโปรไฟล์ — เพื่อแสดงตัวตนในแพลตฟอร์ม</li>
            <li>เบอร์โทรศัพท์ (ทางเลือก) — สำหรับการแจ้งเตือนสำคัญ</li>
            <li>
              ระดับชั้น / มหาวิทยาลัย / สาขาวิชา —
              เพื่อการจับคู่ที่ตรงกับความต้องการ
            </li>
          </ul>

          <h3 className="text-sm font-bold text-grape-deep pt-2">
            การยืนยันตัวตนติวเตอร์ (KYC)
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              ภาพถ่ายบัตรประชาชน, เซลฟี่คู่กับบัตร, ใบแสดงผลการเรียน หรือผลสอบ
            </li>
            <li>
              เก็บแบบเข้ารหัส AES-256-GCM และย้ายเข้าระบบเก็บถาวรภายใน 24 ชั่วโมง
              หลังตรวจสอบเสร็จ
            </li>
            <li>
              ใช้สำหรับตรวจสอบสถานะนักศึกษาและออก Verified Badge เท่านั้น
              ไม่นำไปใช้ในวัตถุประสงค์อื่น
            </li>
          </ul>

          <h3 className="text-sm font-bold text-grape-deep pt-2">
            การจองและการชำระเงิน
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>ประวัติการจอง, สถานะการชำระเงิน, ยอดเงินในระบบตัวกลาง</li>
            <li>
              หมายเลข PromptPay หรือบัญชีธนาคาร —
              เพื่อการโอนเงินคืนและการจ่ายให้ติวเตอร์
            </li>
            <li>
              ใช้สำหรับจัดการระบบพักเงิน การคืนเงิน
              และการระงับข้อพิพาทระหว่างผู้ใช้
            </li>
          </ul>

          <h3 className="text-sm font-bold text-grape-deep pt-2">
            ข้อความและการสื่อสาร
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              ข้อความสนทนาระหว่างนักเรียนและติวเตอร์ —
              เก็บไว้เป็นหลักฐานเมื่อเกิดข้อพิพาท
            </li>
            <li>
              ระบบกรองช่องทางติดต่อภายนอก (Line, Instagram, เบอร์โทร) โดยอัตโนมัติ
              เพื่อปกป้องความปลอดภัยของระบบตัวกลาง
            </li>
          </ul>

          <h3 className="text-sm font-bold text-grape-deep pt-2">
            ข้อมูลจาก Google (เฉพาะติวเตอร์ที่เชื่อมต่อบัญชี Google Calendar)
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              ติวเตอร์สามารถเลือกเชื่อมต่อบัญชี Google ส่วนตัวของตน เพื่อให้ระบบ
              สร้างลิงก์ Google Meet อัตโนมัติเมื่อมีคลาสที่ยืนยันการชำระเงินแล้ว
            </li>
            <li>
              <strong>ขอบเขต OAuth ที่ขอ (3 รายการ):</strong>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  <code className="text-xs">
                    https://www.googleapis.com/auth/calendar.events
                  </code>{" "}
                  — สร้างอีเวนต์เดียวต่อคลาสที่ชำระเงินแล้ว ในปฏิทินหลัก (primary)
                  ของติวเตอร์ พร้อมแนบลิงก์ Google Meet
                  ใช้สำหรับการลบอีเวนต์เมื่อมีการเลื่อนหรือยกเลิกคลาส
                </li>
                <li>
                  <code className="text-xs">
                    https://www.googleapis.com/auth/userinfo.email
                  </code>{" "}
                  — อ่านอีเมล Google ของติวเตอร์ <em>ครั้งเดียว</em>
                  ขณะเชื่อมต่อบัญชี เพื่อแสดง &ldquo;เชื่อมต่อในชื่อ
                  &lt;email&gt;&rdquo; ในหน้าตั้งค่า ช่วยให้ติวเตอร์ที่มีหลายบัญชี
                  Google รู้ว่าเชื่อมต่อบัญชีไหน
                </li>
                <li>
                  <code className="text-xs">openid</code>{" "}
                  — จำเป็นโดย Google เป็น scope คู่ของ <code className="text-xs">userinfo.email</code>
                </li>
              </ul>
            </li>
            <li>
              <strong>สิ่งที่เรา&nbsp;ไม่&nbsp;เข้าถึง:</strong>{" "}
              เราไม่อ่าน ไม่แสดงรายการ ไม่แก้ไข
              และไม่ลบอีเวนต์อื่นในปฏิทินของผู้ใช้
              ไม่เข้าถึง Gmail, Drive, Contacts, รูปโปรไฟล์, ชื่อ-นามสกุล
              จากบัญชี Google หรือข้อมูลอื่นใดนอกเหนือจากอีเมล
            </li>
            <li>
              <strong>การจัดเก็บ:</strong> Refresh Token เข้ารหัสด้วย AES-256-GCM
              เก็บไว้บนโปรไฟล์ติวเตอร์เพื่อใช้ต่ออายุการเข้าถึงเท่านั้น
              อีเมล Google จัดเก็บเป็นข้อความปกติเพื่อแสดงสถานะการเชื่อมต่อ
            </li>
            <li>
              <strong>การเพิกถอน:</strong> ผู้ใช้สามารถยกเลิกการเชื่อมต่อได้ตลอดเวลา
              ผ่านหน้าโปรไฟล์ (/tutors/me/edit) หรือผ่าน{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-dusty-grape underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                myaccount.google.com/permissions
              </a>{" "}
              ระบบจะลบ Refresh Token ทันทีและไม่สามารถสร้างอีเวนต์ใหม่ได้
            </li>
            <li>
              <strong>Google API Services User Data Policy:</strong>{" "}
              การใช้ข้อมูลที่ได้รับจาก Google API ของ Pee Rahat เป็นไปตามนโยบายของ
              Google รวมถึงข้อกำหนด Limited Use Requirements (ไม่นำข้อมูลไป
              วิเคราะห์เชิงโฆษณา ไม่ถ่ายโอนให้บุคคลที่สามเพื่อวัตถุประสงค์อื่น
              ไม่ใช้ในการฝึกหรือสร้างโมเดลปัญญาประดิษฐ์
              และไม่อนุญาตให้มนุษย์อ่านข้อมูลของผู้ใช้
              ยกเว้นเมื่อได้รับความยินยอมจากผู้ใช้โดยตรง
              เพื่อความปลอดภัย เพื่อปฏิบัติตามกฎหมาย
              หรือเพื่อการดำเนินงานภายในที่เป็นไปตามมาตรฐาน)
            </li>
            <li className="list-none pt-2">
              <div className="bg-grape-soft/30 rounded-lg p-3 text-xs leading-relaxed font-mono not-italic">
                <strong className="not-italic font-sans">
                  Limited Use Disclosure (English, verbatim per Google
                  requirement):
                </strong>
                <p className="mt-2">
                  Pee Rahat&apos;s use and transfer to any other app of
                  information received from Google APIs will adhere to{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    className="text-dusty-grape underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements. Specifically, Pee
                  Rahat does not use Google user data to develop, improve, or
                  train generalized or non-personalized AI and/or machine
                  learning models. Google user data is not transferred to third
                  parties for serving ads, and is not read by humans except (a)
                  with the user&apos;s explicit consent, (b) for security
                  purposes, (c) to comply with applicable law, or (d) as part of
                  Pee Rahat&apos;s internal operations where the data has been
                  aggregated and anonymized.
                </p>
              </div>
            </li>
          </ul>

          <h3 className="text-sm font-bold text-grape-deep pt-2">
            เครื่องมือคำนวณคะแนน TCAS
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              คะแนน TGAT, TPAT, A-Level, GPAX ที่ผู้ใช้กรอกเอง —
              เก็บในเซสชันการใช้งานเท่านั้น ไม่บันทึกในฐานข้อมูล
            </li>
            <li>
              การเลือกหลักสูตร/มหาวิทยาลัยเป้าหมาย —
              ใช้สำหรับสถิติการใช้งานเชิงรวมเพื่อปรับปรุงบริการ
            </li>
          </ul>

          <h3 className="text-sm font-bold text-grape-deep pt-2">
            คุกกี้และข้อมูลการใช้งาน
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              คุกกี้สำหรับการล็อกอินและรักษาสถานะเซสชัน —
              จำเป็นต่อการใช้งานแพลตฟอร์ม
            </li>
            <li>
              ข้อมูลการใช้งานเชิงสถิติ (เช่น หน้าที่เข้าชม, อุปกรณ์, IP address)
              — ใช้เพื่อปรับปรุงประสบการณ์ผู้ใช้และตรวจจับการใช้งานผิดปกติ
            </li>
          </ul>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            2. การแบ่งปันข้อมูลกับบุคคลที่สาม
          </h2>
          <p>
            <strong>เราไม่ขายข้อมูลส่วนบุคคลของผู้ใช้</strong>{" "}
            การแบ่งปันข้อมูลกับบุคคลที่สามเป็นไปเพื่อความจำเป็นต่อการให้บริการเท่านั้น
            ได้แก่:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Google LLC</strong> — สำหรับสร้างอีเวนต์ Google Calendar
              และลิงก์ Google Meet (เฉพาะเมื่อติวเตอร์เชื่อมต่อบัญชี
              และมีการจองที่ชำระเงินแล้วเท่านั้น)
            </li>
            <li>
              <strong>ผู้ให้บริการชำระเงิน (PromptPay / ธนาคาร)</strong>{" "}
              — เพื่อดำเนินธุรกรรมการพักเงิน คืนเงิน และจ่ายให้ติวเตอร์/ผู้ขาย
            </li>
            <li>
              <strong>ผู้ให้บริการอีเมลและการแจ้งเตือน</strong> —
              สำหรับส่งการแจ้งเตือนสำคัญ เช่น การยืนยันการจอง การชำระเงิน
              และการแจ้งเตือนคลาส
            </li>
            <li>
              <strong>ผู้ให้บริการโครงสร้างพื้นฐาน (Cloud Hosting)</strong> —
              สำหรับจัดเก็บข้อมูลและให้บริการเว็บไซต์ ผูกพันด้วย Data Processing
              Agreement
            </li>
            <li>
              <strong>หน่วยงานราชการ</strong> —
              เฉพาะเมื่อมีหมายศาลหรือคำร้องตามกฎหมายเท่านั้น
            </li>
          </ul>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            3. ระยะเวลาการเก็บข้อมูล
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>ข้อมูลบัญชีและโปรไฟล์ — ตลอดอายุการใช้งาน + 90 วันหลังการยกเลิก</li>
            <li>
              เอกสาร KYC — 5 ปีหลังการยกเลิกบัญชี
              (ตามข้อกำหนดทางบัญชีและกฎหมายไทย)
            </li>
            <li>
              ประวัติการจองและการชำระเงิน — 7 ปี (ตามข้อกำหนดของกรมสรรพากร)
            </li>
            <li>ข้อความสนทนา — 2 ปีหลังการสิ้นสุดความสัมพันธ์การจอง</li>
            <li>
              Google OAuth Refresh Token —
              จนกว่าผู้ใช้จะยกเลิกการเชื่อมต่อหรือยกเลิกบัญชี
            </li>
            <li>ข้อมูลคุกกี้และการใช้งาน — สูงสุด 12 เดือน</li>
          </ul>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            4. สิทธิของคุณตาม PDPA
          </h2>
          <p>คุณมีสิทธิดังต่อไปนี้:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>สิทธิเข้าถึง</strong> — ขอดูข้อมูลส่วนบุคคลที่เราเก็บ
            </li>
            <li>
              <strong>สิทธิแก้ไข</strong> — ขอให้แก้ไขข้อมูลที่ไม่ถูกต้อง
            </li>
            <li>
              <strong>สิทธิลบ</strong> — ขอให้ลบข้อมูล
              (ภายใต้ข้อจำกัดทางกฎหมายและบัญชี)
            </li>
            <li>
              <strong>สิทธิระงับ / คัดค้านการประมวลผล</strong>{" "}
              — สำหรับการใช้ข้อมูลเชิงสถิติ
            </li>
            <li>
              <strong>สิทธิโอนย้ายข้อมูล</strong> —
              รับข้อมูลในรูปแบบที่อ่านได้ด้วยเครื่อง
            </li>
            <li>
              <strong>สิทธิถอนความยินยอม</strong> —
              ตลอดเวลาผ่านหน้าตั้งค่าบัญชีหรืออีเมล
            </li>
          </ul>
          <p>
            หากต้องการใช้สิทธิข้างต้น
            กรุณาติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) ที่{" "}
            <strong className="text-dusty-grape">privacy@peerahat.com</strong>{" "}
            เราจะดำเนินการภายใน 30 วันนับจากวันที่ได้รับคำร้อง
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            5. ข้อมูลของผู้เยาว์
          </h2>
          <p>
            กลุ่มผู้ใช้หลักของ Pee Rahat คือนักเรียนมัธยมปลาย ซึ่งอาจมีอายุต่ำกว่า
            20 ปี ผู้ใช้ที่อายุต่ำกว่า 20 ปีต้องได้รับความยินยอมจากผู้ปกครอง
            ก่อนการสมัครและการชำระเงิน เราไม่เก็บข้อมูลอ่อนไหวเกินความจำเป็น
            และไม่ใช้ข้อมูลของผู้เยาว์เพื่อการตลาดเชิงพฤติกรรม (behavioral
            advertising)
          </p>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            6. การรักษาความปลอดภัย
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>ข้อมูลทั้งหมดเข้ารหัสระหว่างการรับส่ง (TLS 1.2+)</li>
            <li>
              เอกสาร KYC และ Refresh Token ของ Google เข้ารหัสด้วย AES-256-GCM
              ขณะจัดเก็บ
            </li>
            <li>
              สิทธิ์การเข้าถึงข้อมูลแบบจำกัด (least-privilege)
              และบันทึก audit log ทุกการเข้าถึง
            </li>
            <li>
              ตรวจสอบและทบทวนระบบรักษาความปลอดภัยอย่างน้อยปีละ 1 ครั้ง
            </li>
          </ul>

          <h2 className="text-base font-bold text-grape-deep pt-4">
            7. การติดต่อ
          </h2>
          <p>
            เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO):{" "}
            <strong className="text-dusty-grape">privacy@peerahat.com</strong>
            <br />
            ทีมงานทั่วไป:{" "}
            <strong className="text-dusty-grape">support@peerahat.com</strong>
          </p>

          <p className="text-xs text-ink-mute pt-6 border-t border-[rgba(85,65,139,0.1)]">
            เนื้อหาฉบับสมบูรณ์อยู่ระหว่างการตรวจสอบโดยเจ้าหน้าที่และที่ปรึกษากฎหมาย
            หากมีข้อสงสัย กรุณาติดต่อทีมงานก่อนการสมัครหรือซื้อบริการ
          </p>
        </section>
      </Card>
    </>
  );
}
