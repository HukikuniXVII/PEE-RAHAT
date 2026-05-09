import {
  CalendarPlus,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { asNotFound, createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { ReviewsSection } from "./_components/reviews-section";

interface Props {
  params: { id: string };
}

export default async function TutorProfilePage({ params }: Props) {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const [tutor, reviews] = await Promise.all([
    asNotFound(api.tutors.byId(params.id)),
    api.tutors.reviews(params.id, { page: 1, pageSize: 10 }),
  ]);

  return (
    <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
      <main className="lg:col-span-2 space-y-8">
        <header className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8 md:p-10 space-y-6">
          <div className="flex items-start gap-6">
            <div className="relative shrink-0">
              <img
                src={tutor.avatarUrl}
                alt={tutor.displayName}
                className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 object-cover"
              />
              {tutor.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-indigo-600 rounded-full border-4 border-white flex items-center justify-center text-white shadow-sm">
                  <ShieldCheck size={18} />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-black text-slate-900 leading-tight">
                {tutor.displayName}
              </h1>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                <GraduationCap size={16} className="text-indigo-600" />
                {tutor.faculty} • {tutor.university}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 rounded-full text-xs font-bold text-amber-600">
                  <Star size={12} fill="currentColor" />
                  {tutor.rating.toFixed(1)}
                  <span className="text-[10px] text-amber-500/80 ml-1">
                    ({tutor.reviewCount})
                  </span>
                </span>
                {tutor.isVerified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 rounded-full text-xs font-bold text-indigo-600">
                    <ShieldCheck size={12} />
                    Verified Tutor
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            About
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {tutor.bio || "ติวเตอร์ยังไม่ได้ใส่คำแนะนำตัว"}
          </p>
          {tutor.subjects.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-2">
              {tutor.subjects.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </section>

        {tutor.introVideoUrl && (
          <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Sample Intro
            </h2>
            <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900">
              <video
                src={tutor.introVideoUrl}
                controls
                className="w-full h-full object-cover"
              />
            </div>
          </section>
        )}

        <ReviewsSection tutorId={tutor.id} initialPage={reviews} />
      </main>

      <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Hourly Rate
            </p>
            <p className="text-4xl font-black text-slate-900">
              ฿{tutor.hourlyRate.toLocaleString()}
              <span className="text-sm font-medium text-slate-400">/hr</span>
            </p>
          </div>

          <Link
            href={`/tutors/${tutor.id}/book` as Route}
            className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <CalendarPlus size={18} />
            Book a Session
          </Link>

          <Link
            href={`/chat/${tutor.id}` as Route}
            className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            Chat with {tutor.displayName.split(" ")[0]}
          </Link>

          <div className="pt-4 border-t border-slate-100 flex items-start gap-3 text-[10px] text-slate-500 leading-relaxed">
            <ShieldCheck size={14} className="text-emerald-600 mt-0.5 shrink-0" />
            <span>
              เงินจะอยู่ใน Escrow จนกว่าคลาสจะเสร็จและไม่มี Report ภายใน 24 ชม. ปลอดภัย 100%
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
