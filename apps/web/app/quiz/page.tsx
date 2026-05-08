"use client";

import type { QuizQuestion, QuizResult, Subject } from "@peerahat/types";
import { motion } from "motion/react";
import { AlertCircle, Award, ChevronRight, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createApiClient } from "@/lib/api-client";

const SUBJECTS: Subject[] = [
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Social",
  "Thai",
];

export default function QuizPage() {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<
    Array<{ questionId: string; selectedIndex: number }>
  >([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subject) return;
    setError(null);
    const api = createApiClient();
    api.quiz.questions(subject).then(setQuestions).catch((e) => {
      setError((e as Error).message);
    });
  }, [subject]);

  const handleAnswer = async (selectedIndex: number) => {
    if (!subject) return;
    const q = questions[stepIdx];
    if (!q) return;
    const next = [...answers, { questionId: q.id, selectedIndex }];
    setAnswers(next);
    if (stepIdx < questions.length - 1) {
      setStepIdx(stepIdx + 1);
      return;
    }
    try {
      const api = createApiClient();
      const r = await api.quiz.submit({ subject, answers: next });
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!subject) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-900">
            Diagnostic Quiz
          </h1>
          <p className="text-slate-500">
            เลือกวิชาที่ต้องการประเมิน เพื่อค้นหาจุดอ่อนและติวเตอร์ที่เหมาะกับคุณ
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className="p-6 bg-white rounded-2xl border border-slate-200 font-bold text-slate-800 hover:border-indigo-600 hover:bg-indigo-50 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl text-center space-y-6"
      >
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <Award size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">วิเคราะห์ผลเรียบร้อย!</h2>
        <div className="space-y-2">
          <p className="text-slate-500">คะแนนพื้นฐานของคุณในวิชา {result.subject}</p>
          <p className="text-5xl font-black text-indigo-600">
            {result.scorePct.toFixed(0)}%
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Target size={18} className="text-red-500" />
            จุดที่ควรพัฒนา (Weak Topics)
          </h3>
          <ul className="grid grid-cols-1 gap-2">
            {result.weakTopics.length === 0 ? (
              <li className="text-sm text-slate-500">
                ทำได้ดีมาก ไม่มีจุดอ่อนชัดเจน
              </li>
            ) : (
              result.weakTopics.map((topic) => (
                <li
                  key={topic}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <AlertCircle size={14} className="text-red-400" />
                  {topic}
                </li>
              ))
            )}
          </ul>
        </div>

        <Link
          href={`/tutors?subject=${result.subject}`}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          หาติวเตอร์ที่เหมาะสม
          <ChevronRight size={20} />
        </Link>
      </motion.div>
    );
  }

  if (error) {
    return <p className="text-rose-600 font-medium text-center">{error}</p>;
  }

  if (questions.length === 0) {
    return (
      <p className="text-slate-400 text-center font-bold uppercase tracking-widest">
        Loading...
      </p>
    );
  }

  const currentQ = questions[stepIdx];
  if (!currentQ) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
          <span>
            Question {stepIdx + 1} of {questions.length}
          </span>
          <span>{currentQ.subject}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((stepIdx + 1) / questions.length) * 100}%` }}
            className="h-full bg-indigo-600"
          />
        </div>
      </div>

      <motion.div
        key={stepIdx}
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
              <span className="font-medium text-slate-700 group-hover:text-indigo-700">
                {opt}
              </span>
              <div className="w-6 h-6 border-2 border-slate-200 rounded-full group-hover:border-indigo-600" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
