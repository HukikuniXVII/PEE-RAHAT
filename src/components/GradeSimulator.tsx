import { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, Search, CheckCircle2, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { TcasScores } from '../types';

interface UniversityGoal {
  university: string;
  faculty: string;
  major: string;
  minScore: number;
  weights: Partial<Record<keyof TcasScores, number>>;
  tags: string[];
}

const MOCK_UNIVERSITIES: UniversityGoal[] = [
  { 
    university: 'Chulalongkorn University', 
    faculty: 'Engineering', 
    major: 'Computer Engineering', 
    minScore: 61.67, 
    weights: {
      tGat: 20,
      tPat3: 30,
      aLevelMath1: 20,
      aLevelPhy: 20,
      aLevelChe: 10
    },
    tags: ['Engineering', 'Tech']
  },
  { 
    university: 'Thammasat University', 
    faculty: 'Medicine', 
    major: 'Medicine', 
    minScore: 71.67,
    weights: {
      tPat1: 30,
      aLevelMath1: 14,
      aLevelEng: 14,
      aLevelPhy: 9.33,
      aLevelChe: 9.33,
      aLevelBio: 9.34,
      aLevelThai: 7,
      aLevelSoc: 7
    },
    tags: ['Medicine', 'Health']
  },
  { 
    university: 'Kasetsart University', 
    faculty: 'Science', 
    major: 'Computer Science', 
    minScore: 56.00,
    weights: {
      gpax: 20,
      tGat: 20,
      tPat3: 20,
      aLevelMath1: 30,
      aLevelEng: 10
    },
    tags: ['Science', 'Tech']
  },
  { 
    university: 'Mahidol University', 
    faculty: 'ICT', 
    major: 'Information Technology', 
    minScore: 57.33,
    weights: {
      tGat: 20,
      tPat3: 20,
      aLevelMath1: 30,
      aLevelEng: 30
    },
    tags: ['ICT', 'Tech']
  },
  { 
    university: 'Khon Kaen University', 
    faculty: 'Engineering', 
    major: 'Digital Engineering', 
    minScore: 50.67,
    weights: {
      tGat: 20,
      tPat3: 40,
      aLevelMath1: 20,
      aLevelEng: 20
    },
    tags: ['Engineering', 'Digital']
  },
  { 
    university: 'Chiang Mai University', 
    faculty: 'Engineering', 
    major: 'Mechanical Engineering', 
    minScore: 52.67,
    weights: {
      tGat: 20,
      tPat3: 40,
      aLevelMath1: 20,
      aLevelPhy: 20
    },
    tags: ['Engineering']
  },
];

const MOCK_DEADLINES = [
  { id: '1', title: 'TGAT/TPAT Registration', date: '2026-11-01', type: 'registration' },
  { id: '2', title: 'TGAT/TPAT Exam Day', date: '2026-12-15', type: 'exam' },
  { id: '3', title: 'A-Level Registration', date: '2027-02-01', type: 'registration' },
  { id: '4', title: 'Score Announcement', date: '2027-04-15', type: 'announcement' },
];

export default function GradeSimulator() {
  const [scores, setScores] = useState<TcasScores>({
    gpax: 3.5,
    tGat: 0,
    tPat1: 0,
    tPat2: 0,
    tPat3: 0,
    tPat4: 0,
    tPat5: 0,
    aLevelMath1: 0,
    aLevelMath2: 0,
    aLevelPhy: 0,
    aLevelChe: 0,
    aLevelBio: 0,
    aLevelSci: 0,
    aLevelThai: 0,
    aLevelSoc: 0,
    aLevelEng: 0,
  });

  const [target, setTarget] = useState<UniversityGoal | null>(MOCK_UNIVERSITIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [round, setRound] = useState<'3' | '4'>('3');

  const calculateTotal = () => {
    if (!target) return 0;
    
    let total = 0;
    (Object.entries(target.weights) as [keyof TcasScores, number][]).forEach(([key, weight]) => {
      let score = scores[key] || 0;
      
      if (key === 'gpax') {
        score = (score / 4.0) * 100;
      }
      
      total += (score * ((weight || 0) / 100));
    });
    
    return parseFloat(total.toFixed(2));
  };

  const getWhatIfMessage = () => {
    if (!target) return null;
    const currentTotal = calculateTotal();
    const needed = target.minScore - currentTotal;
    
    if (needed <= 0) return "You've exceeded the target! Keep this momentum.";
    
    // Suggest points needed in highest weighted subject if it's currently 0
    const sortedWeights = (Object.entries(target.weights) as [keyof TcasScores, number][]).sort((a, b) => b[1] - a[1]);
    const [bestKey, weight] = sortedWeights[0];
    const pointsNeeded = Math.ceil(needed / (weight / 100));
    
    return `You need ${pointsNeeded} more points in ${bestKey.replace('tGat', 'TGAT').replace('tPat', 'TPAT').replace('aLevel', 'A-')} to bridge the gap.`;
  };

  const getPlanB = () => {
    if (!target) return [];
    return MOCK_UNIVERSITIES
      .filter(u => u !== target && u.tags.some(t => target.tags.includes(t)))
      .sort((a, b) => a.minScore - b.minScore)
      .slice(0, 2);
  };

  const myScore = calculateTotal();
  const gapString = target ? (myScore - target.minScore).toFixed(2) : "0";
  const gap = parseFloat(gapString);
  const isSafe = gap >= 0;

  const filteredUnis = MOCK_UNIVERSITIES.filter(u => 
    u.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.major.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Score Input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Calculator size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Input Your Scores</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="space-y-1.5 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider font-sans">GPAX (x.xx)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={scores.gpax || ''}
                  onChange={(e) => setScores(prev => ({ ...prev, gpax: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-transparent text-sm font-bold focus:outline-none placeholder:text-slate-300"
                  placeholder="3.50"
                />
              </div>
              {[
                { name: 'tGat', label: 'TGAT' },
                { name: 'tPat1', label: 'TPAT 1' },
                { name: 'tPat3', label: 'TPAT 3' },
                { name: 'aLevelMath1', label: 'Math 1' },
                { name: 'aLevelEng', label: 'English' },
                { name: 'aLevelPhy', label: 'Physics' },
                { name: 'aLevelChe', label: 'Chem' },
                { name: 'aLevelBio', label: 'Bio' },
                { name: 'aLevelSoc', label: 'Social' },
                { name: 'aLevelThai', label: 'Thai' },
              ].map((field) => (
                <div 
                  key={field.name} 
                  className={cn(
                    "space-y-1.5 p-3 rounded-2xl border transition-all",
                    target?.weights[field.name as keyof TcasScores] ? "bg-indigo-50/50 border-indigo-100 ring-1 ring-indigo-500/10" : "bg-slate-50/50 border-slate-100 grayscale-[0.5] opacity-60"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <label className={cn("text-[9px] font-bold uppercase tracking-wider font-sans", target?.weights[field.name as keyof TcasScores] ? "text-indigo-600" : "text-slate-400")}>
                      {field.label}
                    </label>
                    {target?.weights[field.name as keyof TcasScores] && (
                      <span className="text-[9px] font-bold text-indigo-400">{target.weights[field.name as keyof TcasScores]}%</span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={scores[field.name as keyof TcasScores] || ''}
                    onChange={(e) => setScores(prev => ({ ...prev, [field.name]: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-transparent text-sm font-bold focus:outline-none placeholder:text-slate-300"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">✨ Updated for TCAS 2568 Round 3 Criteria</p>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button 
                  onClick={() => setRound('3')}
                  className={cn("px-4 py-1 text-[10px] font-bold rounded-md transition-all", round === '3' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                >
                  Round 3 (Admission)
                </button>
                <button 
                  onClick={() => setRound('4')}
                  className={cn("px-4 py-1 text-[10px] font-bold rounded-md transition-all", round === '4' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                >
                  Round 4 (Direct)
                </button>
              </div>
            </div>
          </div>

            {/* Analysis Result */}
            {target && (
              <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "p-8 rounded-3xl border flex flex-col md:flex-row items-center gap-8 justify-between shadow-sm",
                    isSafe ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                  )}
                >
                  <div className="space-y-2 text-center md:text-left">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest justify-center md:justify-start">
                      {isSafe ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
                      <span className={isSafe ? "text-emerald-600" : "text-rose-600"}>
                        {isSafe ? "Safe Zone" : "Risk Zone"}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {target.university}
                    </h3>
                    <p className="text-slate-500 font-medium">{target.faculty} • {target.major}</p>
                    
                    {/* Weight Breakdown */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {(Object.entries(target.weights) as [string, number][]).map(([key, weight]) => (
                        <div key={key} className="px-2 py-1 bg-white/50 rounded-lg border border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                          {key.replace('aLevel', 'A-').replace('tGat', 'TGAT').replace('tPat', 'TPAT')}: {weight}%
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Weighted Avg</p>
                      <p className={cn("text-4xl font-black", isSafe ? "text-emerald-600" : "text-rose-600")}>{myScore}%</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200" />
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Target Gap</p>
                      <p className={cn("text-2xl font-bold", isSafe ? "text-emerald-600" : "text-rose-600")}>
                        {gap > 0 ? `+${gap}` : gap}%
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* What-If Section */}
                {!isSafe && (
                  <div className="bg-indigo-600 p-4 rounded-2xl text-white flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                      <Info size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">What-If (Reverse Calculation)</p>
                      <p className="text-sm font-semibold">{getWhatIfMessage()}</p>
                    </div>
                    <button className="ml-auto px-4 py-2 bg-white text-indigo-600 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-slate-100 transition-colors">
                      Book Tutor
                    </button>
                  </div>
                )}

                {/* Plan B Recommendations */}
                {!isSafe && getPlanB().length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <ArrowRight size={16} className="text-indigo-600" />
                      Plan B: Recommended Nearby Programs
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {getPlanB().map((uni, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setTarget(uni)}
                          className="p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-600 transition-all group"
                        >
                          <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide mb-1">{uni.major}</p>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{uni.university}</p>
                          <p className="text-[10px] text-slate-500">Cut-off: {uni.minScore}%</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Target Search & Deadlines */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Search size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Target Programs</h3>
              </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Search university or major..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredUnis.map((uni, i) => (
                <button
                  key={i}
                  onClick={() => setTarget(uni)}
                  className={cn(
                    "w-full p-4 rounded-2xl border text-left transition-all group",
                    target?.university === uni.university && target?.major === uni.major
                      ? "bg-indigo-50 border-indigo-200 shadow-sm"
                      : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">{uni.major}</p>
                    <Info size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <h4 className="font-bold text-sm mb-1 text-slate-800">{uni.university}</h4>
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] text-slate-500 font-medium">{uni.faculty}</p>
                    <p className="text-xs font-bold text-slate-700">Cut-off: <span className="text-indigo-600">{uni.minScore}%</span></p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Deadlines</h3>
            </div>
            <div className="space-y-4">
              {MOCK_DEADLINES.map(d => (
                <div key={d.id} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className={cn(
                    "px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter shrink-0",
                    d.type === 'exam' ? "bg-rose-100 text-rose-600" : 
                    d.type === 'registration' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {d.type}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 leading-none">{d.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4 shadow-xl">
            <h4 className="font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="text-indigo-400" />
              Study Strategy
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Based on your target, you should focus on increasing your **English** and **Math 1** scores. These carry the most weight for your chosen major.
            </p>
            <button className="w-full py-3 bg-indigo-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20">
              Talk to AI Mentor <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
