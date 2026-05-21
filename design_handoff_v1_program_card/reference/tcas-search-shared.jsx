// ============================================================
// Shared palette, icons, mock data, and utilities for
// TCAS Search Page variations.
// Exported to window at the end so other Babel scripts can use.
// ============================================================

const TS = {
  // Brand violet palette (from packages/config/tailwind/preset.ts)
  smoke:       '#F5F5F4',
  cream:       '#FAF6F5',
  mist:        '#F2EEF6',
  dusk:        '#ECE2E5',
  blush:       '#E5DBE6',
  taupe:       '#BBA0A0',
  taupeDeep:   '#8E7373',
  taupeSoft:   '#F0E5E5',
  periwinkle:  '#7D80DA',
  periwinkleSoft: '#E5E6F8',
  violet50:    '#C6BFD9',
  violet100:   '#ADA1CE',
  violet200:   '#8E7BC1',
  violet400:   '#664EA7',
  violet500:   '#55418B',   // dusty grape
  violet600:   '#483776',
  grapeDeep:   '#3F2F6B',
  grapeSoft:   '#EDE8F7',
  ink:         '#2A2240',
  inkSoft:     '#5B5176',
  inkMute:     '#8C84A6',
  accent500:   '#F0CB67',   // butter yellow
  accent600:   '#ECBE42',
  // Zone semantic
  risky:       '#E2585A',
  riskySoft:   '#FBE3E4',
  borderline:  '#E5A02F',
  borderlineSoft: '#FBEED3',
  competitive: '#2F9B6E',
  competitiveSoft: '#D5EEE2',
  safe:        '#7D80DA',
  safeSoft:    '#E5E6F8',
};

