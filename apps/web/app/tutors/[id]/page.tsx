import type { Subject } from "@peerahat/types";
import { GraduationCap, ShieldCheck, Star } from "lucide-react";

import { asNotFound, createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { AvailabilityPicker } from "./_components/availability-picker";
import { BookingCta } from "./_components/booking-cta";
import { ChatCta } from "./_components/chat-cta";
import { IntroVideo } from "./_components/intro-video";
import { ReviewsSection } from "./_components/reviews-section";

interface Props {
  params: { id: string };
}

const SUBJECT_LABEL: Record<Subject, string> = {
  Math: "คณิตศาสตร์",
  Physics: "ฟิสิกส์",
  Chemistry: "เคมี",
  Biology: "ชีววิทยา",
  English: "อังกฤษ",
  Social: "สังคม",
  Thai: "ภาษาไทย",
};

export default async function TutorProfilePage({ params }: Props) {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const [tutor, reviews] = await Promise.all([
    asNotFound(api.tutors.byId(params.id)),
    api.tutors.reviews(params.id, { page: 1, pageSize: 10 }),
  ]);

  return (
    // pb-28 on mobile reserves space for the fixed booking bar.
    <div className="max-w-6xl mx-auto pb-28 lg:pb-0">
      <div className="grid lg:grid-cols-3 gap-8">
        <main className="lg:col-span-2 space-y-8">
          <IntroVideo
            videoUrl={tutor.introVideoUrl}
            posterUrl={tutor.avatarUrl}
            displayName={tutor.displayName}
          />

          <header className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-5">
              <div className="relative shrink-0">
                <img
                  src={tutor.avatarUrl}
                  alt={tutor.displayName}
                  className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 object-cover"
                />
                {tutor.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 rounded-full border-4 border-white flex items-center justify-center text-white shadow-sm">
                    <ShieldCheck size={14} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  {tutor.displayName}
                </h1>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                  <GraduationCap size={16} className="text-indigo-600" />
                  <span className="truncate">
                    {tutor.faculty} • {tutor.university}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
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
                      ยืนยันตัวตนแล้ว
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 rounded-full text-xs font-bold text-emerald-700">
                    <ShieldCheck size={12} />
                    Escrow Payment
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                แนะนำตัว
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {tutor.bio || "พี่ติวยังไม่ได้ใส่คำแนะนำตัว"}
              </p>
            </div>
          </header>

          {tutor.subjects.length > 0 && (
            <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                วิชาที่สอน
              </h2>
              <div className="flex flex-wrap gap-2">
                {tutor.subjects.map((s) => (
                  <span
                    key={s}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-bold"
                  >
                    {SUBJECT_LABEL[s] ?? s}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 sm:p-8">
            <AvailabilityPicker />
          </section>

          <ReviewsSection
            tutorId={tutor.id}
            initialPage={reviews}
            rating={tutor.rating}
            reviewCount={tutor.reviewCount}
          />
        </main>

        <aside className="hidden lg:block lg:col-span-1">
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-7 space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  ค่าติวต่อชั่วโมง
                </p>
                <p className="text-4xl font-black text-slate-900">
                  ฿{tutor.hourlyRate.toLocaleString()}
                  <span className="text-sm font-medium text-slate-400">
                    /ชม.
                  </span>
                </p>
              </div>

              <BookingCta tutor={tutor} variant="sidebar" />

              <ChatCta tutor={tutor} />

              <div className="pt-4 border-t border-slate-100 flex items-start gap-3 text-[11px] text-slate-500 leading-relaxed">
                <ShieldCheck
                  size={14}
                  className="text-emerald-600 mt-0.5 shrink-0"
                />
                <span>
                  เงินจะอยู่ใน Escrow จนกว่าคลาสจะเสร็จและไม่มี Report
                  ภายใน 24 ชม. ปลอดภัย 100%
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky mobile booking CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              ค่าติว
            </p>
            <p className="text-xl font-black text-slate-900 leading-tight">
              ฿{tutor.hourlyRate.toLocaleString()}
              <span className="text-xs font-medium text-slate-400">/ชม.</span>
            </p>
          </div>
          <BookingCta tutor={tutor} variant="mobile-bar" />
        </div>
      </div>
    </div>
  );
}
