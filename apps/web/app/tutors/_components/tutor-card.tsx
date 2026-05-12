"use client";

import type { Subject, Tutor } from "@peerahat/types";
import { ShieldCheck, Star } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";

interface Props {
  tutor: Tutor;
}

const SUBJECT_LABEL: Record<Subject, string> = {
  Math: "คณิต",
  Physics: "ฟิสิกส์",
  Chemistry: "เคมี",
  Biology: "ชีววิทยา",
  English: "อังกฤษ",
  Social: "สังคม",
  Thai: "ไทย",
};

export function TutorCard({ tutor }: Props) {
  const topSubjects = tutor.subjects.slice(0, 3);
  const extra = tutor.subjects.length - topSubjects.length;
  const profileHref = `/tutors/${tutor.id}` as Route;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="bg-white rounded-[28px] border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all group flex flex-col"
    >
      <Link
        href={profileHref}
        className="p-5 sm:p-6 flex-1 flex flex-col gap-5 focus:outline-none"
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={tutor.avatarUrl}
              alt={tutor.displayName}
              className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 object-cover"
            />
            {tutor.isVerified && (
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm"
                aria-label="Verified tutor"
              >
                <ShieldCheck size={12} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
              {tutor.displayName}
            </h3>
            <p className="text-xs text-slate-500 font-medium truncate">
              {tutor.faculty}
            </p>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
              <Star size={12} fill="currentColor" />
              {tutor.rating.toFixed(1)}
              <span className="text-slate-400 font-medium ml-1">
                ({tutor.reviewCount} รีวิว)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {topSubjects.map((s) => (
            <span
              key={s}
              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold"
            >
              {SUBJECT_LABEL[s] ?? s}
            </span>
          ))}
          {extra > 0 && (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-bold">
              +{extra}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              ค่าติว
            </p>
            <p className="text-lg font-black text-slate-900 leading-tight">
              ฿{tutor.hourlyRate.toLocaleString()}
              <span className="text-xs font-medium text-slate-400">/ชม.</span>
            </p>
          </div>
          <span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold group-hover:bg-indigo-600 transition-all">
            ดูโปรไฟล์
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
