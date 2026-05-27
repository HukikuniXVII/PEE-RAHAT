// ============================================================
// Community page — shared palette, icons, mock data, subcomponents.
// Mirrors tcas-search-shared.jsx structure but scoped under CS.* to
// avoid colliding with TS.* on the same canvas host.
// ============================================================

const CS = {
  smoke:       '#F5F5F4',
  cream:       '#FAF6F5',
  mist:        '#F2EEF6',
  dusk:        '#ECE2E5',
  blush:       '#E5DBE6',
  taupe:       '#BBA0A0',
  taupeDeep:   '#8E7373',
  taupeSoft:   '#F0E5E5',
  periwinkle:  '#7D80DA',
  periwinkleSoft:'#E5E6F8',
  violet50:    '#C6BFD9',
  violet100:   '#ADA1CE',
  violet200:   '#8E7BC1',
  violet500:   '#55418B',
  violet600:   '#483776',
  grapeDeep:   '#3F2F6B',
  grapeSoft:   '#EDE8F7',
  ink:         '#2A2240',
  inkSoft:     '#5B5176',
  inkMute:     '#8C84A6',
  accent500:   '#F0CB67',
  accent600:   '#ECBE42',
  rose:        '#D9436E',
  rosePink:    '#FBC0D2',
  emerald:     '#2F9B6E',
  emeraldSoft: '#D5EEE2'
};

// ----- AVATARS palette ----- 
// Deterministic color by first char so the same user looks consistent.
function avatarBg(initial) {
  const bag = [CS.violet500, CS.periwinkle, CS.taupe, CS.taupeDeep, CS.emerald, CS.rose, CS.grapeDeep, CS.accent600];
  let h = 0;
  for (let i = 0; i < initial.length; i++) h = (h * 31 + initial.charCodeAt(i)) >>> 0;
  return bag[h % bag.length];
}

function Avatar({ name, size = 40, badge }) {
  const initial = (name || '?').replace(/^พี่/, '').replace(/^น้อง/, '').slice(0, 1);
  return (
    <div className="relative shrink-0" style={{width: size, height: size}}>
      <div className="rounded-full flex items-center justify-center text-white font-bold thai"
        style={{
          width: size, height: size,
          background: avatarBg(initial),
          fontSize: Math.max(13, size * 0.42)
        }}>
        {initial}
      </div>
      {badge && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
          style={{
            width: Math.max(12, size * 0.32),
            height: Math.max(12, size * 0.32),
            background: CS.accent500,
            border: '1.5px solid #fff',
            color: CS.grapeDeep,
            fontSize: Math.max(7, size * 0.18),
            fontWeight: 700
          }}>
          ✓
        </span>
      )}
    </div>
  );
}

function UniBadge({ uni, verified = true, size = 'md' }) {
  const sizes = {
    sm: { px: 'px-1.5 py-0', fs: 10, gap: 'gap-1' },
    md: { px: 'px-2 py-0.5', fs: 10.5, gap: 'gap-1.5' }
  }[size];
  return (
    <span className={`thai inline-flex items-center ${sizes.gap} ${sizes.px} rounded-full font-medium`}
      style={{
        background: verified ? CS.periwinkleSoft : CS.taupeSoft,
        color: verified ? CS.violet500 : CS.taupeDeep,
        fontSize: sizes.fs
      }}>
      {verified && <span style={{fontSize: 9}}>✓</span>}
      {uni}
    </span>
  );
}

