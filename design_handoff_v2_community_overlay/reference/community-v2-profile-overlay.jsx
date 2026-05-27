// ============================================================
// Profile Overlay (State on V2)
// Renders V2 with a centered modal mini-profile on top.
// Two variants: 'student' (lightweight stats) and 'tutor' (rich
// profile with reviews, hours taught, rate, subjects, CTAs).
// ============================================================

function CommunityV2WithStudentOverlay() {
  // Pick น้อง Pim as the student being viewed
  const subject = POSTS.find(p => p.author.name === 'น้อง Pim').author;
  return (
    <div style={{position:'relative', width:'100%', height:'100%'}}>
      <CommunityV2FB/>
      <ProfileOverlay mode="student" subject={subject}/>
    </div>
  );
}

function CommunityV2WithTutorOverlay() {
  // Pick พี่กิ๊ฟ as the tutor being viewed
  const subject = POSTS.find(p => p.author.name === 'พี่กิ๊ฟ').author;
  return (
    <div style={{position:'relative', width:'100%', height:'100%'}}>
      <CommunityV2FB/>
      <ProfileOverlay mode="tutor" subject={subject}/>
    </div>
  );
}

// ----- THE OVERLAY -----
function ProfileOverlay({ mode, subject }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center cs-pop" style={{padding: 24}}>
      {/* Backdrop */}
      <div className="absolute inset-0" style={{background:'rgba(42,34,64,0.42)', backdropFilter:'blur(6px)'}}></div>

      {/* Card */}
      <div className="relative cs-card overflow-hidden" style={{width: mode === 'tutor' ? 520 : 440, maxHeight:'90%', display:'flex', flexDirection:'column'}}>
        {/* Header band */}
        <div className="relative" style={{
          background: mode === 'tutor'
            ? `linear-gradient(135deg, ${CS.violet500} 0%, ${CS.taupe} 130%)`
            : `linear-gradient(135deg, ${CS.taupe} 0%, ${CS.violet500} 130%)`,
          padding: '20px 22px 60px',
          color:'#fff'
        }}>
          <button className="absolute w-8 h-8 rounded-full flex items-center justify-center transition" style={{
            top: 12, right: 12, background:'rgba(255,255,255,0.20)', color:'#fff'
          }}>×</button>
          <div className="absolute pointer-events-none" style={{top: 10, right: 60, opacity: 0.18}}><CIco.Sparkle size={32}/></div>
        </div>

        {/* Avatar + identity (overlapping the gradient) */}
        <div className="px-6" style={{marginTop: -42}}>
          <div className="flex items-end gap-3">
            <div style={{borderRadius: 999, border:'4px solid #fff', display:'inline-block'}}>
              <Avatar name={subject.name} size={76} badge={subject.verified}/>
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <p className="thai text-[18px] font-bold inline-flex items-center gap-1.5 leading-tight" style={{color: CS.ink, letterSpacing:'-0.01em'}}>
                {subject.name}
                {subject.verified && <CIco.Verified size={15} style={{color: CS.violet500}}/>}
              </p>
              <p className="thai text-[12px]" style={{color: CS.inkSoft}}>
                {subject.handle} <span style={{color: CS.inkMute}}>·</span> {mode === 'tutor' ? 'มหิดล คณะแพทย์ ปี 4' : 'ม.6 · เป้า: แพทย์ มข.'}
              </p>
            </div>
          </div>
        </div>

        {/* Body — varies by mode */}
        <div className="px-6 pt-4 pb-6 overflow-y-auto" style={{flex: 1}}>
          {mode === 'tutor' ? <TutorBody subject={subject}/> : <StudentBody subject={subject}/>}
        </div>
      </div>
    </div>
  );
}

