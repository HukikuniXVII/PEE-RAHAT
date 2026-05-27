// ============================================================
// V2 · Facebook-style (Simplified) — left rail with trending only,
// wide feed, no chrome nav (the host app already has one).
//   Left   : Trending tags
//   Center : Composer (image + text + tag) + cozy post cards
//   No top nav, no story bar, no calendar, no online list, no profile mini.
// ============================================================

function CommunityV2FB() {
  return (
    <div className="cs-page cs-bg" style={{ width:'100%', height:'100%' }}>
      <div className="mx-auto" style={{ maxWidth: 1200, padding:'24px', display:'grid', gridTemplateColumns:'260px 1fr', gap: 20, alignItems:'start' }}>

        {/* ============ LEFT RAIL : TRENDING + SAVED ============ */}
        <aside className="sticky space-y-4" style={{top: 24}}>
          {/* Trending */}
          <div className="cs-card overflow-hidden">
            <div className="px-4 pt-4 pb-3 flex items-center gap-2" style={{borderBottom:'1px solid rgba(85,65,139,0.06)'}}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: CS.violet500, color:'#fff'}}>
                <CIco.TrendUp/>
              </span>
              <div>
                <h3 className="thai text-[14px] font-bold leading-tight" style={{color: CS.grapeDeep}}>กำลังมาแรง</h3>
                <p className="thai text-[10.5px]" style={{color: CS.inkMute}}>อัปเดตทุก 15 นาที</p>
              </div>
            </div>
            <div>
              {TRENDING.map((t, i) => (
                <button key={t.tag} className="w-full px-4 py-3 flex items-start justify-between gap-2 text-left transition hover:bg-[rgba(85,65,139,0.04)]" style={{borderTop: i > 0 ? '1px solid rgba(85,65,139,0.06)' : 'none'}}>
                  <div className="min-w-0 flex-1">
                    <p className="thai text-[10.5px]" style={{color: CS.inkMute}}>{t.cat}</p>
                    <p className="thai text-[13.5px] font-bold inline-flex items-center gap-1 leading-tight" style={{color: CS.ink}}>
                      {t.tag.startsWith('#') ? '' : '#'}{t.tag}
                      {i === 0 && <CIco.TrendUp style={{color: CS.rose, width: 12, height: 12}}/>}
                    </p>
                    <p className="thai text-[10.5px] mt-0.5 num" style={{color: CS.inkMute}}>{t.count}</p>
                  </div>
                  <span className="num text-[11px] font-bold rounded-full px-1.5 py-0.5 shrink-0" style={{background: i < 3 ? CS.grapeSoft : 'transparent', color: i < 3 ? CS.grapeDeep : CS.inkMute}}>
                    #{i+1}
                  </span>
                </button>
              ))}
            </div>
            <button className="w-full px-4 py-2.5 text-left thai text-[12.5px] font-semibold transition hover:bg-[rgba(85,65,139,0.04)]" style={{color: CS.violet500, borderTop:'1px solid rgba(85,65,139,0.06)'}}>
              ดูเทรนด์ทั้งหมด →
            </button>
          </div>

          {/* Saved */}
          <SavedCard/>
        </aside>

        {/* ============ CENTER FEED ============ */}
        <main className="space-y-4 min-w-0">
          {/* Simple composer — image + text + tag only */}
          <SimpleComposer/>

          {/* Posts */}
          {POSTS.map(p => <FbPost key={p.id} p={p}/>)}
        </main>
      </div>
    </div>
  );
}

