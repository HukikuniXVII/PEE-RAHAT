// ============================================================
// Chat shared — mock conversations + messages + reusable bubble.
// Reuses CS palette + icons + Avatar from community-shared.jsx.
// ============================================================

// ----- THREADS (conversation list) -----
const THREADS = [
  { id:'th1', counterparty:'พี่กิ๊ฟ',  uni:'มหิดล แพทย์ ปี 4',     verified:true, online:true,
    preview:'แล้วพาร์ท critical-thinking ลองทำชุดที่พี่ส่งให้ก่อนนะคะ', time:'เมื่อกี้',
    unread:0, booking:'paid', booked:'25 พ.ค. 19:00', subject:'TPAT1 + กสพท' },
  { id:'th2', counterparty:'พี่นิว',   uni:'จุฬาฯ วิศวะคอม ปี 3',   verified:true, online:true,
    preview:'น้องสะดวกเย็นวันพุธมั้ยครับ?',  time:'10 นาที',
    unread:2, booking:'proposed', subject:'A-Level คณิตประยุกต์' },
  { id:'th3', counterparty:'พี่ฝน',    uni:'จุฬาฯ Econ ปี 1',       verified:true, online:false,
    preview:'จ่ายเรียบร้อยแล้วนะคะ ส่ง Meet link ให้ทาง chat ตอน 18:30',  time:'2 ชม.',
    unread:0, booking:'done', booked:'18 พ.ค.', subject:'TGAT' },
  { id:'th4', counterparty:'พี่โอ๊ต',  uni:'ธรรมศาสตร์ บัญชี ปี 2',  verified:true, online:false,
    preview:'เรท friend price 350/ชม. เลยค่ะ ติวเป็นกลุ่มก็ได้นะคะ',  time:'1 วัน',
    unread:0, booking:null, subject:'TGAT/บัญชี' },
  { id:'th5', counterparty:'พี่แพร',    uni:'เกษตร อักษร ปี 2',      verified:true, online:false,
    preview:'อ่านแล้วค่ะ จะลองส่งตัวอย่างให้คืนนี้นะคะ',  time:'2 วัน',
    unread:0, booking:null, subject:'A-Level English' },
  { id:'th6', counterparty:'ทีม Pee Rahat', uni:'แอดมิน', verified:true, online:true, admin:true,
    preview:'แจ้งเตือน: คลาสกับพี่กิ๊ฟวันนี้ 19:00 น.',  time:'4 ชม.',
    unread:1, booking:null }
];

