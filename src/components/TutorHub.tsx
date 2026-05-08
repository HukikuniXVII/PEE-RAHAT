import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Star, ShieldCheck, MapPin, BookOpen, Clock, ChevronRight, Sparkles, UserPlus, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { MOCK_TUTORS, SUBJECTS, UNIVERSITIES } from '../constants';
import DiagnosticQuiz from './DiagnosticQuiz';
import TutorRegistration from './TutorRegistration';
import type { Tutor } from '../types';

export default function TutorHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [showQuiz, setShowQuiz] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);

  const filteredTutors = MOCK_TUTORS.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || t.subjects.includes(selectedSubject);
    return matchesSearch && matchesSubject;
  });

  if (showQuiz) {
    return (
      <div className="py-8">
        <button onClick={() => setShowQuiz(false)} className="mb-8 text-slate-500 hover:text-slate-800 flex items-center gap-2">
          ← Back to Hub
        </button>
        <DiagnosticQuiz onComplete={(subj, score) => {
          setSelectedSubject(subj === 'General' ? 'All' : subj);
          setShowQuiz(false);
        }} />
      </div>
    );
  }

  if (showRegister) {
    return (
      <div className="py-8">
        <button onClick={() => setShowRegister(false)} className="mb-8 text-slate-500 hover:text-slate-800 flex items-center gap-2">
          ← Back to Hub
        </button>
        <TutorRegistration />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero / Banner */}
      <section className="relative rounded-[40px] bg-indigo-600 p-8 md:p-12 overflow-hidden text-white">
        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              Featured Feature
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              ไม่รู้จะเริ่มติว <br /><span className="text-indigo-200">วิชาไหนดี?</span>
            </h2>
            <p className="text-indigo-100 text-lg max-w-md">
              ลองทำแบบทดสอบวัดระดับ (Diagnostic Quiz) เพื่อหาจุดอ่อนและติวเตอร์ที่เข้ากับคุณที่สุด
            </p>
            <button 
              onClick={() => setShowQuiz(true)}
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-lg hover:bg-slate-50 transition-all transform hover:-translate-y-1 shadow-xl shadow-indigo-900/20"
            >
              Take Diagnostic Quiz
            </button>
          </div>
          <div className="hidden md:flex justify-center">
             <div className="relative">
                <div className="w-64 h-64 bg-white/10 rounded-[48px] rotate-12 blur-2xl absolute inset-0" />
                <div className="relative bg-white/20 backdrop-blur-xl p-8 rounded-[40px] border border-white/30 space-y-4 w-64">
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600">
                      <Star size={24} fill="currentColor" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-xs font-bold opacity-60">Verified Tutors</p>
                      <p className="text-2xl font-black">500+</p>
                   </div>
                   <p className="text-[10px] leading-relaxed opacity-80">
                     จากทุกคณะชั้นนำทั่วประเทศไทย ผ่านการยืนยันตัวตน 100%
                   </p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Main Hub Content */}
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Filter by Subject</h4>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {['All', ...SUBJECTS].map(subject => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all text-left",
                    selectedSubject === subject 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                      : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-600"
                  )}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">ร่วมเป็นส่วนหนึ่งของทีม</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              คุณเป็นนิสิต/นักศึกษาที่มีไฟใจรักการสอนใช่ไหม? สมัครเป็นติวเตอร์กับเราวันนี้
            </p>
            <button 
              onClick={() => setShowRegister(true)}
              className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              สมัครเป็นติวเตอร์
            </button>
          </div>
        </aside>

        {/* Tutor Grid */}
        <div className="lg:col-span-3 space-y-8">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, university, or bio..." 
                className="w-full pl-12 pr-4 py-3 bg-transparent text-sm focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Sort by:</span>
              <select className="text-sm font-bold text-slate-800 bg-slate-50 px-4 py-2 rounded-xl border-none focus:ring-0">
                <option>Highest Rating</option>
                <option>Lowest Price</option>
                <option>Newest</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredTutors.map(tutor => (
                <motion.div
                  key={tutor.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-[32px] border border-slate-200 overflow-hidden hover:shadow-xl transition-all group flex flex-col"
                >
                  <div className="p-6 space-y-6 flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img 
                            src={tutor.avatarUrl} 
                            alt={tutor.name} 
                            className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100"
                          />
                          {tutor.isVerified && (
                             <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
                               <ShieldCheck size={14} />
                             </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{tutor.name}</h3>
                          <p className="text-xs text-slate-400 font-medium">{tutor.faculty}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg text-amber-600 font-bold text-xs">
                        <Star size={12} fill="currentColor" />
                        {tutor.rating}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {tutor.subjects.map(s => (
                          <span key={s} className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {s}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                        {tutor.bio}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</p>
                        <p className="text-lg font-black text-slate-900">฿{tutor.hourlyRate}/<span className="text-xs font-medium text-slate-400">hr</span></p>
                      </div>
                      <div className="flex gap-2">
                         <button className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all">
                            <MessageSquare size={18} />
                         </button>
                         <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                            Book Session
                         </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
