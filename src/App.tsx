/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  MessageSquare, 
  Calculator, 
  BookOpen, 
  LayoutDashboard,
  Menu,
  X,
  Sparkles,
  Users,
  ShieldCheck,
  Search
} from 'lucide-react';
import { cn } from './lib/utils';

import TutorHub from './components/TutorHub';
import GradeSimulator from './components/GradeSimulator';
import SheetMarketplace from './components/SheetMarketplace';
import Community from './components/Community';

type Tab = 'home' | 'tutor' | 'simulator' | 'marketplace' | 'community';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'tutor', label: 'Tutor Hub', icon: Search },
    { id: 'marketplace', label: 'Sheets', icon: BookOpen },
    { id: 'simulator', label: 'TCAS Calc', icon: Calculator },
    { id: 'community', label: 'Webboard', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
                <GraduationCap size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-slate-900 leading-none">Pee Rahat</span>
                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Verified EdTech</span>
              </div>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                    activeTab === item.id 
                      ? "text-indigo-600 bg-indigo-50" 
                      : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
              <div className="w-px h-6 bg-slate-100 mx-4" />
              <button 
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-black shadow-xl shadow-slate-200 transition-all uppercase tracking-widest"
              >
                Login
              </button>
            </div>

            {/* Mobile Toggle */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-800">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden bg-white border-b border-slate-100 px-4 py-6 space-y-2 shadow-2xl"
            >
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as Tab);
                    setIsMenuOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-2xl text-base font-bold flex items-center gap-4 transition-all",
                    activeTab === item.id 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <item.icon size={22} />
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-24"
            >
              {/* Hero Section */}
              <section className="relative rounded-[48px] overflow-hidden bg-slate-900 p-8 md:p-20 text-white shadow-2xl shadow-slate-200">
                <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
                  <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                      <ShieldCheck size={14} />
                      Safe & Verified EdTech Thailand
                    </div>
                    <h1 className="text-6xl md:text-7xl font-black tracking-tighter leading-[0.9]">
                      TRANSFORM <br /><span className="text-indigo-500">YOUR FUTURE.</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-lg leading-relaxed font-medium">
                      เชื่อมต่อเด็ก ม.6 กับพี่ติวเตอร์มหาวิทยาลัยชั้นนำ <br />
                      ปลอดภัยด้วยระบบ Escrow และการยืนยันตัวตน 100%
                    </p>
                    <div className="flex flex-wrap gap-4 pt-4">
                      <button 
                        onClick={() => setActiveTab('tutor')}
                        className="px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-lg hover:bg-indigo-700 shadow-2xl shadow-indigo-900/40 transition-all transform hover:-translate-y-1"
                      >
                        Find a Tutor
                      </button>
                      <button 
                        onClick={() => setActiveTab('marketplace')}
                        className="px-10 py-5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-[24px] font-black text-lg backdrop-blur-md transition-all"
                      >
                        Buy Sheets
                      </button>
                    </div>
                  </div>
                  <div className="relative hidden md:block">
                     <div className="w-full aspect-square bg-gradient-to-br from-indigo-500/20 to-transparent rounded-[64px] border border-white/5 flex items-center justify-center relative overflow-hidden">
                        <Sparkles size={120} className="text-indigo-500/20 animate-pulse" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
                     </div>
                  </div>
                </div>
                {/* Decorative background circle */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4" />
              </section>

              {/* Pillars Grid */}
              <section className="space-y-12">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase">the 4 core pillars</h2>
                  <div className="w-20 h-1.5 bg-indigo-600 mx-auto rounded-full" />
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {navItems.filter(i => i.id !== 'home').map((feature) => (
                    <div 
                      key={feature.id}
                      onClick={() => setActiveTab(feature.id as Tab)}
                      className="group bg-white p-10 rounded-[40px] border border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all cursor-pointer space-y-8"
                    >
                      <div className="w-16 h-16 bg-slate-50 group-hover:bg-indigo-600 rounded-2xl flex items-center justify-center text-slate-900 group-hover:text-white transition-all duration-500">
                        <feature.icon size={32} />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{feature.label}</h3>
                        <p className="text-slate-500 text-sm leading-relaxed font-medium">
                          {feature.id === 'tutor' && "ระบบค้นหาพี่ติวเตอร์ที่ผ่านการยืนยันตัวตน พร้อมระบบประเมินผล Diagnostic Quiz"}
                          {feature.id === 'marketplace' && "ตลาดรวมชีทสรุปคุณภาพสูง พร้อมระบบ Escrow ดูแลความปลอดภัยทุกยอดโอน"}
                          {feature.id === 'simulator' && "คำนวณโอกาสสอบติด TCAS พร้อมอัลกอริทึม What-If วางแผนการติวให้ตรงจุด"}
                          {feature.id === 'community' && "พื้นที่แลกเปลี่ยนกระทู้สำหรับเด็ก ม.ปลาย และรุ่นพี่มหาลัย (Safe Webboard)"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Trust Section */}
              <section className="bg-slate-50 rounded-[48px] p-12 md:p-20 text-center space-y-12 border border-slate-100">
                  <div className="max-w-3xl mx-auto space-y-6">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">PLATFORM BUILT ON TRUST.</h2>
                    <p className="text-slate-500 font-medium leading-relaxed">
                      เพราะการศึกษาคืออนาคต เราจึงให้ความสำคัญกับความปลอดภัยและความถูกต้องสูงสุด <br />
                      ทุกติวเตอร์ต้องผ่านการส่ง Transcript และบัตรประชาชน และทุกการชำระเงินถูกดูแลแบบ Escrow
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8 items-center justify-center opacity-40 grayscale contrast-125">
                     <span className="text-2xl font-black italic">SlipOK</span>
                     <span className="text-2xl font-black italic">PromptPay</span>
                     <span className="text-2xl font-black italic md:col-span-1 col-span-2">DBD Verified</span>
                  </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'tutor' && (
            <motion.div
              key="tutor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TutorHub />
            </motion.div>
          )}

          {activeTab === 'marketplace' && (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SheetMarketplace />
            </motion.div>
          )}

          {activeTab === 'simulator' && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GradeSimulator />
            </motion.div>
          )}

          {activeTab === 'community' && (
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Community />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                <GraduationCap size={24} />
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900">Pee Rahat</span>
            </div>
            <div className="flex gap-8 text-sm font-bold text-slate-400">
              <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Contact</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Help</a>
            </div>
          </div>
          <div className="pt-12 border-t border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
              © 2026 Pee Rahat Thailand. Built with ❤️ for the next generation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