// ----- Mock programs (mixed NETSAT + TCAS) -----
const PROGRAMS = [
  // ============ NETSAT (KKU R2) ============
  { id:'n1', round:'NETSAT', uni:'มข.', faculty:'วิศวกรรมศาสตร์', name:'วิศวกรรมคอมพิวเตอร์', seats:60, status:'active', minGpax:2.75, minPct:30,
    history:{ year:2568, min:64.2, mean:72.8, max:84.1 },
    weights:[{c:'NETSAT_MATH',l:'คณิตศาสตร์',w:30},{c:'NETSAT_PHY',l:'ฟิสิกส์',w:25},{c:'NETSAT_ENG',l:'อังกฤษ',w:20},{c:'TPAT3',l:'TPAT3',w:25}],
    trend:[58,60,62,64,66,68], popularity: 0.92 },
  { id:'n2', round:'NETSAT', uni:'มข.', faculty:'แพทยศาสตร์', name:'แพทยศาสตรบัณฑิต', seats:32, status:'active', minGpax:3.50, minPct:50,
    history:{ year:2568, min:78.4, mean:82.9, max:91.2 },
    weights:[{c:'NETSAT_BIO',l:'ชีววิทยา',w:25},{c:'NETSAT_CHEM',l:'เคมี',w:25},{c:'NETSAT_PHY',l:'ฟิสิกส์',w:20},{c:'NETSAT_MATH',l:'คณิตศาสตร์',w:15},{c:'NETSAT_ENG',l:'อังกฤษ',w:15}],
    trend:[72,74,76,77,78,79], popularity: 0.98 },
  { id:'n3', round:'NETSAT', uni:'มข.', faculty:'เภสัชศาสตร์', name:'เภสัชศาสตรบัณฑิต', seats:48, status:'active', minGpax:3.25, minPct:40,
    history:{ year:2568, min:70.5, mean:75.2, max:84.8 },
    weights:[{c:'NETSAT_CHEM',l:'เคมี',w:30},{c:'NETSAT_BIO',l:'ชีววิทยา',w:25},{c:'NETSAT_MATH',l:'คณิตศาสตร์',w:20},{c:'NETSAT_ENG',l:'อังกฤษ',w:25}],
    trend:[66,68,69,70,70,71], popularity: 0.85 },
  { id:'n4', round:'NETSAT', uni:'มข.', faculty:'มนุษยศาสตร์', name:'ภาษาอังกฤษ', seats:75, status:'active', minGpax:2.50, minPct:30,
    history:{ year:2568, min:58.2, mean:65.9, max:78.3 },
    weights:[{c:'NETSAT_ENG',l:'อังกฤษ',w:40},{c:'NETSAT_THAI',l:'ภาษาไทย',w:25},{c:'NETSAT_SOC',l:'สังคม',w:20},{c:'TGAT1',l:'TGAT1',w:15}],
    trend:[52,54,55,57,58,58], popularity: 0.71 },
  { id:'n5', round:'NETSAT', uni:'มข.', faculty:'บริหารธุรกิจ', name:'การจัดการธุรกิจ', seats:90, status:'active', minGpax:2.75, minPct:30,
    history:{ year:2568, min:61.0, mean:68.4, max:79.1 },
    weights:[{c:'NETSAT_MATH',l:'คณิตศาสตร์',w:30},{c:'NETSAT_ENG',l:'อังกฤษ',w:25},{c:'NETSAT_SOC',l:'สังคม',w:20},{c:'TGAT2',l:'TGAT2',w:25}],
    trend:[55,57,59,60,61,62], popularity: 0.79 },
  { id:'n6', round:'NETSAT', uni:'มข.', faculty:'วิทยาศาสตร์', name:'วิทยาการคอมพิวเตอร์', seats:60, status:'active', minGpax:2.75, minPct:30,
    history:{ year:2568, min:60.0, mean:67.5, max:78.8 },
    weights:[{c:'NETSAT_MATH',l:'คณิตศาสตร์',w:35},{c:'NETSAT_ENG',l:'อังกฤษ',w:25},{c:'NETSAT_PHY',l:'ฟิสิกส์',w:20},{c:'TPAT3',l:'TPAT3',w:20}],
    trend:[54,56,58,59,60,60], popularity: 0.82 },
  { id:'n7', round:'NETSAT', uni:'มข.', faculty:'มนุษยศาสตร์', name:'เอเชียตะวันออกศึกษา', seats:30, status:'inactive', minGpax:2.50, minPct:30,
    history:{ year:2567, min:55.8, mean:62.1, max:71.2 },
    weights:[{c:'NETSAT_ENG',l:'อังกฤษ',w:30},{c:'NETSAT_SOC',l:'สังคม',w:25},{c:'NETSAT_THAI',l:'ภาษาไทย',w:25},{c:'TGAT1',l:'TGAT1',w:20}],
    trend:[51,53,54,55,55,null], popularity: 0.45 },
  { id:'n8', round:'NETSAT', uni:'มข.', faculty:'นิติศาสตร์', name:'นิติศาสตรบัณฑิต', seats:60, status:'active', minGpax:2.75, minPct:30,
    history:{ year:2568, min:62.5, mean:69.8, max:80.2 },
    weights:[{c:'NETSAT_THAI',l:'ภาษาไทย',w:25},{c:'NETSAT_SOC',l:'สังคม',w:30},{c:'NETSAT_ENG',l:'อังกฤษ',w:20},{c:'TGAT2',l:'TGAT2',w:25}],
    trend:[57,58,60,61,62,63], popularity: 0.74 },
  { id:'n9', round:'NETSAT', uni:'มข.', faculty:'ศึกษาศาสตร์', name:'การสอนภาษาไทย', seats:40, status:'active', minGpax:2.75, minPct:30,
    history:{ year:2568, min:59.2, mean:64.8, max:73.5 },
    weights:[{c:'NETSAT_THAI',l:'ภาษาไทย',w:35},{c:'NETSAT_SOC',l:'สังคม',w:25},{c:'TPAT5',l:'TPAT5',w:25},{c:'TGAT2',l:'TGAT2',w:15}],
    trend:[55,56,57,58,59,59], popularity: 0.62 },

  // ============ TCAS (R3 Admission) ============
  { id:'t1', round:'TCAS', uni:'จุฬาฯ', faculty:'แพทยศาสตร์', name:'แพทยศาสตรบัณฑิต (กสพท)', seats:200, status:'active', minGpax:3.50, minPct:50,
    history:{ year:2568, min:74.8, mean:79.6, max:88.4 },
    weights:[{c:'TPAT1',l:'TPAT1 กสพท',w:30},{c:'A_BIO',l:'A-Level ชีว',w:18},{c:'A_CHEM',l:'A-Level เคมี',w:18},{c:'A_PHY',l:'A-Level ฟิสิกส์',w:12},{c:'A_MATH1',l:'A-Level คณิต',w:12},{c:'TGAT1',l:'TGAT1',w:10}],
    trend:[70,72,73,74,75,76], popularity: 0.99 },
  { id:'t2', round:'TCAS', uni:'จุฬาฯ', faculty:'วิศวกรรมศาสตร์', name:'วิศวกรรมคอมพิวเตอร์', seats:60, status:'active', minGpax:3.00, minPct:30,
    history:{ year:2568, min:71.2, mean:78.1, max:88.6 },
    weights:[{c:'A_MATH1',l:'A-Level คณิต',w:30},{c:'A_PHY',l:'A-Level ฟิสิกส์',w:20},{c:'TPAT3',l:'TPAT3',w:25},{c:'TGAT1',l:'TGAT1',w:15},{c:'TGAT3',l:'TGAT3',w:10}],
    trend:[65,67,68,70,71,72], popularity: 0.96 },
  { id:'t3', round:'TCAS', uni:'จุฬาฯ', faculty:'อักษรศาสตร์', name:'อักษรศาสตร์ (เอกภาษาญี่ปุ่น)', seats:25, status:'active', minGpax:3.00, minPct:30,
    history:{ year:2568, min:68.5, mean:74.2, max:82.0 },
    weights:[{c:'TGAT1',l:'TGAT1 อังกฤษ',w:30},{c:'A_THAI',l:'A-Level ไทย',w:20},{c:'A_SOC',l:'A-Level สังคม',w:20},{c:'A_JAP',l:'A-Level ญี่ปุ่น',w:30}],
    trend:[63,65,66,67,68,68], popularity: 0.81 },
  { id:'t4', round:'TCAS', uni:'มหิดล', faculty:'แพทยศาสตร์ศิริราช', name:'แพทยศาสตรบัณฑิต', seats:260, status:'active', minGpax:3.50, minPct:50,
    history:{ year:2568, min:75.4, mean:80.2, max:90.5 },
    weights:[{c:'TPAT1',l:'TPAT1 กสพท',w:30},{c:'A_BIO',l:'A-Level ชีว',w:18},{c:'A_CHEM',l:'A-Level เคมี',w:18},{c:'A_PHY',l:'A-Level ฟิสิกส์',w:12},{c:'A_MATH1',l:'A-Level คณิต',w:12},{c:'TGAT1',l:'TGAT1',w:10}],
    trend:[71,73,74,75,75,76], popularity: 0.98 },
  { id:'t5', round:'TCAS', uni:'ธรรมศาสตร์', faculty:'พาณิชยศาสตร์', name:'บัญชี (BBA นานาชาติ)', seats:120, status:'active', minGpax:3.00, minPct:30,
    history:{ year:2568, min:69.8, mean:75.6, max:84.4 },
    weights:[{c:'TGAT1',l:'TGAT1 อังกฤษ',w:30},{c:'TGAT2',l:'TGAT2',w:20},{c:'A_MATH1',l:'A-Level คณิต',w:30},{c:'A_SOC',l:'A-Level สังคม',w:20}],
    trend:[64,66,67,68,69,70], popularity: 0.88 },
  { id:'t6', round:'TCAS', uni:'มก.', faculty:'วิศวกรรมศาสตร์', name:'วิศวกรรมเครื่องกล', seats:90, status:'active', minGpax:2.75, minPct:30,
    history:{ year:2568, min:62.4, mean:69.8, max:81.0 },
    weights:[{c:'A_MATH1',l:'A-Level คณิต',w:30},{c:'A_PHY',l:'A-Level ฟิสิกส์',w:25},{c:'TPAT3',l:'TPAT3',w:25},{c:'TGAT1',l:'TGAT1',w:10},{c:'TGAT3',l:'TGAT3',w:10}],
    trend:[57,59,60,61,62,63], popularity: 0.78 },
  { id:'t7', round:'TCAS', uni:'มข.', faculty:'ทันตแพทยศาสตร์', name:'ทันตแพทยศาสตรบัณฑิต', seats:50, status:'active', minGpax:3.25, minPct:50,
    history:{ year:2568, min:72.1, mean:77.8, max:86.2 },
    weights:[{c:'TPAT1',l:'TPAT1 กสพท',w:30},{c:'A_BIO',l:'A-Level ชีว',w:18},{c:'A_CHEM',l:'A-Level เคมี',w:18},{c:'A_PHY',l:'A-Level ฟิสิกส์',w:12},{c:'A_MATH1',l:'A-Level คณิต',w:12},{c:'TGAT1',l:'TGAT1',w:10}],
    trend:[68,69,70,71,71,72], popularity: 0.93 },
  { id:'t8', round:'TCAS', uni:'ม.เกษตร', faculty:'มนุษยศาสตร์', name:'ภาษาเกาหลี', seats:40, status:'active', minGpax:2.75, minPct:30,
    history:{ year:2568, min:65.8, mean:71.2, max:79.5 },
    weights:[{c:'TGAT1',l:'TGAT1 อังกฤษ',w:25},{c:'A_THAI',l:'A-Level ไทย',w:20},{c:'A_SOC',l:'A-Level สังคม',w:25},{c:'A_KOR',l:'A-Level เกาหลี',w:30}],
    trend:[60,62,63,64,65,66], popularity: 0.83 }
];

