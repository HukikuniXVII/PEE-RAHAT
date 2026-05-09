"use client";

import type { Tutor } from "@peerahat/types";
import { MessageSquare, ShieldCheck, Star } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";

interface Props {
  tutor: Tutor;
}

export function TutorCard({ tutor }: Props) {
  return (
    <motion.div
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
                alt={tutor.displayName}
                className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100"
              />
              {tutor.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
                  <ShieldCheck size={14} />
                </div>
              )}
            </div>
            <Link
              href={`/tutors/${tutor.id}` as Route}
              className="block focus:outline-none"
            >
              <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {tutor.displayName}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {tutor.faculty}
              </p>
            </Link>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg text-amber-600 font-bold text-xs">
            <Star size={12} fill="currentColor" />
            {tutor.rating.toFixed(1)}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tutor.subjects.map((s) => (
              <span
                key={s}
                className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider"
              >
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Price
            </p>
            <p className="text-lg font-black text-slate-900">
              ฿{tutor.hourlyRate.toLocaleString()}
              <span className="text-xs font-medium text-slate-400">/hr</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/chat/${tutor.id}` as Route}
              className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
              aria-label={`Chat with ${tutor.displayName}`}
            >
              <MessageSquare size={18} />
            </Link>
            <Link
              href={`/tutors/${tutor.id}/book` as Route}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              Book Session
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
