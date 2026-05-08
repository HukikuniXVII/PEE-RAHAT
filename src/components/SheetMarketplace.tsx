import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Star, 
  Tag, 
  CheckCircle, 
  Upload, 
  Filter, 
  Download,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { MOCK_SHEETS, SUBJECTS } from '../constants';
import type { StudySheet } from '../types';
import PaymentFlow from './PaymentFlow';

export default function SheetMarketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedSheet, setSelectedSheet] = useState<StudySheet | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const categories = ['All', ...SUBJECTS];

  const filteredSheets = MOCK_SHEETS.filter(s => 
    (activeCategory === 'All' || s.subject === activeCategory) &&
    (s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.university.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <AnimatePresence>
        {showPayment && selectedSheet && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xl"
            >
              <PaymentFlow 
                amount={selectedSheet.price}
                receiverName={selectedSheet.sellerId} // Matching our simplified mock
                onSuccess={(url) => {
                  console.log('Payment successful:', url);
                  setShowPayment(false);
                  alert('ชำระเงินสำเร็จ! คุณสามารถดาวน์โหลดไฟล์ได้ทันที');
                }}
                onCancel={() => setShowPayment(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header & Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Sheet Marketplace</h2>
          <p className="text-slate-500 max-w-2xl font-medium leading-relaxed">
            แหล่งรวมชีทสรุปคุณภาพจากพี่ๆ มหาวิทยาลัยชั้นนำ <br />
            มั่นใจด้วยระบบ <span className="text-indigo-600 font-bold">Escrow</span> เงินจะถึงมือผู้ขายเมื่อคุณได้รับไฟล์แล้วเท่านั้น
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sheet Library</p>
            <p className="text-2xl font-bold text-slate-800 tracking-tight">5,000+ Items</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <BookOpen size={24} />
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-200 flex flex-col justify-center gap-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tutor Hub</p>
          <button className="flex items-center gap-2 text-sm font-black hover:text-indigo-300 transition-colors group">
            อยากเป็นผู้ขายชีท? 
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-200">
        <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar">
          {categories.slice(0, 6).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeCategory === cat 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            placeholder="Search sheets, unis, authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredSheets.map((sheet) => (
          <motion.div
            key={sheet.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-[40px] border border-slate-200 overflow-hidden hover:border-indigo-600 hover:shadow-2xl transition-all shadow-sm flex flex-col"
          >
            {/* Thumbnail */}
            <div className="aspect-[4/3] bg-slate-50 relative flex items-center justify-center overflow-hidden">
               <img 
                 src={sheet.previewUrls[0] || `https://images.unsplash.com/photo-1544640808-32ca72ac7f67?w=400&q=80`} 
                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                 alt="preview"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur rounded-xl text-[10px] font-black shadow-sm uppercase tracking-tighter">
                 {sheet.subject}
               </div>
            </div>

            <div className="p-8 space-y-6 flex-1 flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-amber-500">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-lg">
                    <Star size={12} fill="currentColor" />
                    {sheet.rating}
                  </div>
                  <button className="text-[10px] font-bold text-slate-300 hover:text-red-400 flex items-center gap-1 transition-colors">
                    <AlertTriangle size={12} />
                    Report
                  </button>
                </div>
                <h4 className="font-bold text-xl text-slate-800 leading-tight line-clamp-2">{sheet.title}</h4>
                <div className="flex items-center gap-2 pt-1">
                   <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-black">
                     {sheet.university[0]}
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{sheet.university}</p>
                     <p className="text-[9px] font-bold text-slate-400 capitalize">{sheet.faculty}</p>
                   </div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Price</p>
                  <p className="font-black text-2xl text-slate-900 tracking-tight">
                    ฿{sheet.price}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedSheet(sheet);
                    setShowPayment(true);
                  }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-[20px] font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all transform hover:-translate-y-1"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Policy Footer */}
      <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="font-bold text-slate-800">100% Genuine Protection</p>
            <p className="text-xs text-slate-500">ระบบ Escrow ของเราจะทำการระงับยอดเงินไว้ 24 ชม. เพื่อความปลอดภัย</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
           <img src="https://via.placeholder.com/60x30?text=DBD" alt="DBD" className="opacity-40 grayscale" />
           <img src="https://via.placeholder.com/80x30?text=SlipOK" alt="SlipOK" className="opacity-40 grayscale" />
        </div>
      </div>
    </div>
  );
}