// ----- Icons (small, focused set) -----
const TIco = {
  Logo: (p) => (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" {...p}>
      <path d="M6 24 L9 8 L13 22 L16 14 L19 22 L23 8 L26 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Search: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>),
  Filter: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6h16M7 12h10M10 18h4"/></svg>),
  Pin: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 17v4M9 3h6l-1 6 3 3H7l3-3-1-6z"/></svg>),
  PinFilled: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 17v4M9 3h6l-1 6 3 3H7l3-3-1-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  Arrow: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>),
  X: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M6 6l12 12M6 18L18 6"/></svg>),
  Check: (p) => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="4 12 10 18 20 6"/></svg>),
  Sparkle: ({ size=12, ...p }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 1 L14 9.5 L22.5 12 L14 14.5 L12 23 L10 14.5 L1.5 12 L10 9.5 Z"/></svg>),
  Calc: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h.01M16 11h.01M8 15h2M12 15h.01M16 15h.01M8 19h2"/></svg>),
  Bookmark: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 3h12v18l-6-4-6 4z"/></svg>),
  ChevL: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="15 18 9 12 15 6"/></svg>),
  ChevR: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="9 18 15 12 9 6"/></svg>),
  Heart: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z"/></svg>),
  Skip: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 5l7 7-7 7M12 5l7 7-7 7"/></svg>),
  Dot: (p) => (<svg width="6" height="6" viewBox="0 0 6 6" {...p}><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>),
  Eye: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>)
};

