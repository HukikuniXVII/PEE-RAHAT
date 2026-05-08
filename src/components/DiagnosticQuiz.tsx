import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, CheckCircle2, ChevronRight, Award, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import type { QuizQuestion } from '../types';

const MOCK_QUESTIONS: QuizQuestion[] = [
  {
    id: '1',
    subject: 'Physics',
    question: 'กฎข้อที่ 1 ของนิวตัน (Newton\'s First Law) กล่าวถึงเรื่องใด?',
    options: ['ความสมดุลและความเฉื่อย', 'แรงเสียดทาน', 'แรงดึงดูดระหว่างมวล', 'โมเมนตัม'],
    correctAnswer: 0
  },
  {
    id: '2',
    subject: 'Math',
    question: 'อนุพันธ์ของ f(x) = x^2 คืออะไร?',
    options: ['x', '2x', 'x/2', '2'],
    correctAnswer: 1
  },
  {
    id: '3',
    subject: 'English',
    question: 'Which word is a synonym for "Abundant"?',
    options: ['Scarce', 'Plentiful', 'Rare', 'Limited'],
    correctAnswer: 1
  }
];

interface DiagnosticQuizProps {
  onComplete: (subject: string, score: number) => void;
}

export default function DiagnosticQuiz({ onComplete }: DiagnosticQuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const handleAnswer = (index: number) => {
    const newAnswers = [...answers, index];
    setAnswers(newAnswers);
    
    if (currentStep < MOCK_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const calculateResults = () => {
    let score = 0;
    answers.forEach((ans, i) => {
      if (ans === MOCK_QUESTIONS[i].correctAnswer) score++;
    });
    return (score / MOCK_QUESTIONS.length) * 100;
  };

  if (isFinished) {
    const score = calculateResults();
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl text-center space-y-6"
      >
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <Award size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">วิเคราะห์ผลเรียบร้อย!</h2>
        <div className="space-y-2">
          <p className="text-slate-500">คะแนนพื้นฐานรวมของคุณอยูที่</p>
          <p className="text-5xl font-black text-indigo-600">{score.toFixed(0)}%</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Target size={18} className="text-red-500" />
            จุดที่ควรพัฒนา (Weak Topics)
          </h3>
          <ul className="grid grid-cols-1 gap-2">
            {score < 70 && (
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <AlertCircle size={14} className="text-red-400" />
                บทพื้นฐาน (Foundation) ยังไม่แน่นพอ
              </li>
            )}
            <li className="flex items-center gap-2 text-sm text-slate-600">
              <AlertCircle size={14} className="text-red-400" />
              เทคนิคการทำโจทย์ประยุกต์ A-Level
            </li>
          </ul>
        </div>

        <button 
          onClick={() => onComplete('General', score)}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          หาติวเตอร์ที่เหมาะสม
          <ChevronRight size={20} />
        </button>
      </motion.div>
    );
  }

  const currentQ = MOCK_QUESTIONS[currentStep];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
          <span>Question {currentStep + 1} of {MOCK_QUESTIONS.length}</span>
          <span>{currentQ.subject}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / MOCK_QUESTIONS.length) * 100}%` }}
            className="h-full bg-indigo-600"
          />
        </div>
      </div>

      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-8"
      >
        <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
          {currentQ.question}
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          {currentQ.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className="w-full p-4 rounded-2xl border border-slate-200 text-left hover:border-indigo-600 hover:bg-indigo-50 transition-all group flex items-center justify-between"
            >
              <span className="font-medium text-slate-700 group-hover:text-indigo-700">{opt}</span>
              <div className="w-6 h-6 border-2 border-slate-200 rounded-full group-hover:border-indigo-600 flex items-center justify-center">
                <div className="w-3 h-3 bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