// ----- ACTIVE CONVERSATION (with พี่กิ๊ฟ) -----
const ACTIVE_MESSAGES = [
  { kind:'divider', label:'วานนี้' },
  { kind:'them', author:'พี่กิ๊ฟ', body:'สวัสดีค่ะน้องมิ้น 👋 พี่ดูประวัติแล้ว เห็นว่าน้องเตรียมตัว TPAT1 เน้นแพทย์ มข./จุฬา ใช่ไหมคะ?', time:'19:42' },
  { kind:'me',   body:'ใช่ค่ะพี่ ตอนนี้ทำได้แค่ ~45/100 อยากปรับพาร์ท critical thinking มากที่สุด', time:'19:43' },
  { kind:'me',   body:'เผื่อพี่อยากคุยตรงๆ Line อยู่ที่ ', body2redacted:'[เบอร์/ID ถูกซ่อนตามนโยบายแชท]', time:'19:44' },
  { kind:'them', author:'พี่กิ๊ฟ', body:'พี่ตอบใน chat นี้ก็ได้นะคะ ทุกอย่างจะมีหลักฐานชัด และระบบ escrow จะคุ้มครองทั้งคู่ ✓', time:'19:45' },
  // booking proposal
  { kind:'system-booking-proposal', from:'พี่กิ๊ฟ',
    date:'25 พ.ค. 2569', time:'19:00 – 21:00', durationMin:120, rate:600, total:1200,
    subject:'TPAT1 พาร์ท critical-thinking + จริยธรรมแพทย์',
    note:'เตรียมโจทย์จริง 30 ข้อ พร้อมเฉลย + เทคนิคทำเร็ว' },
  { kind:'me', body:'จองเลยค่ะพี่!', time:'19:50' },
  // system events
  { kind:'system', icon:'💰', label:'น้องมิ้น ชำระเงิน 1,200฿ ผ่าน PromptPay สำเร็จ', sub:'เงินถูกพักไว้ในระบบ Escrow — จะถึงพี่กิ๊ฟหลังเรียนจบ 24 ชม.', tone:'success' },
  { kind:'system', icon:'📅', label:'จองเรียนสำเร็จ · 25 พ.ค. 19:00 – 21:00',         sub:'Google Meet link จะถูกส่งให้ก่อนเรียน 15 นาที',                  tone:'info' },
  { kind:'them', author:'พี่กิ๊ฟ', body:'รับทราบค่ะ พี่จะส่งเอกสารเตรียมตัวให้ก่อน 1 วัน แล้วเจอกัน 25 พ.ค. นะคะ 📚', time:'19:52' },
  { kind:'them', author:'พี่กิ๊ฟ', kindEmbed:'sheet',
    embed:{ kind:'sheet', title:'TPAT1 critical thinking · เซ็ตรวมโจทย์', sub:'พี่กิ๊ฟ · มหิดล แพทย์', price:0, original:290, rating:4.95, reviewCount:42 },
    body:'พี่แถมชีท critical-thinking ฟรีให้เลยนะคะ ลองอ่าน 1 รอบก่อนเรียนค่ะ', time:'19:54' },

  { kind:'divider', label:'วันนี้' },
  { kind:'them', author:'พี่กิ๊ฟ', body:'น้องเป็นไงบ้างคะ อ่านชีทไปถึงไหนแล้ว มีตรงไหนติดมั้ย?', time:'14:20' },
  { kind:'me',   body:'อ่านถึงพาร์ทจริยธรรมแล้วค่ะ ติดข้อ 12 ไม่เข้าใจว่าทำไมตอบ B ไม่ใช่ A', time:'14:32' },
  { kind:'them', author:'พี่กิ๊ฟ', body:'แล้วพาร์ท critical-thinking ลองทำชุดที่พี่ส่งให้ก่อนนะคะ เดี๋ยวเย็นนี้พี่ตามไปเฉลยให้', time:'เมื่อกี้', read:false }
];

// Inject chat-specific styles
if (typeof document !== 'undefined' && !document.getElementById('chat-styles')) {
  const s = document.createElement('style');
  s.id = 'chat-styles';
  s.textContent = `
    .ch-bubble-me   { background: ${CS.violet500}; color: #fff; border-radius: 18px 18px 4px 18px; }
    .ch-bubble-them { background: #fff; color: ${CS.ink}; border-radius: 18px 18px 18px 4px; border: 1px solid rgba(85,65,139,0.10); }
    .ch-system-card { background: linear-gradient(135deg, rgba(245,242,250,0.96), #fff); border: 1px solid rgba(85,65,139,0.12); }
    .ch-redacted    { background: ${CS.taupeSoft}; color: ${CS.taupeDeep}; border: 1px dashed ${CS.taupe}; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
    .ch-thread-active { background: ${CS.grapeSoft}; border-left: 3px solid ${CS.violet500}; }
    .ch-thread-hover:hover { background: rgba(85,65,139,0.05); }
    .ch-unread-dot { width: 8px; height: 8px; border-radius: 999px; background: ${CS.violet500}; }
    .ch-pulse { animation: chPulse 1.5s infinite; }
    @keyframes chPulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
  `;
  document.head.appendChild(s);
}

// ----- Booking status badge -----
function BookingBadge({ status }) {
  if (status === 'paid')     return <span className="thai text-[9.5px] font-bold inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{background: CS.emeraldSoft, color: CS.emerald}}>● จองแล้ว</span>;
  if (status === 'proposed') return <span className="thai text-[9.5px] font-bold inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{background: CS.accent500+'30', color: CS.accent600}}>● รอตอบ</span>;
  if (status === 'done')     return <span className="thai text-[9.5px] font-bold inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{background: CS.grapeSoft, color: CS.grapeDeep}}>● เสร็จแล้ว</span>;
  return null;
}

window.THREADS = THREADS;
window.ACTIVE_MESSAGES = ACTIVE_MESSAGES;
window.BookingBadge = BookingBadge;
