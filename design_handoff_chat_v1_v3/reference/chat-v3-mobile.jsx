// ============================================================
// Chat V3 · Mobile (iOS) — students chat on phones; show the
// experience inside an iPhone frame. Single column, sticky top
// header with tutor info, bottom tab bar (LINE/Messenger pattern).
// ============================================================

function ChatV3Mobile() {
  const thread = THREADS.find(t => t.id === 'th1');

  return (
    <div className="cs-page" style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background: 'transparent' }}>
      <IOSDevice>
        <div className="flex flex-col h-full" style={{background: CS.cream}}>
          {/* === Sticky top: back + tutor card + actions === */}
          <header className="px-3 pt-3 pb-2 sticky top-0 z-10" style={{background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(85,65,139,0.08)'}}>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full flex items-center justify-center -ml-1" style={{color: CS.violet500}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 6 9 12 15 18"/>
                </svg>
              </button>
              <div className="relative">
                <Avatar name={thread.counterparty} size={36} badge={thread.verified}/>
                {thread.online && <span className="absolute" style={{bottom: -1, right: -1, width: 10, height: 10, background: CS.emerald, border: '2px solid #fff', borderRadius: 999}}></span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="thai text-[14px] font-bold inline-flex items-center gap-1 leading-tight" style={{color: CS.ink}}>
                  {thread.counterparty}
                  {thread.verified && <CIco.Verified size={11} style={{color: CS.violet500}}/>}
                </p>
                <p className="thai text-[10.5px]" style={{color: thread.online ? CS.emerald : CS.inkMute}}>
                  {thread.online ? 'ออนไลน์ตอนนี้' : 'ออฟไลน์'} · {thread.uni.split(' ')[0]} {thread.uni.split(' ')[1]}
                </p>
              </div>
              <button className="px-3 py-2 rounded-lg thai text-[11.5px] font-bold inline-flex items-center gap-1.5" style={{background: 'transparent', color: 'transparent', border:'none', display:'none'}}></button>
            </div>

            {/* Booking strip removed */}
          </header>

          {/* === Messages (scrollable) === */}
          <main className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            <DayChip label="วานนี้"/>
            <MobileMsg from="them" author={thread.counterparty} body="สวัสดีค่ะน้องมิ้น 👋 พี่ดูประวัติแล้ว เห็นว่าน้องเน้นแพทย์ มข./จุฬา ใช่ไหมคะ?" time="19:42"/>
            <MobileMsg from="me" body="ใช่ค่ะพี่ ตอนนี้ทำได้แค่ ~45/100" time="19:43"/>
            <MobileMsg from="me" body="เผื่อพี่คุยตรงๆ Line อยู่ที่ " redacted="[เบอร์ถูกซ่อนตามนโยบาย]" time="19:44"/>
            <MobileMsg from="them" author={thread.counterparty} body="พี่ตอบใน chat ก็ได้ค่ะ ระบบ escrow จะคุ้มครองทั้งคู่ ✓" time="19:45"/>

            {/* Booking proposal — mobile compact */}
            <div className="rounded-2xl overflow-hidden cs-pop" style={{background:'#fff', border:`1px solid ${CS.violet50}`, boxShadow:'0 4px 14px -6px rgba(85,65,139,0.18)'}}>
              <div className="px-3 py-2 flex items-center gap-2" style={{background: CS.violet500, color:'#fff'}}>
                <CIco.Calendar style={{width:14, height:14}}/>
                <p className="thai text-[11px] font-bold flex-1">เสนอเวลาเรียน</p>
                <span className="thai text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.18)'}}>รอตอบรับ</span>
              </div>
              <div className="p-3">
                <p className="thai text-[14px] font-bold" style={{color: CS.grapeDeep}}>25 พ.ค. 2569</p>
                <p className="thai text-[12px]" style={{color: CS.inkSoft}}>19:00 – 21:00 · 2 ชม.</p>
                <p className="thai text-[11.5px] font-bold mt-2" style={{color: CS.ink}}>📚 TPAT1 critical-thinking + จริยธรรม</p>
                <div className="grid grid-cols-3 gap-1.5 mt-3">
                  <button className="thai text-[10.5px] font-semibold py-2 rounded-lg" style={{background:'transparent', color: CS.inkSoft, border:'1px solid rgba(85,65,139,0.18)'}}>เสนอเวลาอื่น</button>
                  <button className="thai text-[10.5px] font-semibold py-2 rounded-lg" style={{background:'transparent', color: CS.taupeDeep, border:`1px solid ${CS.taupe}60`}}>ปฏิเสธ</button>
                  <button className="thai text-[11.5px] font-bold py-2 rounded-lg" style={{background: CS.violet500, color:'#fff'}}>ตอบรับ</button>
                </div>
              </div>
            </div>

            {/* System success */}
            <div className="flex justify-center">
              <div className="rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{background: CS.emeraldSoft}}>
                <span style={{fontSize: 14}}>✓</span>
                <p className="thai text-[10.5px] font-bold" style={{color: CS.emerald}}>ชำระเงิน <span className="num">฿1,200</span> เข้า Escrow แล้ว</p>
              </div>
            </div>

            <MobileMsg from="them" author={thread.counterparty} body="รับทราบค่ะ พี่จะส่งเอกสารให้ก่อน 1 วัน 📚" time="19:52"/>

            <DayChip label="วันนี้"/>
            <MobileMsg from="them" author={thread.counterparty} body="น้องเป็นไงบ้างคะ อ่านชีทไปถึงไหนแล้ว?" time="14:20"/>
            <MobileMsg from="me" body="อ่านถึงพาร์ทจริยธรรมแล้วค่ะ ติดข้อ 12 ไม่เข้าใจ" time="14:32"/>
            <MobileMsg from="them" author={thread.counterparty} body="ลองทำชุดที่พี่ส่งให้ก่อนนะคะ เดี๋ยวเย็นนี้เฉลยให้" time="เมื่อกี้" unread/>

            {/* Typing indicator */}
            <div className="flex items-end gap-2">
              <Avatar name={thread.counterparty} size={24} badge/>
              <div className="px-3 py-2 rounded-2xl ch-bubble-them flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{background: CS.inkMute, animation:'chPulse 1.4s infinite 0s'}}></span>
                <span className="w-1.5 h-1.5 rounded-full" style={{background: CS.inkMute, animation:'chPulse 1.4s infinite .2s'}}></span>
                <span className="w-1.5 h-1.5 rounded-full" style={{background: CS.inkMute, animation:'chPulse 1.4s infinite .4s'}}></span>
              </div>
            </div>
          </main>

          {/* === Composer === */}
          <div className="px-3 py-2.5 shrink-0" style={{background:'#fff', borderTop:'1px solid rgba(85,65,139,0.10)'}}>
            <div className="flex items-end gap-1.5">
              <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{background: CS.grapeSoft, color: CS.violet500}}>
                <CIco.Plus/>
              </button>
              <div className="flex-1 rounded-3xl px-3.5 py-2 flex items-center gap-2" style={{background: CS.grapeSoft+'80', border:'1px solid rgba(85,65,139,0.10)'}}>
                <input className="flex-1 thai text-[13px] outline-none bg-transparent" placeholder="พิมพ์ข้อความ…"/>
                <button style={{color: CS.inkMute}}><CIco.Smile/></button>
              </div>
              <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{background: CS.violet500, color:'#fff'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l18-8-8 18-2-8z"/>
                </svg>
              </button>
            </div>
            <p className="thai text-[9.5px] mt-1 px-2 text-center" style={{color: CS.inkMute}}>🔒 เบอร์/Line จะถูกซ่อนอัตโนมัติ</p>
          </div>
        </div>
      </IOSDevice>
    </div>
  );
}

function MobileMsg({ from, author, body, time, redacted, unread }) {
  const isMe = from === 'me';
  return (
    <div className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : ''}`}>
      {!isMe && <Avatar name={author} size={24} badge/>}
      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`} style={{maxWidth:'78%'}}>
        <div className={`px-3 py-2 thai text-[13px] leading-relaxed ${isMe ? 'ch-bubble-me' : 'ch-bubble-them'}`}>
          {body}
          {redacted && <span className="ch-redacted ml-1 inline-flex items-center gap-1">🔒 {redacted}</span>}
        </div>
        <p className="thai text-[9.5px] mt-0.5 px-1 inline-flex items-center gap-1" style={{color: CS.inkMute}}>
          {time}
          {isMe && <span style={{color: unread ? CS.inkMute : CS.violet500}}>{unread ? '· ส่งแล้ว' : '· อ่านแล้ว ✓✓'}</span>}
        </p>
      </div>
    </div>
  );
}

function DayChip({ label }) {
  return (
    <div className="flex justify-center my-2">
      <span className="thai text-[10px] font-bold px-2.5 py-1 rounded-full" style={{background: CS.grapeSoft, color: CS.grapeDeep}}>{label}</span>
    </div>
  );
}

window.ChatV3Mobile = ChatV3Mobile;
