import { Mail, MessageSquare, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-4xl font-black text-slate-900">ติดต่อทีมงาน</h1>
        <p className="text-sm text-slate-500">
          ทีม Pee Rahat ตอบกลับภายใน 24 ชั่วโมงในเวลาทำการ (จ.-ศ. 9:00-18:00)
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <a
          href="mailto:hello@peerahat.com"
          className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4 hover:border-indigo-600 transition-all group"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Mail size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              อีเมลทั่วไป
            </p>
            <p className="font-bold text-slate-900 mt-1 break-all">
              hello@peerahat.com
            </p>
          </div>
        </a>

        <a
          href="mailto:support@peerahat.com"
          className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4 hover:border-indigo-600 transition-all group"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              ช่วยเหลือผู้ใช้
            </p>
            <p className="font-bold text-slate-900 mt-1 break-all">
              support@peerahat.com
            </p>
          </div>
        </a>

        <a
          href="tel:+6620000000"
          className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4 hover:border-indigo-600 transition-all group"
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all">
            <Phone size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              โทรศัพท์
            </p>
            <p className="font-bold text-slate-900 mt-1">02-000-0000</p>
          </div>
        </a>
      </div>

      <section className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 space-y-3">
        <h2 className="text-sm font-bold text-slate-800">สำนักงาน</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Pee Rahat (Thailand) Co., Ltd. <br />
          เลขทะเบียนพาณิชย์ DBD: xxxxxxxxxx <br />
          อาคาร xxx ชั้น xx ถนน xxx แขวง xxx เขต xxx กรุงเทพฯ 10xxx
        </p>
      </section>
    </div>
  );
}
