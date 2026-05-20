import { Mail, MessageSquare, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-violet-700 thai">ติดต่อทีมงาน</h1>
        <p className="text-sm text-neutral-500 thai">
          ทีม Pee Rahat ตอบกลับภายใน 24 ชั่วโมงในเวลาทำการ (จ.-ศ. 9:00-18:00)
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-5">
        <a
          href="mailto:hello@peerahat.com"
          className="bg-white p-8 rounded-xl border border-neutral-200 shadow-card space-y-4 hover:border-violet-300 hover:shadow-lg transition-all group"
        >
          <div className="w-12 h-12 bg-grape-soft text-violet-500 rounded-xl flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-all">
            <Mail size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 thai">
              อีเมลทั่วไป
            </p>
            <p className="font-semibold text-neutral-800 mt-1 break-all text-sm">
              hello@peerahat.com
            </p>
          </div>
        </a>

        <a
          href="mailto:support@peerahat.com"
          className="bg-white p-8 rounded-xl border border-neutral-200 shadow-card space-y-4 hover:border-violet-300 hover:shadow-lg transition-all group"
        >
          <div className="w-12 h-12 bg-grape-soft text-violet-500 rounded-xl flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-all">
            <MessageSquare size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 thai">
              ช่วยเหลือผู้ใช้
            </p>
            <p className="font-semibold text-neutral-800 mt-1 break-all text-sm">
              support@peerahat.com
            </p>
          </div>
        </a>

        <a
          href="tel:+6620000000"
          className="bg-white p-8 rounded-xl border border-neutral-200 shadow-card space-y-4 hover:border-violet-300 hover:shadow-lg transition-all group"
        >
          <div className="w-12 h-12 bg-grape-soft text-violet-500 rounded-xl flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-all">
            <Phone size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 thai">
              โทรศัพท์
            </p>
            <p className="font-semibold text-neutral-800 mt-1 text-sm">02-000-0000</p>
          </div>
        </a>
      </div>

      <section className="bg-neutral-50 p-8 rounded-xl border border-neutral-100 space-y-3">
        <h2 className="text-sm font-bold text-neutral-700 thai">สำนักงาน</h2>
        <p className="text-sm text-neutral-500 leading-relaxed thai">
          Pee Rahat (Thailand) Co., Ltd. <br />
          เลขทะเบียนพาณิชย์ DBD: xxxxxxxxxx <br />
          อาคาร xxx ชั้น xx ถนน xxx แขวง xxx เขต xxx กรุงเทพฯ 10xxx
        </p>
      </section>
    </div>
  );
}