// ----- Computed helpers -----
// Compute weighted score given a program + user scores
function computeWeighted(program, scores) {
  let total = 0;
  let known = 0;
  let totalWeight = 0;
  program.weights.forEach(w => {
    totalWeight += w.w;
    const s = scores[w.c];
    if (s != null && !isNaN(s)) {
      total += (s * w.w) / 100;
      known += w.w;
    }
  });
  if (known === 0) return null;
  // Scale to "if all subjects were filled in"
  return { score: total / totalWeight * 100, knownPct: known / totalWeight };
}

// Zone classification
function classifyZone(score, history) {
  if (!history || score == null) return 'unknown';
  const { min, max, mean } = history;
  if (score < min) return 'risky';
  const span = max - min;
  if (score < min + span * 0.30) return 'borderline';
  if (score < min + span * 0.70) return 'competitive';
  return 'safe';
}
const ZONE_META = {
  risky:       { label:'เสี่ยง',    color:TS.risky,       soft:TS.riskySoft,        emoji:'⚠️' },
  borderline:  { label:'ลุ้น',      color:TS.borderline,  soft:TS.borderlineSoft,   emoji:'🟡' },
  competitive: { label:'น่าจะติด',  color:TS.competitive, soft:TS.competitiveSoft,  emoji:'🟢' },
  safe:        { label:'มั่นใจ',    color:TS.safe,        soft:TS.safeSoft,         emoji:'🟦' },
  unknown:     { label:'ยังไม่รู้', color:TS.inkMute,    soft:'#EFEDEC',           emoji:'❓' }
};

// ----- Brand Tab Switcher (NETSAT | TCAS) -----
function BrandTab({ value, onChange }) {
  const tabs = [
    { v:'NETSAT', label:'NETSAT', sub:'มข. รอบ 2 โควตา' },
    { v:'TCAS',   label:'TCAS',   sub:'รอบ 3 Admission' }
  ];
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ background: TS.grapeSoft, border: `1px solid ${TS.violet50}`}}>
      {tabs.map(t => {
        const on = t.v === value;
        return (
          <button key={t.v} onClick={() => onChange(t.v)}
            className="flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold transition"
            style={{
              background: on ? TS.violet500 : 'transparent',
              color: on ? '#fff' : TS.grapeDeep,
              boxShadow: on ? '0 6px 14px -6px rgba(85,65,139,0.5)' : 'none'
            }}>
            <span className="thai" style={{letterSpacing:'-0.01em'}}>{t.label}</span>
            <span className="text-[11px] thai font-normal" style={{ opacity: on ? 0.85 : 0.55 }}>{t.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

// Small sparkline (history trend)
function Spark({ values, color = TS.violet500, w = 60, h = 18 }) {
  const vals = values.filter(v => v != null);
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = v == null ? null : h - ((v - min) / span) * (h - 4) - 2;
    return y == null ? null : `${x.toFixed(1)},${y.toFixed(1)}`;
  }).filter(Boolean).join(' ');
  return (
    <svg width={w} height={h} className="block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {values.map((v, i) => v == null ? null : {
        x: (i / (values.length - 1)) * w,
        y: h - ((v - min) / span) * (h - 4) - 2
      }).filter(Boolean).map((p, i, arr) => i === arr.length - 1
        ? <circle key={i} cx={p.x} cy={p.y} r="2" fill={color}/>
        : null)}
    </svg>
  );
}