// ----- SIMPLE COMPOSER (text + image + tag only) -----
function SimpleComposer() {
  const [text, setText] = React.useState('');
  return (
    <div className="cs-card p-4">
      <div className="flex items-start gap-3">
        <Avatar name="ฉัน" size={40}/>
        <div className="flex-1">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
            className="w-full thai text-[14px] outline-none resize-none leading-relaxed bg-transparent"
            style={{color: CS.ink}}
            placeholder="มีอะไรอยากถามรุ่นพี่?"/>
          <div className="flex items-center gap-1 mt-2 pt-2.5" style={{borderTop:'1px solid rgba(85,65,139,0.08)'}}>
            <button className="thai text-[13px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition hover:bg-[rgba(85,65,139,0.05)]" style={{color: CS.emerald}}>
              <CIco.Image/> รูปภาพ
            </button>
            <button className="thai text-[13px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition hover:bg-[rgba(85,65,139,0.05)]" style={{color: CS.violet500}}>
              <CIco.Hash/> แท็ก
            </button>
            <span className="flex-1"></span>
            <button disabled={!text} className="thai text-[13px] font-bold px-4 py-1.5 rounded-full transition" style={{
              background: text ? CS.violet500 : CS.grapeSoft,
              color: text ? '#fff' : CS.inkMute,
              cursor: text ? 'pointer' : 'not-allowed'
            }}>โพสต์</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- COZY POST CARD (FB-style) — unchanged from before -----
function FbPost({ p }) {
  return (
    <article className="cs-card p-0 overflow-hidden">
      {/* Author header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <Avatar name={p.author.name} size={44} badge={p.author.verified}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="thai text-[14px] font-bold inline-flex items-center gap-1" style={{color: CS.ink}}>
              {p.author.name}
              {p.author.verified && <CIco.Verified size={13} style={{color: CS.violet500}}/>}
            </p>
            {p.author.verified && <UniBadge uni={p.author.uni} size="sm"/>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 thai text-[11.5px]" style={{color: CS.inkMute}}>
            <span>{p.when}</span>
            <span>·</span>
            <CIco.Globe/>
            <span>·</span>
            <span className="cs-link">{p.tag}</span>
          </div>
        </div>
        <button><CIco.More style={{color: CS.inkMute}}/></button>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <p className="thai text-[14.5px] leading-[1.6] whitespace-pre-line" style={{color: CS.ink}}>
          {p.body.split(/(#\S+)/g).map((t, i) =>
            t.startsWith('#') ? <span key={i} className="cs-link font-medium">{t}</span> : <React.Fragment key={i}>{t}</React.Fragment>
          )}
        </p>
      </div>

      {p.embed && <div className="px-4 pb-3"><EmbedCard embed={p.embed}/></div>}
      {p.poll  && <div className="px-4 pb-3"><PollBlock poll={p.poll}/></div>}

      {/* Reaction summary */}
      <div className="px-4 py-2 flex items-center justify-between thai text-[12px]" style={{color: CS.inkMute}}>
        <div className="flex items-center gap-1">
          <ReactionStack reactions={[
            { emoji:'❤', bg: CS.rose },
            { emoji:'🎉', bg: CS.accent600 },
            { emoji:'💡', bg: CS.periwinkle }
          ]}/>
          <span className="num">{fmtCount(p.likes)}</span>
        </div>
        <div className="flex items-center gap-2 num">
          <span>{fmtCount(p.comments)} ความเห็น</span>
        </div>
      </div>

      {/* Action row */}
      <div className="px-2 cs-hairline grid grid-cols-3">
        {[
          { ic:<CIco.Heart fill={p.liked ? 'currentColor' : 'none'}/>, l:'ถูกใจ',    on: p.liked,      color: CS.rose },
          { ic:<CIco.Comment/>, l:'ความเห็น',  color: CS.periwinkle },
          { ic:<CIco.Bookmark fill={p.bookmarked ? 'currentColor' : 'none'}/>, l:'บันทึก', on: p.bookmarked, color: CS.accent600 }
        ].map((a, i) => (
          <button key={i} className="py-2.5 thai text-[13px] font-semibold inline-flex items-center justify-center gap-2 rounded-lg transition hover:bg-[rgba(85,65,139,0.06)]"
            style={{color: a.on ? a.color : CS.inkSoft}}>
            {a.ic} {a.l}
          </button>
        ))}
      </div>

      {/* Inline comments */}
      {p.topReplies && p.topReplies.length > 0 && (
        <div className="px-4 pt-3 pb-3 cs-hairline space-y-2.5" style={{background: 'rgba(85,65,139,0.02)'}}>
          {p.topReplies.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <Avatar name={r.author} size={32}/>
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl px-3 py-2" style={{background: '#fff', border:'1px solid rgba(85,65,139,0.08)'}}>
                  <p className="thai text-[12.5px] font-bold inline-flex items-center gap-1.5 leading-tight" style={{color: CS.ink}}>
                    {r.author}
                    {r.verified && <CIco.Verified size={11} style={{color: CS.violet500}}/>}
                    {r.uni && <UniBadge uni={r.uni} verified={!!r.verified} size="sm"/>}
                  </p>
                  <p className="thai text-[13px] mt-1 leading-relaxed" style={{color: CS.ink}}>{r.body}</p>
                </div>
                <div className="flex items-center gap-3 thai text-[11px] mt-1 ml-3" style={{color: CS.inkMute}}>
                  <span>{r.when}</span>
                  <button className="font-bold hover:underline">ถูกใจ</button>
                  <button className="font-bold hover:underline">ตอบกลับ</button>
                  {r.likes > 0 && (
                    <span className="ml-auto inline-flex items-center gap-1 px-1.5 rounded-full" style={{background:'#fff', border:'1px solid rgba(85,65,139,0.10)'}}>
                      <CIco.Heart fill="currentColor" style={{color: CS.rose, width:10, height:10}}/>
                      <span className="num">{r.likes}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Comment composer */}
          <div className="flex items-center gap-2 pt-1">
            <Avatar name="ฉัน" size={28}/>
            <div className="flex-1 px-3 py-1.5 rounded-full flex items-center gap-2" style={{background:'#fff', border:'1px solid rgba(85,65,139,0.10)'}}>
              <input className="flex-1 thai text-[12.5px] outline-none bg-transparent" placeholder="แสดงความเห็น…" />
              <CIco.Smile style={{color: CS.inkMute}}/>
              <CIco.Image style={{color: CS.inkMute}}/>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// Reaction stack used by FbPost
function ReactionStack({ reactions }) {
  return (
    <div className="flex items-center" style={{marginRight: 4}}>
      {reactions.map((r, i) => (
        <span key={i} className="rounded-full flex items-center justify-center" style={{
          width: 18, height: 18,
          background: r.bg, color: '#fff',
          fontSize: 10, fontWeight: 700,
          marginLeft: i === 0 ? 0 : -5,
          border:'1.5px solid #fff',
          zIndex: 3 - i
        }}>{r.emoji}</span>
      ))}
    </div>
  );
}

window.CommunityV2FB = CommunityV2FB;

// ----- SAVED CARD (left rail, below Trending) -----
function SavedCard() {
  const saved = POSTS.filter(p => p.bookmarked).slice(0, 3);
  return (
    <div className="cs-card overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2" style={{borderBottom:'1px solid rgba(85,65,139,0.06)'}}>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: CS.accent500, color: CS.grapeDeep}}>
          <CIco.Bookmark fill="currentColor"/>
        </span>
        <div className="flex-1">
          <h3 className="thai text-[14px] font-bold leading-tight" style={{color: CS.grapeDeep}}>ที่บันทึกไว้</h3>
          <p className="thai text-[10.5px]" style={{color: CS.inkMute}}>โพสต์ที่เก็บไว้อ่านไว้งาน</p>
        </div>
        <span className="num text-[11px] font-bold px-1.5 py-0.5 rounded" style={{background: CS.grapeSoft, color: CS.grapeDeep}}>{saved.length}</span>
      </div>
      <div>
        {saved.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-[20px] mb-1">🔖</p>
            <p className="thai text-[11.5px]" style={{color: CS.inkMute}}>ยังไม่มีโพสต์ที่บันทึก</p>
          </div>
        ) : saved.map((p, i) => (
          <button key={p.id} className="w-full px-4 py-3 flex items-start gap-2.5 text-left transition hover:bg-[rgba(85,65,139,0.04)]" style={{borderTop: i > 0 ? '1px solid rgba(85,65,139,0.06)' : 'none'}}>
            <Avatar name={p.author.name} size={28} badge={p.author.verified}/>
            <div className="flex-1 min-w-0">
              <p className="thai text-[11px] font-medium leading-tight" style={{color: CS.violet500}}>{p.author.name} · {p.tag}</p>
              <p className="thai text-[12px] mt-0.5 leading-snug" style={{color: CS.ink,
                display:'-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient:'vertical', overflow:'hidden'
              }}>{p.body.split('\n')[0]}</p>
              <p className="thai text-[10px] mt-1" style={{color: CS.inkMute}}>บันทึกไว้ {p.when}ที่แล้ว</p>
            </div>
          </button>
        ))}
      </div>
      <button className="w-full px-4 py-2.5 text-left thai text-[12.5px] font-semibold transition hover:bg-[rgba(85,65,139,0.04)]" style={{color: CS.violet500, borderTop:'1px solid rgba(85,65,139,0.06)'}}>
        ดูที่บันทึกทั้งหมด →
      </button>
    </div>
  );
}