// ----- ICONS (compact, line-style) -----
const CIco = {
  Logo: (p) => (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" {...p}>
      <path d="M6 24 L9 8 L13 22 L16 14 L19 22 L23 8 L26 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Home: (p) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>),
  Search: (p) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>),
  Bell: (p) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>),
  Mail: (p) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>),
  Bookmark: ({fill='none', ...p}) => (<svg width="20" height="20" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 3h12v18l-6-4-6 4z"/></svg>),
  User: (p) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>),
  Groups: (p) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="9" r="3.2"/><circle cx="17" cy="10" r="2.6"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M14 20c0-2.4 2-4.4 4.4-4.4 1 0 1.9.3 2.6.9"/></svg>),
  More: (p) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><circle cx="5" cy="12" r="0.5"/><circle cx="12" cy="12" r="0.5"/><circle cx="19" cy="12" r="0.5"/></svg>),
  Plus: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>),
  Comment: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12a8 8 0 0 1-12.6 6.5L3 21l2.5-5.4A8 8 0 1 1 21 12z"/></svg>),
  Repost: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 2l4 4-4 4"/><path d="M3 10V8a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 14v2a4 4 0 0 1-4 4H3"/></svg>),
  Heart: ({fill='none', ...p}) => (<svg width="17" height="17" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z"/></svg>),
  Eye: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>),
  Share: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12v8h16v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>),
  Image: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="9" cy="9" r="1.5"/><path d="M21 16l-5-5-9 9"/></svg>),
  Smile: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="0.6"/><circle cx="15" cy="10" r="0.6"/><path d="M8 14.5c1.2 1.5 2.6 2.2 4 2.2s2.8-.7 4-2.2"/></svg>),
  Poll: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="14" width="3.5" height="6"/><rect x="10" y="9" width="3.5" height="11"/><rect x="16" y="4" width="3.5" height="16"/></svg>),
  Calendar: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>),
  Pin: (p) => (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 17v4M9 3h6l-1 6 3 3H7l3-3-1-6z"/></svg>),
  TrendUp: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>),
  Hash: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>),
  Sparkle: ({size=12, ...p}) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 1 L14 9.5 L22.5 12 L14 14.5 L12 23 L10 14.5 L1.5 12 L10 9.5 Z"/></svg>),
  Verified: ({size=14, ...p}) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2L14.5 4.5L18 4L19 7.5L22 9L20.5 12L22 15L19 16.5L18 20L14.5 19.5L12 22L9.5 19.5L6 20L5 16.5L2 15L3.5 12L2 9L5 7.5L6 4L9.5 4.5Z"/><polyline points="8 12 11 15 16 9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Globe: (p) => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2c3 3 4.5 6.5 4.5 10S15 19 12 22M12 2c-3 3-4.5 6.5-4.5 10S9 19 12 22"/></svg>)
};