// Brand-styled chip
function BrandChip({ active, color, soft, children, onClick, size='md' }) {
  const sizes = { sm: 'text-[11px] px-2.5 py-1', md: 'text-[12px] px-3 py-1.5' };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full font-medium transition ${sizes[size]}`}
      style={{
        background: active ? (color || TS.violet500) : (soft || '#fff'),
        color: active ? '#fff' : (color || TS.grapeDeep),
        border: `1px solid ${active ? (color || TS.violet500) : 'rgba(85,65,139,0.14)'}`
      }}>
      {children}
    </button>
  );
}

// Status badge (active / inactive)
function StatusBadge({ status }) {
  if (status === 'inactive') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
        style={{ background: TS.taupeSoft, color: TS.taupeDeep, border:`1px solid ${TS.taupe}55`}}>
        <span style={{fontSize:8}}>📁</span> ไม่เปิดปีนี้
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: TS.competitiveSoft, color: TS.competitive }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{background: TS.competitive}}></span> เปิดรับ {program_thaiYear()}
    </span>
  );
}
function program_thaiYear() { return '2569'; }

// Inject base styles once
if (typeof document !== 'undefined' && !document.getElementById('tcas-search-styles')) {
  const s = document.createElement('style');
  s.id = 'tcas-search-styles';
  s.textContent = `
    .ts-page { font-family: 'Plus Jakarta Sans', 'IBM Plex Sans Thai', system-ui, sans-serif; color: ${TS.ink}; -webkit-font-smoothing: antialiased; }
    .ts-page .thai { font-family: 'IBM Plex Sans Thai', 'Plus Jakarta Sans', sans-serif; }
    .ts-page .num { font-feature-settings: "tnum", "lnum"; }
    .ts-card { background:#fff; border-radius: 18px; border: 1px solid rgba(85,65,139,0.08); box-shadow: 0 1px 0 rgba(85,65,139,0.04), 0 12px 28px -18px rgba(85,65,139,0.25); }
    .ts-glass { background: rgba(255,255,255,0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.9); border-radius: 22px; box-shadow: 0 18px 40px -22px rgba(85,65,139,0.25); }
    .ts-hairline { border-top: 1px dashed rgba(85,65,139,0.15); }
    .ts-bg {
      background:
        radial-gradient(60% 50% at 92% 8%, rgba(229,219,230,0.55) 0%, rgba(229,219,230,0) 60%),
        radial-gradient(50% 45% at 6% 22%, rgba(187,160,160,0.30) 0%, rgba(187,160,160,0) 62%),
        radial-gradient(55% 50% at 95% 92%, rgba(125,128,218,0.20) 0%, rgba(125,128,218,0) 60%),
        linear-gradient(180deg, ${TS.cream} 0%, ${TS.mist} 60%, ${TS.dusk} 100%);
    }
    .ts-lift { transition: transform .2s ease, box-shadow .2s ease; }
    .ts-lift:hover { transform: translateY(-2px); }
    .ts-input { border: 1px solid rgba(85,65,139,0.18); border-radius: 10px; padding: 8px 12px; font-size: 13px; color: ${TS.ink}; background:#fff; outline: none; }
    .ts-input:focus { border-color: ${TS.violet500}; box-shadow: 0 0 0 3px rgba(240,203,103,0.25); }
    .ts-pop-in { animation: tsPopIn .25s cubic-bezier(.2,.7,.3,1); }
    @keyframes tsPopIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  `;
  document.head.appendChild(s);
}

// Export to window so other Babel scripts can read these
Object.assign(window, {
  TS, TIco, PROGRAMS, BrandTab, Spark, BrandChip, StatusBadge,
  computeWeighted, classifyZone, ZONE_META
});