// ----- STUDENT VARIANT (lightweight) -----
function StudentBody({ subject }) {
  return (
    <>
      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniStat label="โพสต์"      value="24"/>
        <MiniStat label="ความเห็น"   value="12"/>
        <MiniStat label="ที่บันทึก"  value="8"/>
      </div>

      <Section label="เป้าหมาย">
        <div className="flex items-center gap-3 rounded-xl p-3" style={{background: CS.grapeSoft}}>
          <span className="text-[22px]">🩺</span>
          <div className="flex-1">
            <p className="thai text-[13px] font-bold" style={{color: CS.grapeDeep}}>แพทยศาสตร์ · มหาวิทยาลัยขอนแก่น</p>
            <p className="thai text-[11px] mt-0.5" style={{color: CS.inkSoft}}>เริ่มเตรียมตัวเมื่อ 6 เดือนก่อน · TPAT1 ~45 คะแนน</p>
          </div>
        </div>
      </Section>

      <Section label="วิชาที่สนใจ">
        <div className="flex flex-wrap gap-1.5">
          {['TPAT1','Biology','Chemistry','A-Level เคมี','Math'].map(s => (
            <span key={s} className="thai text-[11.5px] font-semibold px-2.5 py-1 rounded-full" style={{background:'#FAFAFB', color: CS.ink, border:'1px solid rgba(85,65,139,0.10)'}}>{s}</span>
          ))}
        </div>
      </Section>

      <Section label="โพสต์ล่าสุด">
        <div className="space-y-2">
          {[
            { tag:'#ถามพี่หมอ', body:'อยากเริ่มเตรียมแพทย์ม.6 ทันมั้ยคะ', when:'5 ชม.' },
            { tag:'#ขายชีท',    body:'แชร์ชีท Chemistry ที่ทำเองตอน ม.5', when:'2 วัน' }
          ].map((p, i) => (
            <div key={i} className="rounded-lg p-2.5 flex items-start gap-2" style={{background:'#FAFAFB', border:'1px solid rgba(85,65,139,0.08)'}}>
              <span className="thai text-[10.5px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{background: CS.periwinkleSoft, color: CS.violet500}}>{p.tag}</span>
              <div className="flex-1 min-w-0">
                <p className="thai text-[12px] leading-snug" style={{color: CS.ink}}>{p.body}</p>
                <p className="thai text-[10px] mt-0.5" style={{color: CS.inkMute}}>{p.when}ที่แล้ว</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <p className="thai text-[10.5px] mt-3 text-center" style={{color: CS.inkMute}}>
        🌸 เข้าร่วมเมื่อ <span className="num font-bold" style={{color: CS.ink}}>6 เดือน</span> ก่อน · ส่วนตัวสุภาพ ไม่ละเมิดกฎ
      </p>
    </>
  );
}

// ----- TUTOR VARIANT (rich) -----
function TutorBody({ subject }) {
  return (
    <>
      {/* Stat strip — 4 columns for tutor */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <MiniStat label="rating" value="4.95" icon="★" tone="accent"/>
        <MiniStat label="ชั่วโมงสอน" value="142" sub="ชม."/>
        <MiniStat label="นักเรียน"    value="89"  sub="คน"/>
        <MiniStat label="ตอบใน"        value="<1"  sub="ชม."/>
      </div>

      {/* Ranking strip */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{background:`linear-gradient(90deg, ${CS.accent500}30, ${CS.periwinkleSoft})`, border:`1px solid ${CS.accent500}60`}}>
        <span className="text-[18px]">🏆</span>
        <p className="thai text-[12px] flex-1" style={{color: CS.grapeDeep}}>
          <b>อันดับ #2</b> ในกลุ่ม <span style={{color: CS.violet500}}>#ถามพี่หมอ</span> สัปดาห์นี้
        </p>
      </div>

      <Section label="วิชาที่สอน">
        <div className="flex flex-wrap gap-1.5">
          {['TPAT1','Biology','Chemistry','Physics','กสพท','จริยธรรมแพทย์'].map(s => (
            <span key={s} className="thai text-[11.5px] font-semibold px-2.5 py-1 rounded-full" style={{background: CS.grapeSoft, color: CS.grapeDeep}}>{s}</span>
          ))}
        </div>
        <div className="flex items-end justify-between mt-3 pt-3" style={{borderTop:'1px dashed rgba(85,65,139,0.14)'}}>
          <p className="thai text-[11px]" style={{color: CS.inkMute}}>อัตราค่าเรียน</p>
          <p className="num text-[18px] font-bold" style={{color: CS.grapeDeep}}>฿600 <span className="font-normal text-[11px]" style={{color: CS.inkMute}}>/ ชั่วโมง</span></p>
        </div>
      </Section>

      <Section label="เกี่ยวกับพี่">
        <p className="thai text-[12.5px] leading-relaxed" style={{color: CS.inkSoft}}>
          สวัสดีค่ะ พี่ติดแพทย์มหิดลรอบ TCAS65 ติว TPAT1 + กสพท. มา 3 ปีแล้ว เน้น critical thinking + จริยธรรมแพทย์ที่เด็กไทยทำพลาดบ่อย ✨
        </p>
      </Section>

      <Section label="รีวิวจากนักเรียน · 240 รีวิว">
        <div className="space-y-2">
          {[
            { name:'น้อง Pim',  when:'1 สัปดาห์',  stars:5, body:'พี่อธิบายเข้าใจมากค่ะ critical thinking ที่เคยทำได้ 30% ตอนนี้ 70% แล้ว!' },
            { name:'น้อง Boss',  when:'2 สัปดาห์', stars:5, body:'พี่ใจดี ตอบคำถามเร็ว มีชีทแถมให้ด้วย คุ้มมาก' },
            { name:'น้อง Earth', when:'1 เดือน',   stars:5, body:'จองเป็นกลุ่ม 3 คนได้เรท friend price ค่ะ คุ้มสุด ๆ' }
          ].map((r, i) => (
            <div key={i} className="rounded-xl p-3" style={{background:'#FAFAFB', border:'1px solid rgba(85,65,139,0.08)'}}>
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar name={r.name} size={26}/>
                <p className="thai text-[12px] font-bold flex-1" style={{color: CS.ink}}>{r.name}</p>
                <span className="thai text-[10.5px]" style={{color: CS.accent600}}>{'★'.repeat(r.stars)}</span>
                <span className="thai text-[10px]" style={{color: CS.inkMute}}>{r.when}ก่อน</span>
              </div>
              <p className="thai text-[12px] leading-relaxed" style={{color: CS.inkSoft}}>"{r.body}"</p>
            </div>
          ))}
          <button className="w-full thai text-[11.5px] font-semibold py-1.5 rounded-lg" style={{color: CS.violet500}}>
            ดูรีวิวทั้งหมด 240 รีวิว →
          </button>
        </div>
      </Section>

      <Section label="นักเรียนที่สอนผ่านมา">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {['น','พ','บ','ศ','ก'].map((n, i) => (
              <div key={i} className="rounded-full flex items-center justify-center text-white font-bold thai text-[11px]" style={{
                width: 28, height: 28,
                background: [CS.violet500, CS.taupe, CS.periwinkle, CS.emerald, CS.accent600][i],
                border:'2px solid #fff'
              }}>{n}</div>
            ))}
          </div>
          <p className="thai text-[11.5px] ml-1" style={{color: CS.inkSoft}}>
            และอีก <span className="num font-bold" style={{color: CS.grapeDeep}}>84</span> คน · ส่วนใหญ่ติด <span className="font-bold" style={{color: CS.violet500}}>แพทย์ มข./มหิดล/จุฬา</span>
          </p>
        </div>
      </Section>

      <Section label="ชีทขายดีของพี่">
        <div className="rounded-xl p-3 flex items-center gap-3" style={{background:'#FAFAFB', border:'1px solid rgba(85,65,139,0.10)'}}>
          <div className="w-10 h-12 rounded shadow-md flex-shrink-0" style={{background:'#fff', border:`1px solid ${CS.violet50}`, position:'relative'}}>
            <div className="absolute inset-1.5" style={{background: `repeating-linear-gradient(180deg, ${CS.violet100} 0 1.5px, transparent 1.5px 6px)`}}></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="thai text-[12px] font-bold leading-tight" style={{color: CS.ink}}>TPAT1 critical-thinking · เซ็ตรวมโจทย์</p>
            <p className="thai text-[10.5px] mt-0.5" style={{color: CS.inkMute}}>★ 4.95 · 42 รีวิว · ขายได้ <span className="num font-bold">186</span> เล่ม</p>
          </div>
          <span className="num text-[14px] font-bold" style={{color: CS.grapeDeep}}>฿290</span>
        </div>
      </Section>

      <p className="thai text-[10.5px] mt-3 text-center" style={{color: CS.inkMute}}>
        🛡️ ผ่าน KYC + ทรานสคริปต์ · เข้าร่วม Pee Rahat เมื่อ <span className="num font-bold" style={{color: CS.ink}}>2 ปี</span> ก่อน
      </p>
    </>
  );
}

// ----- Reusable -----
function Section({ label, children }) {
  return (
    <section className="mb-4">
      <p className="thai text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{color: CS.inkMute}}>{label}</p>
      {children}
    </section>
  );
}

function MiniStat({ label, value, sub, icon, tone }) {
  const color = tone === 'accent' ? CS.accent600 : CS.grapeDeep;
  return (
    <div className="rounded-lg px-2.5 py-2 text-center" style={{background:'rgba(85,65,139,0.04)'}}>
      <p className="num text-[15px] font-bold leading-none inline-flex items-baseline justify-center gap-0.5" style={{color}}>
        {icon && <span style={{fontSize:11}}>{icon}</span>}
        {value}
        {sub && <span className="font-normal text-[10px]" style={{color: CS.inkMute}}>{sub}</span>}
      </p>
      <p className="thai text-[10px] mt-1" style={{color: CS.inkMute}}>{label}</p>
    </div>
  );
}

window.CommunityV2WithStudentOverlay = CommunityV2WithStudentOverlay;
window.CommunityV2WithTutorOverlay = CommunityV2WithTutorOverlay;
window.ProfileOverlay = ProfileOverlay;