// ----- MOCK POSTS -----
const POSTS = [
  {
    id: 1,
    author:  { name:'พี่กิ๊ฟ',  uni:'มหิดล แพทย์ ปี 4', verified:true, handle:'@gift_med' },
    when:    '2 ชม.',
    pinned:  true,
    tag:     '#ถามพี่หมอ',
    body:    'สรุปสั้น ๆ TPAT1 ปีนี้ ออกหนักพาร์ท critical thinking มากกว่าเดิม ลองแบ่งโจทย์เป็น 4 หมวด:\n• เชาวน์เลข - 30%\n• เชิงตรรกะ - 35%\n• จริยธรรมแพทย์ - 25%\n• การคิดวิเคราะห์ - 10%\n\nใครเตรียมตัวมาดี ๆ ไม่น่าหลุดเกิน 60 นะคะ ✨',
    images:  [],
    likes:   142,
    comments:38,
    reposts: 24,
    views:   8420,
    bookmarks:67,
    liked:   true,
    bookmarked:false,
    topReplies: [
      { author:'พี่บีม', uni:'มศว แพทย์ ปี 3', verified:true, when:'1 ชม.', body:'เห็นด้วยค่ะ + ข้อสอบมีเทรนด์ออกเคสจริงเยอะขึ้น ลองอ่านข่าวการแพทย์รายสัปดาห์', likes:14 },
      { author:'น้อง Pim', uni:'ม.ปลาย', when:'45 นาที', body:'ขอบคุณพี่มากค่าาา ตอนนี้พึ่งทำได้ 45 จะลองตามแนวพี่ดูค่ะ 🙏', likes:6 }
    ]
  },
  {
    id: 2,
    author:  { name:'น้อง Pim',  uni:'ม.ปลาย', verified:false, handle:'@pim06' },
    when:    '5 ชม.',
    tag:     '#ถามพี่หมอ',
    body:    'พี่คะ พอดีตอนนี้เหลืออีก 4 เดือน ก่อนสอบเข้าแพทย์ แต่ยังไม่เคยทำข้อสอบเก่าจริงจังเลย ควรเริ่มยังไงดีคะ + ใครมีลิสต์หนังสือที่ใช้จริง ช่วยแชร์หน่อยได้ไหมคะ 🥺',
    images:  [],
    likes:   34,
    comments:18,
    reposts: 2,
    views:   1840,
    bookmarks:23,
    liked:   false,
    bookmarked:true,
    topReplies: [
      { author:'พี่กิ๊ฟ', uni:'มหิดล แพทย์ ปี 4', verified:true, when:'4 ชม.', body:'เริ่มจากของ 2 ปีล่าสุดก่อนเลยค่ะ ทำเป็นชุดเหมือนสอบจริง จับเวลา 3 ชม. ทำเสร็จค่อยเช็ค', likes:22 }
    ]
  },
  {
    id: 3,
    author:  { name:'พี่นิว',  uni:'จุฬาฯ วิศวะคอม ปี 3', verified:true, handle:'@new_cu_eng' },
    when:    '8 ชม.',
    tag:     '#ขายชีท',
    body:    'แบ่งชีทสรุป A-Level คณิตประยุกต์ 1 ที่ทำเอง ตอนเตรียมสอบ TCAS68 ค่ะ\n— 180 หน้า + พรีวิว 8 หน้า\n— เน้นสรุปสูตร + โจทย์ออกบ่อย\n— ราคา 290 บาท (ลด 30% สำหรับน้อง ม.ปลาย)',
    images:  ['sheet'],
    embed:   {
      kind: 'sheet',
      title: 'A-Level คณิตประยุกต์ 1 · สรุป + 200 ข้อ',
      sub: 'พี่นิว · จุฬาฯ วิศวะคอม',
      price: 290, original: 420,
      rating: 4.92, reviewCount: 38
    },
    likes:   89,
    comments:14,
    reposts: 11,
    views:   3240,
    bookmarks:56,
    liked:   false,
    bookmarked:false,
    topReplies: []
  },
  {
    id: 4,
    author:  { name:'พี่ฝน',  uni:'จุฬาฯ Econ ปี 1', verified:true, handle:'@fon_econ' },
    when:    '11 ชม.',
    tag:     '#แชร์ประสบการณ์',
    body:    'สรุปการเตรียมตัวสอบเข้า Econ จุฬา รอบ 3 — ใช้ TGAT, TPAT3, A-Level Math, Eng, Soc\n\nคำแนะนำสั้น ๆ:\n1. TGAT3 (สมรรถนะ) อย่าทิ้ง - คนมักไปทิ้งเพราะคิดว่าง่าย\n2. A-Level Eng - อ่าน Economist รายสัปดาห์ตั้งแต่ ม.5\n3. โฟกัสคะแนนรวม > คะแนนรายวิชา',
    images:  [],
    poll: {
      question: 'อยากให้พี่ทำคลิปสรุปเรื่องไหนก่อน?',
      options: [
        { label:'วิธีอ่าน Economist สำหรับ A-Level Eng', votes: 124 },
        { label:'TGAT3 สมรรถนะ ออกอะไรบ้าง',          votes: 89 },
        { label:'Portfolio Econ จุฬา ใช้กิจกรรมแบบไหน', votes: 67 },
        { label:'สาย Econ vs Business ต่างยังไง',     votes: 42 }
      ],
      voted: 0, total: 322, endsIn: '2 วัน'
    },
    likes:   201,
    comments:42,
    reposts: 18,
    views:   5680,
    bookmarks:91,
    liked:   true,
    bookmarked:true,
    topReplies: [
      { author:'น้อง Boss', uni:'ม.ปลาย', when:'8 ชม.', body:'ขอบคุณพี่มากค่ะ! กดติดตามไว้แล้ว 🙌', likes:9 }
    ]
  },
  {
    id: 5,
    author:  { name:'พี่โอ๊ต',  uni:'ธรรมศาสตร์ บัญชี ปี 2', verified:true, handle:'@oat_acc' },
    when:    '1 วัน',
    tag:     '#ถามพี่บัญชี',
    body:    'มีน้องคนไหนสนใจติว TGAT บ้างคะ ตอนนี้รับนักเรียนกลุ่มเล็ก (3-4 คน) เน้นการคิดวิเคราะห์เชิงธุรกิจ ราคา 350 บาท/ชม. คิดเรท friend price สำหรับมาเรียนเป็นกลุ่มค่ะ',
    embed:   {
      kind: 'tutor',
      name: 'พี่โอ๊ต',
      uni: 'ธรรมศาสตร์ บัญชี',
      subjects: ['TGAT', 'A-Level บัญชี'],
      rate: 350,
      rating: 4.88, reviewCount: 24
    },
    likes:   45,
    comments:8,
    reposts: 3,
    views:   1290,
    bookmarks:19,
    liked:   false,
    bookmarked:false,
    topReplies: []
  },
  {
    id: 6,
    author:  { name:'น้อง Boss', uni:'ม.ปลาย', verified:false, handle:'@boss_m5' },
    when:    '1 วัน',
    tag:     '#ถามพี่ทันตะ',
    body:    'ตอนนี้ ม.5 อยากเริ่ม A-Level เคมีจากศูนย์ครับ พี่ ๆ ที่ติดทันตะ/เภสัช เริ่มจากบทไหนก่อนดีครับ Organic หรือ Inorganic? และมีคลิปแนะนำของฟรีบ้างไหมครับ',
    images:  [],
    likes:   12,
    comments:5,
    reposts: 0,
    views:   480,
    bookmarks:8,
    liked:   false,
    bookmarked:false,
    topReplies: []
  }
];

