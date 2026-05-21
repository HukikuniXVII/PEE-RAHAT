// ============================================================
// V1 — "Compare Dock"
// Standard 3-up grid + magnetic comparison dock at bottom.
// Pin programs → they slot into the dock. Expand dock → full
// side-by-side comparison overlay with weights, history, GPAX.
// ============================================================

function SearchV1Pin() {
  const [tab, setTab] = React.useState('NETSAT');
  const [pinned, setPinned] = React.useState(['n1','n2']);
  const [expanded, setExpanded] = React.useState(false);
  const [facultyFilter, setFacultyFilter] = React.useState('all');
  const [showInactive, setShowInactive] = React.useState(false);

  const programs = PROGRAMS.filter(p => p.round === tab);
  const faculties = Array.from(new Set(programs.map(p => p.faculty)));
  const filtered = programs.filter(p => {
    if (facultyFilter !== 'all' && p.faculty !== facultyFilter) return false;
    if (!showInactive && p.status === 'inactive') return false;
    return true;
  }).slice(0, 6);

  const togglePin = (id) => {
    setPinned(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  return (
    <div className="ts-page ts-bg" style={{ width: '100%', height: '100%', padding: '32px 36px 36px', position:'relative', overflow:'hidden' }}>
      {/* === HEADER === */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:TS.violet500, color:'#fff'}}>
            <TIco.Calc/>
          </div>
          <div>
            <h1 className="thai text-[22px] font-bold tracking-tight" style={{ color: TS.grapeDeep, letterSpacing:'-0.01em' }}>
              เครื่องคำนวณคะแนน TCAS
            </h1>
            <p className="thai text-[12.5px]" style={{color: TS.inkSoft}}>
              เลือกหลักสูตร เช็คโอกาสติด เปรียบเทียบได้ทีละ 3 หลักสูตร
            </p>
          </div>
        </div>
        <BrandTab value={tab} onChange={(v) => { setTab(v); setPinned([]); }}/>
      </header>

      {/* === SEARCH + FILTER ROW === */}
      <div className="ts-card mb-5" style={{ padding: '14px 18px' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2 ts-input" style={{padding:'10px 14px'}}>
            <TIco.Search style={{color: TS.inkMute}}/>
            <input className="flex-1 outline-none thai text-[13.5px]" placeholder="ค้นหา ชื่อคณะ หลักสูตร หรือมหา'ลัย…" style={{background:'transparent', border:'none'}}/>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: TS.grapeSoft, color: TS.grapeDeep }}>⌘K</span>
          </div>
          <select className="ts-input thai text-[12.5px] cursor-pointer">
            <option>เรียงโดย: คะแนน min ปีก่อน ↑</option>
            <option>คะแนน min ปีก่อน ↓</option>
            <option>คะแนน mean ปีก่อน</option>
            <option>จำนวนที่นั่ง</option>
            <option>ความนิยม</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="thai text-[11.5px] font-semibold mr-1" style={{color: TS.inkMute}}>คณะ:</span>
          <BrandChip active={facultyFilter === 'all'} onClick={() => setFacultyFilter('all')} size="sm">ทั้งหมด ({programs.length})</BrandChip>
          {faculties.slice(0,5).map(f => (
            <BrandChip key={f} active={facultyFilter === f} onClick={() => setFacultyFilter(f)} size="sm">{f}</BrandChip>
          ))}
          <span className="thai text-[11.5px] mx-2" style={{color: TS.inkMute}}>·</span>
          <BrandChip active={showInactive} color={TS.taupeDeep} soft={TS.taupeSoft} onClick={() => setShowInactive(v => !v)} size="sm">
            📁 รวมหลักสูตรที่ไม่เปิดปีนี้
          </BrandChip>
        </div>
      </div>

      {/* === CARD GRID === */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(p => {
          const isPinned = pinned.includes(p.id);
          return (
            <article key={p.id} className="ts-card ts-lift" style={{
              padding: 18,
              borderColor: isPinned ? TS.violet500 : 'rgba(85,65,139,0.08)',
              boxShadow: isPinned ? '0 0 0 2px rgba(85,65,139,0.18), 0 18px 40px -22px rgba(85,65,139,0.45)' : undefined
            }}>
              {/* top row: status + pin */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{background: TS.grapeSoft, color: TS.grapeDeep}}>{p.uni}</span>
                  {p.status === 'inactive'
                    ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-full thai" style={{background: TS.taupeSoft, color: TS.taupeDeep}}>📁 ไม่เปิดปีนี้</span>
                    : <span className="text-[10px] font-medium px-2 py-0.5 rounded-full thai inline-flex items-center gap-1" style={{background: TS.competitiveSoft, color: TS.competitive}}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{background: TS.competitive}}></span> เปิด 2569
                      </span>}
                </div>
                <button onClick={() => togglePin(p.id)} className="rounded-full w-7 h-7 flex items-center justify-center transition" style={{
                  background: isPinned ? TS.violet500 : '#fff',
                  color: isPinned ? '#fff' : TS.inkMute,
                  border: `1px solid ${isPinned ? TS.violet500 : 'rgba(85,65,139,0.18)'}`
                }} title={isPinned ? 'ถอนปักหมุด' : 'ปักหมุดเปรียบเทียบ'}>
                  {isPinned ? <TIco.PinFilled/> : <TIco.Pin/>}
                </button>
              </div>
              {/* faculty + name */}
              <p className="thai text-[11.5px] font-medium mb-0.5" style={{color: TS.periwinkle}}>{p.faculty}</p>
              <h3 className="thai text-[16px] font-bold leading-tight mb-3" style={{color: TS.grapeDeep, minHeight: 38}}>{p.name}</h3>

              {/* history row */}
              <div className="rounded-xl p-3 mb-3" style={{background: TS.grapeSoft}}>
                <div className="flex items-center justify-between mb-2">
                  <span className="thai text-[10.5px] font-semibold" style={{color: TS.inkMute, letterSpacing:'0.04em'}}>สถิติคะแนน ปี {p.history.year}</span>
                  <Spark values={p.trend} color={TS.violet500} w={50} h={16}/>
                </div>
                <div className="grid grid-cols-3 gap-0">
                  {[{l:'min',v:p.history.min,c:TS.risky},{l:'mean',v:p.history.mean,c:TS.violet500},{l:'max',v:p.history.max,c:TS.competitive}].map((s,i) => (
                    <div key={i} className="text-center">
                      <p className="num text-[18px] font-bold" style={{color: s.c}}>{s.v.toFixed(1)}</p>
                      <p className="text-[10px] font-mono uppercase" style={{color: TS.inkMute, letterSpacing:'0.08em'}}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* weights mini-bar */}
              <div className="mb-3">
                <p className="thai text-[10.5px] font-semibold mb-1.5" style={{color: TS.inkMute, letterSpacing:'0.04em'}}>วิชาที่ใช้ ({p.weights.length})</p>
                <div className="flex h-2 rounded-full overflow-hidden" style={{background: '#F2EEF6'}}>
                  {p.weights.map((w, i) => (
                    <div key={w.c} title={`${w.l} ${w.w}%`} style={{
                      width: `${w.w}%`,
                      background: [TS.violet500, TS.periwinkle, TS.taupe, TS.accent600, TS.competitive, TS.borderline][i % 6]
                    }}></div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.weights.slice(0,3).map((w, i) => (
                    <span key={w.c} className="thai text-[10px] px-1.5 py-0.5 rounded" style={{background: '#F5F2FA', color: TS.inkSoft}}>
                      {w.l} <span className="num font-semibold" style={{color: TS.grapeDeep}}>{w.w}%</span>
                    </span>
                  ))}
                  {p.weights.length > 3 && <span className="text-[10px] thai" style={{color: TS.inkMute}}>+{p.weights.length - 3}</span>}
                </div>
              </div>

              {/* footer stats */}
              <div className="flex items-center justify-between pt-3 ts-hairline">
                <div className="flex items-center gap-3 text-[11px] thai" style={{color: TS.inkSoft}}>
                  <span><span style={{color:TS.inkMute}}>ที่นั่ง</span> <span className="num font-bold" style={{color: TS.ink}}>{p.seats}</span></span>
                  <span><span style={{color:TS.inkMute}}>GPAX</span> <span className="num font-bold" style={{color: TS.ink}}>{p.minGpax}</span></span>
                </div>
                <button className="inline-flex items-center gap-1.5 thai text-[11.5px] font-semibold px-3 py-1.5 rounded-lg" style={{background:TS.grapeDeep, color:'#fff'}}>
                  คำนวณ <TIco.Arrow width="11" height="11"/>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* === COMPARISON DOCK (sticky bottom) === */}
      <div className="absolute left-6 right-6 bottom-6 ts-pop-in" style={{ zIndex: 5 }}>
        <div className="ts-card" style={{
          padding: expanded ? 0 : '14px 18px',
          borderColor: TS.violet500,
          boxShadow: '0 -8px 32px -16px rgba(85,65,139,0.4), 0 1px 0 rgba(85,65,139,0.04)'
        }}>
          {!expanded ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:TS.violet500, color:'#fff'}}><TIco.Sparkle size={14}/></span>
                <div>
                  <p className="thai text-[12px] font-bold" style={{color: TS.grapeDeep}}>เปรียบเทียบ {pinned.length}/3</p>
                  <p className="thai text-[10.5px]" style={{color: TS.inkMute}}>ปักหมุดได้สูงสุด 3 หลักสูตร</p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2">
                {[0,1,2].map(i => {
                  const p = PROGRAMS.find(x => x.id === pinned[i]);
                  return (
                    <div key={i} className="flex-1 rounded-lg px-3 py-2 flex items-center gap-2" style={{
                      background: p ? '#fff' : 'rgba(85,65,139,0.04)',
                      border: `1px dashed ${p ? 'transparent' : 'rgba(85,65,139,0.2)'}`,
                      borderStyle: p ? 'solid' : 'dashed',
                      borderWidth: 1,
                      borderColor: p ? 'rgba(85,65,139,0.12)' : 'rgba(85,65,139,0.2)'
                    }}>
                      {p ? (
                        <>
                          <span className="w-1 self-stretch rounded-full" style={{background: [TS.violet500, TS.taupe, TS.periwinkle][i]}}></span>
                          <div className="flex-1 min-w-0">
                            <p className="thai text-[11px] font-medium truncate" style={{color: TS.grapeDeep}}>{p.uni} · {p.name}</p>
                            <p className="thai text-[10px]" style={{color: TS.inkMute}}>min {p.history.min} · mean {p.history.mean}</p>
                          </div>
                          <button onClick={() => togglePin(p.id)} className="text-[12px]" style={{color: TS.inkMute}}><TIco.X/></button>
                        </>
                      ) : (
                        <p className="thai text-[11px] text-center w-full" style={{color: TS.inkMute}}>+ ช่อง {i+1}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setExpanded(true)}
                disabled={pinned.length < 2}
                className="inline-flex items-center gap-2 thai text-[12.5px] font-bold px-5 py-2.5 rounded-xl"
                style={{
                  background: pinned.length >= 2 ? TS.violet500 : 'rgba(85,65,139,0.12)',
                  color: pinned.length >= 2 ? '#fff' : TS.inkMute,
                  cursor: pinned.length >= 2 ? 'pointer' : 'not-allowed'
                }}>
                เปรียบเทียบเลย <TIco.Arrow width="13" height="13"/>
              </button>
            </div>
          ) : (
            <ComparisonOverlay pinned={pinned} onClose={() => setExpanded(false)} togglePin={togglePin}/>
          )}
        </div>
      </div>
    </div>
  );
}

function ComparisonOverlay({ pinned, onClose, togglePin }) {
  const items = pinned.map(id => PROGRAMS.find(p => p.id === id)).filter(Boolean);
  const rowColors = [TS.violet500, TS.taupe, TS.periwinkle];
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:TS.violet500, color:'#fff'}}><TIco.Sparkle size={14}/></span>
          <h3 className="thai text-[15px] font-bold" style={{color: TS.grapeDeep}}>เปรียบเทียบ {items.length} หลักสูตร</h3>
        </div>
        <button onClick={onClose} className="thai text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{background: TS.grapeSoft, color: TS.grapeDeep}}>
          ย่อกลับ
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${items.length}, 1fr)` }}>
        {/* headers */}
        <div></div>
        {items.map((p, i) => (
          <div key={p.id} className="px-3 pb-3" style={{borderBottom: `2px solid ${rowColors[i]}`}}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background: rowColors[i], color:'#fff'}}>{p.uni}</span>
              <button onClick={() => togglePin(p.id)} className="text-[11px]" style={{color: TS.inkMute}}><TIco.X/></button>
            </div>
            <p className="thai text-[10.5px]" style={{color: TS.periwinkle}}>{p.faculty}</p>
            <p className="thai text-[13.5px] font-bold leading-tight" style={{color: TS.grapeDeep}}>{p.name}</p>
          </div>
        ))}
        {/* rows */}
        {[
          { label: 'คะแนน min', key: p => p.history.min, suffix:'', tone:'risky' },
          { label: 'คะแนน mean', key: p => p.history.mean, suffix:'' },
          { label: 'คะแนน max', key: p => p.history.max, suffix:'', tone:'competitive' },
          { label: 'GPAX ขั้นต่ำ', key: p => p.minGpax, suffix:'' },
          { label: 'ที่นั่ง', key: p => p.seats, suffix:' คน' },
          { label: 'เกณฑ์ขั้นต่ำ %', key: p => p.minPct, suffix:'%' }
        ].map((row, ri) => (
          <React.Fragment key={ri}>
            <div className="py-2.5 thai text-[11.5px]" style={{color: TS.inkMute, borderTop: '1px dashed rgba(85,65,139,0.12)'}}>{row.label}</div>
            {items.map((p, i) => {
              const v = row.key(p);
              return (
                <div key={p.id} className="py-2.5 px-3 num text-[13.5px] font-bold" style={{
                  color: row.tone === 'risky' ? TS.risky : row.tone === 'competitive' ? TS.competitive : TS.ink,
                  borderTop: '1px dashed rgba(85,65,139,0.12)'
                }}>{v}{row.suffix}</div>
              );
            })}
          </React.Fragment>
        ))}
        {/* weights row */}
        <div className="py-3 thai text-[11.5px]" style={{color: TS.inkMute, borderTop: '1px dashed rgba(85,65,139,0.12)'}}>วิชาที่ใช้</div>
        {items.map((p, i) => (
          <div key={p.id} className="py-3 px-3" style={{borderTop: '1px dashed rgba(85,65,139,0.12)'}}>
            <div className="flex h-1.5 rounded-full overflow-hidden mb-2" style={{background: '#F2EEF6'}}>
              {p.weights.map((w, wi) => (
                <div key={w.c} style={{width: `${w.w}%`, background: [TS.violet500, TS.periwinkle, TS.taupe, TS.accent600, TS.competitive, TS.borderline][wi % 6]}}></div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {p.weights.map(w => (
                <span key={w.c} className="thai text-[10px] px-1.5 py-0.5 rounded" style={{background: '#F5F2FA', color: TS.inkSoft}}>
                  {w.l} <span className="num font-bold" style={{color: TS.grapeDeep}}>{w.w}%</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end mt-4 pt-3 ts-hairline">
        <button className="inline-flex items-center gap-2 thai text-[12.5px] font-bold px-5 py-2.5 rounded-xl" style={{background:TS.grapeDeep, color:'#fff'}}>
          คำนวณคะแนนทั้ง {items.length} หลักสูตร <TIco.Arrow width="13" height="13"/>
        </button>
      </div>
    </div>
  );
}

window.SearchV1Pin = SearchV1Pin;
