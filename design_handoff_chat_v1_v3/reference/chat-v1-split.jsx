// ============================================================
// Chat V1 · Classic Split — most familiar pattern
//   Left rail (340px) : thread list with search + status filters
//   Center            : sticky tutor card + message stream + composer
//   Right rail (280px): tutor profile + booking history + safety
// Pure desktop chat-app feel, brand-violet bubbles.
// ============================================================

function ChatV1Split() {
  const [active, setActive] = React.useState('th1');
  const [filter, setFilter] = React.useState('all');
  const thread = THREADS.find(t => t.id === active);

  return (
    <div className="cs-page" style={{ width:'100%', height:'100%', background: CS.smoke, display:'flex', flexDirection:'column' }}>
      {/* === SLIM TOP BAR === */}
      <header className="px-5 py-2.5 flex items-center gap-3" style={{background:'#fff', borderBottom:'1px solid rgba(85,65,139,0.10)'}}>
        <a className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: CS.violet500, color:'#fff'}}>
            <CIco.Logo width="18" height="18"/>
          </span>
          <span className="text-[16px] font-bold tracking-tight" style={{color: CS.grapeDeep, letterSpacing:'-0.02em'}}>Pee Rahat</span>
          <span className="thai text-[11px] font-medium px-2 py-0.5 rounded" style={{background: CS.grapeSoft, color: CS.grapeDeep}}>แชท</span>
        </a>
        <div className="flex-1"></div>
        <Avatar name="ฉัน" size={32}/>
      </header>

      {/* === 2-COL BODY (no right profile rail) === */}
      <div className="flex-1 grid min-h-0" style={{gridTemplateColumns:'340px 1fr'}}>

        {/* ============ LEFT: THREAD LIST ============ */}
        <aside className="flex flex-col min-h-0" style={{background:'#fff', borderRight:'1px solid rgba(85,65,139,0.08)'}}>
          <div className="px-4 pt-4 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h1 className="thai text-[18px] font-bold tracking-tight" style={{color: CS.grapeDeep, letterSpacing:'-0.01em'}}>ข้อความ</h1>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center transition" style={{background: CS.violet500, color:'#fff'}} title="แชทใหม่">
                <CIco.Plus/>
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{background: CS.grapeSoft}}>
              <CIco.Search style={{color: CS.inkMute}}/>
              <input className="flex-1 outline-none thai text-[12.5px] bg-transparent" placeholder="ค้นหารุ่นพี่/หัวข้อ"/>
            </div>
            {/* status chips */}
            <div className="flex gap-1.5 mt-3">
              {[
                { v:'all',      l:'ทั้งหมด',     n: THREADS.length },
                { v:'booked',   l:'จองแล้ว',     n: THREADS.filter(t => t.booking).length },
                { v:'unread',   l:'ยังไม่อ่าน',   n: THREADS.filter(t => t.unread > 0).length }
              ].map(c => {
                const on = filter === c.v;
                return (
                  <button key={c.v} onClick={() => setFilter(c.v)}
                    className="thai text-[11.5px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 transition"
                    style={{
                      background: on ? CS.violet500 : 'transparent',
                      color: on ? '#fff' : CS.grapeDeep,
                      border: on ? 'none' : '1px solid rgba(85,65,139,0.14)'
                    }}>
                    {c.l}
                    <span className="num text-[10px] font-bold" style={{opacity: on ? 0.85 : 0.7}}>{c.n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-hidden">
            {THREADS.map(t => {
              const on = t.id === active;
              return (
                <button key={t.id} onClick={() => setActive(t.id)}
                  className="w-full px-4 py-3 flex items-start gap-3 text-left transition ch-thread-hover"
                  style={on ? { background: CS.grapeSoft, borderLeft: `3px solid ${CS.violet500}`, paddingLeft: 13 } : { borderLeft: '3px solid transparent' }}>
                  <div className="relative shrink-0">
                    <Avatar name={t.counterparty} size={42} badge={t.verified}/>
                    {t.online && <span className="absolute" style={{bottom: -1, right: -1, width: 11, height: 11, background: CS.emerald, border: '2px solid #fff', borderRadius: 999}}></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="thai text-[13.5px] font-bold truncate" style={{color: CS.ink}}>{t.counterparty}</p>
                      <span className="thai text-[10.5px] shrink-0" style={{color: t.unread ? CS.violet500 : CS.inkMute, fontWeight: t.unread ? 700 : 400}}>{t.time}</span>
                    </div>
                    <p className="thai text-[10.5px] truncate mb-1" style={{color: t.admin ? CS.taupeDeep : CS.periwinkle}}>{t.uni}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="thai text-[12px] truncate flex-1" style={{color: t.unread ? CS.ink : CS.inkSoft, fontWeight: t.unread ? 600 : 400}}>{t.preview}</p>
                      {t.unread > 0 && <span className="num font-bold rounded-full px-1.5 shrink-0" style={{background: CS.violet500, color:'#fff', fontSize: 10}}>{t.unread}</span>}
                    </div>
                    {t.booking && (
                      <div className="mt-1.5">
                        <BookingBadge status={t.booking}/>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ============ CENTER: CONVERSATION ============ */}
        <main className="flex flex-col min-h-0 relative" style={{background: CS.cream}}>
          {/* Sticky counterparty header */}
          <div className="px-5 py-3 flex items-center gap-3 shrink-0" style={{background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(85,65,139,0.10)'}}>
            <div className="relative">
              <Avatar name={thread.counterparty} size={44} badge={thread.verified}/>
              {thread.online && <span className="absolute" style={{bottom: -1, right: -1, width: 11, height: 11, background: CS.emerald, border: '2px solid #fff', borderRadius: 999}}></span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="thai text-[15px] font-bold inline-flex items-center gap-1.5" style={{color: CS.ink}}>
                {thread.counterparty}
                {thread.verified && <CIco.Verified size={13} style={{color: CS.violet500}}/>}
              </p>
              <p className="thai text-[11px]" style={{color: CS.inkSoft}}>
                {thread.uni}
                {thread.online && (
                  <>
                    <span className="mx-1.5" style={{color: CS.inkMute}}>·</span>
                    <span className="inline-flex items-center gap-1" style={{color: CS.emerald}}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{background: CS.emerald}}></span>
                      ออนไลน์
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg thai text-[12px] font-semibold inline-flex items-center gap-1.5" style={{background: CS.grapeSoft, color: CS.grapeDeep}}>
                <CIco.Calendar/> เสนอเวลาเรียนใหม่
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {ACTIVE_MESSAGES.map((m, i) => <MessageRow key={i} m={m}/>)}
          </div>

          {/* Composer */}
          <Composer/>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// MESSAGE BUBBLES + SYSTEM CARDS
// ============================================================
function MessageRow({ m }) {
  if (m.kind === 'divider') {
    return (
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px" style={{background:'rgba(85,65,139,0.12)'}}></div>
        <span className="thai text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{background: CS.grapeSoft, color: CS.grapeDeep}}>{m.label}</span>
        <div className="flex-1 h-px" style={{background:'rgba(85,65,139,0.12)'}}></div>
      </div>
    );
  }
  if (m.kind === 'system') {
    return <SystemCard m={m}/>;
  }
  if (m.kind === 'system-booking-proposal') {
    return <BookingProposalCard m={m}/>;
  }
  // them / me
  const isMe = m.kind === 'me';
  return (
    <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : ''}`}>
      {!isMe && <Avatar name={m.author} size={28} badge/>}
      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`} style={{maxWidth: '70%'}}>
        {m.kindEmbed === 'sheet' && (
          <div className="mb-1.5 max-w-[280px]">
            <RedditEmbed embed={m.embed}/>
          </div>
        )}
        <div className={`px-3.5 py-2.5 thai text-[13.5px] leading-relaxed ${isMe ? 'ch-bubble-me' : 'ch-bubble-them'}`}>
          {m.body}
          {m.body2redacted && (
            <span className="ch-redacted ml-1 inline-flex items-center gap-1">
              🔒 {m.body2redacted}
            </span>
          )}
        </div>
        <p className="thai text-[10px] mt-1 px-1 inline-flex items-center gap-1" style={{color: CS.inkMute}}>
          {m.time}
          {isMe && (
            <span style={{color: m.read === false ? CS.inkMute : CS.violet500}}>
              {m.read === false ? ' · ส่งแล้ว' : ' · อ่านแล้ว ✓✓'}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function SystemCard({ m }) {
  const colors = {
    success: { bg: CS.emeraldSoft, fg: CS.emerald,    border: `${CS.emerald}40` },
    info:    { bg: CS.periwinkleSoft, fg: CS.violet500, border: `${CS.violet500}40` },
    warn:    { bg: CS.accent500+'30', fg: CS.accent600, border: `${CS.accent600}40` }
  }[m.tone] || { bg: CS.grapeSoft, fg: CS.grapeDeep, border: 'rgba(85,65,139,0.10)' };
  return (
    <div className="flex justify-center my-1">
      <div className="rounded-2xl px-4 py-2.5 max-w-[480px] flex items-start gap-2.5" style={{background: colors.bg, border: `1px solid ${colors.border}`}}>
        <span className="text-[18px] shrink-0">{m.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="thai text-[12.5px] font-bold leading-tight" style={{color: colors.fg}}>{m.label}</p>
          {m.sub && <p className="thai text-[11px] mt-0.5 leading-relaxed" style={{color: CS.inkSoft}}>{m.sub}</p>}
        </div>
      </div>
    </div>
  );
}

function BookingProposalCard({ m }) {
  return (
    <div className="flex justify-center my-2 cs-pop">
      <div className="ch-system-card rounded-2xl p-4 max-w-[440px]" style={{boxShadow:'0 8px 24px -10px rgba(85,65,139,0.28)'}}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: CS.violet500, color:'#fff'}}><CIco.Calendar/></span>
          <div>
            <p className="thai text-[10.5px] font-bold uppercase tracking-wider" style={{color: CS.violet500}}>เสนอเวลาเรียน</p>
            <p className="thai text-[11px]" style={{color: CS.inkMute}}>โดย {m.from}</p>
          </div>
          <span className="thai text-[10px] font-bold ml-auto px-2 py-0.5 rounded-full" style={{background: CS.accent500+'30', color: CS.accent600}}>● รอตอบรับ</span>
        </div>
        <div className="rounded-xl p-3 mb-3" style={{background: CS.grapeSoft}}>
          <p className="thai text-[14px] font-bold leading-tight" style={{color: CS.grapeDeep}}>{m.date}</p>
          <p className="thai text-[12.5px] mt-0.5" style={{color: CS.inkSoft}}>{m.time} · <span className="num">{m.durationMin}</span> นาที</p>
        </div>
        <p className="thai text-[12.5px] font-bold mb-1" style={{color: CS.ink}}>📚 {m.subject}</p>
        <p className="thai text-[11.5px] leading-relaxed mb-3" style={{color: CS.inkSoft}}>{m.note}</p>
        <div className="flex items-center gap-2 pt-2" style={{borderTop: '1px dashed rgba(85,65,139,0.18)'}}>
          <button className="thai text-[12px] font-semibold px-3 py-2 rounded-lg" style={{background:'transparent', color: CS.inkSoft, border: '1px solid rgba(85,65,139,0.18)'}}>เสนอเวลาอื่น</button>
          <button className="thai text-[12px] font-semibold px-3 py-2 rounded-lg" style={{color: CS.taupeDeep}}>ปฏิเสธ</button>
          <span className="flex-1"></span>
          <button className="thai text-[13px] font-bold px-5 py-2 rounded-lg inline-flex items-center gap-1.5" style={{background: CS.violet500, color:'#fff', boxShadow:`0 6px 14px -6px ${CS.violet500}90`}}>
            ตอบรับ
          </button>
        </div>
      </div>
    </div>
  );
}

function Composer() {
  return (
    <div className="px-4 py-3 shrink-0" style={{background:'#fff', borderTop:'1px solid rgba(85,65,139,0.10)'}}>
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-0.5">
          {[<CIco.Plus/>, <CIco.Image/>, <CIco.Smile/>].map((ic, i) => (
            <button key={i} className="w-9 h-9 rounded-lg flex items-center justify-center transition hover:bg-[rgba(85,65,139,0.06)]" style={{color: CS.inkSoft}}>{ic}</button>
          ))}
        </div>
        <div className="flex-1 rounded-2xl px-3.5 py-2.5" style={{background: CS.grapeSoft+'80', border:'1px solid rgba(85,65,139,0.08)'}}>
          <textarea rows={1} className="w-full thai text-[13.5px] outline-none resize-none bg-transparent leading-relaxed" placeholder="พิมพ์ข้อความ… (ห้ามแลกเบอร์/Line — ระบบจะซ่อนให้อัตโนมัติ)" style={{color: CS.ink}}/>
        </div>
        <button className="w-10 h-10 rounded-xl flex items-center justify-center transition" style={{background: CS.violet500, color:'#fff', boxShadow:`0 6px 14px -6px ${CS.violet500}90`}} title="ส่ง">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l18-8-8 18-2-8z"/>
          </svg>
        </button>
      </div>
      <p className="thai text-[10px] mt-1.5 px-1" style={{color: CS.inkMute}}>
        🔒 ทุกข้อความถูกเข้ารหัสและตรวจ bypass อัตโนมัติ · กด Enter เพื่อส่ง
      </p>
    </div>
  );
}

window.ChatV1Split = ChatV1Split;
window.MessageRow = MessageRow;     // share with V2
window.BookingProposalCard = BookingProposalCard;
window.SystemCard = SystemCard;
window.Composer = Composer;