// ----- TRENDING & SUGGESTIONS -----
const TRENDING = [
  { tag: 'TPAT1',           cat: 'เทรนด์ในกลุ่ม ม.ปลาย',     count: '2,840 โพสต์' },
  { tag: 'A-Level เคมี',     cat: 'เทรนด์ในวิชา A-Level',     count: '1,920 โพสต์' },
  { tag: 'NETSAT 2569',      cat: 'เทรนด์ใน Pee Rahat',       count: '1,440 โพสต์' },
  { tag: 'Portfolio',        cat: 'เทรนด์ในกลุ่ม TCAS รอบ 1', count: '980 โพสต์'   },
  { tag: 'พี่หมอจุฬา',       cat: 'รุ่นพี่ที่ถูกค้นหา',         count: '720 โพสต์'   }
];

const SUGGESTED_TUTORS = [
  { name: 'พี่กิ๊ฟ',  uni: 'มหิดล แพทย์ ปี 4',     subj: 'TPAT1, Bio',     rate: 600, rating: 4.95, followers: '12.4k' },
  { name: 'พี่นิว',   uni: 'จุฬาฯ วิศวะคอม ปี 3',   subj: 'A-Level Math',   rate: 450, rating: 4.92, followers: '8.9k'  },
  { name: 'พี่โอ๊ต',  uni: 'ธรรมศาสตร์ บัญชี ปี 2',  subj: 'TGAT, บัญชี',    rate: 350, rating: 4.88, followers: '5.6k'  }
];

const ACTIVE_NOW = [
  { name:'พี่กิ๊ฟ',  uni:'มหิดล แพทย์',     status:'กำลังตอบ #ถามพี่หมอ' },
  { name:'พี่นิว',   uni:'จุฬาฯ วิศวะ',      status:'ออนไลน์' },
  { name:'พี่ฝน',    uni:'จุฬาฯ Econ',      status:'ออนไลน์' }
];

const TAB_FILTERS = ['สำหรับคุณ', 'กำลังติดตาม', 'ถาม-ตอบ', 'ขายชีท', 'ประสบการณ์'];

// ----- HELPERS -----
function fmtCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(n);
}

// Base styles (one-time injection)
if (typeof document !== 'undefined' && !document.getElementById('cs-community-styles')) {
  const s = document.createElement('style');
  s.id = 'cs-community-styles';
  s.textContent = `
    .cs-page { font-family: 'Plus Jakarta Sans', 'IBM Plex Sans Thai', system-ui, sans-serif; color: ${CS.ink}; -webkit-font-smoothing: antialiased; }
    .cs-page .thai { font-family: 'IBM Plex Sans Thai', 'Plus Jakarta Sans', sans-serif; }
    .cs-page .num  { font-feature-settings: "tnum", "lnum"; }
    .cs-page button { font-family: inherit; }
    .cs-bg {
      background:
        radial-gradient(60% 50% at 92% 4%, rgba(229,219,230,0.55) 0%, rgba(229,219,230,0) 60%),
        radial-gradient(50% 45% at 6% 22%, rgba(187,160,160,0.20) 0%, rgba(187,160,160,0) 62%),
        radial-gradient(55% 50% at 95% 92%, rgba(125,128,218,0.15) 0%, rgba(125,128,218,0) 60%),
        linear-gradient(180deg, ${CS.cream} 0%, ${CS.mist} 60%, ${CS.dusk} 100%);
    }
    .cs-card { background:#fff; border-radius: 20px; border: 1px solid rgba(85,65,139,0.08); box-shadow: 0 1px 0 rgba(85,65,139,0.04), 0 12px 28px -18px rgba(85,65,139,0.22); }
    .cs-hairline { border-top: 1px solid rgba(85,65,139,0.08); }
    .cs-hairline-d { border-top: 1px dashed rgba(85,65,139,0.14); }
    .cs-link { color: ${CS.violet500}; }
    .cs-link:hover { text-decoration: underline; text-underline-offset: 2px; }
    .cs-iconbtn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 10px; border-radius: 999px; color: ${CS.inkMute};
      transition: background .15s ease, color .15s ease;
    }
    .cs-iconbtn:hover { background: ${CS.grapeSoft}; color: ${CS.grapeDeep}; }
    .cs-iconbtn[data-on="true"] { color: ${CS.violet500}; }
    .cs-iconbtn[data-tone="heart"]:hover  { color: ${CS.rose};    background: ${CS.rosePink}40; }
    .cs-iconbtn[data-tone="heart"][data-on="true"]  { color: ${CS.rose}; }
    .cs-iconbtn[data-tone="repost"]:hover { color: ${CS.emerald}; background: ${CS.emeraldSoft}; }
    .cs-iconbtn[data-tone="repost"][data-on="true"] { color: ${CS.emerald}; }
    .cs-iconbtn[data-tone="comment"]:hover { color: ${CS.periwinkle}; background: ${CS.periwinkleSoft}; }
    .cs-iconbtn[data-tone="bookmark"]:hover { color: ${CS.accent600}; background: ${CS.accent500}30; }
    .cs-iconbtn[data-tone="bookmark"][data-on="true"] { color: ${CS.accent600}; }
    .cs-tab { padding: 14px 16px; font-size: 13.5px; font-weight: 600; color: ${CS.inkMute}; position: relative; cursor: pointer; transition: color .15s ease, background .15s ease; }
    .cs-tab:hover { background: ${CS.grapeSoft}33; color: ${CS.ink}; }
    .cs-tab[data-on="true"] { color: ${CS.grapeDeep}; }
    .cs-tab[data-on="true"]::after { content:""; position:absolute; left: 50%; bottom: 0; width: 56px; height: 3px; border-radius: 999px; background: ${CS.violet500}; transform: translateX(-50%); }
    .cs-pop { animation: csPop .25s cubic-bezier(.2,.7,.3,1); }
    @keyframes csPop { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    @keyframes csPulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
  `;
  document.head.appendChild(s);
}

// Export to window for sibling Babel files
Object.assign(window, {
  CS, CIco, Avatar, UniBadge,
  POSTS, TRENDING, SUGGESTED_TUTORS, ACTIVE_NOW, TAB_FILTERS,
  fmtCount
});
