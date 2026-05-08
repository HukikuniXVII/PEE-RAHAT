import { Sparkles, Star, UserPlus } from "lucide-react";
import Link from "next/link";

import { TutorSearch } from "@/components/tutor-search";
import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

interface Props {
  searchParams: { subject?: string; q?: string };
}

const SUBJECTS = [
  "All",
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Social",
  "Thai",
] as const;

export default async function TutorsPage({ searchParams }: Props) {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const initial = await api.tutors.search({
    q: searchParams.q,
    subject:
      searchParams.subject && searchParams.subject !== "All"
        ? // biome-ignore lint: type is widened on purpose for the URL bridge
          (searchParams.subject as never)
        : undefined,
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="space-y-12">
      <section className="relative rounded-[40px] bg-indigo-600 p-8 md:p-12 overflow-hidden text-white">
        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              Featured Feature
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              ไม่รู้จะเริ่มติว <br />
              <span className="text-indigo-200">วิชาไหนดี?</span>
            </h2>
            <p className="text-indigo-100 text-lg max-w-md">
              ลองทำแบบทดสอบวัดระดับ (Diagnostic Quiz) เพื่อหาจุดอ่อนและติวเตอร์ที่เข้ากับคุณที่สุด
            </p>
            <Link
              href="/quiz"
              className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-lg hover:bg-slate-50 transition-all transform hover:-translate-y-1 shadow-xl shadow-indigo-900/20"
            >
              Take Diagnostic Quiz
            </Link>
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
                  <p className="text-2xl font-black">{initial.total}+</p>
                </div>
                <p className="text-[10px] leading-relaxed opacity-80">
                  จากทุกคณะชั้นนำทั่วประเทศไทย ผ่านการยืนยันตัวตน 100%
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Filter by Subject
            </h4>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {SUBJECTS.map((subject) => {
                const active = (searchParams.subject ?? "All") === subject;
                return (
                  <Link
                    key={subject}
                    href={
                      subject === "All"
                        ? "/tutors"
                        : `/tutors?subject=${subject}`
                    }
                    className={
                      active
                        ? "px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-100 text-left"
                        : "px-4 py-2 rounded-xl text-sm font-bold bg-white text-slate-500 border border-slate-200 hover:border-indigo-600 text-left"
                    }
                  >
                    {subject}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">
              ร่วมเป็นส่วนหนึ่งของทีม
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              คุณเป็นนิสิต/นักศึกษาที่มีไฟใจรักการสอนใช่ไหม? สมัครเป็นติวเตอร์กับเราวันนี้
            </p>
            <Link
              href="/tutors/onboarding"
              className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              สมัครเป็นติวเตอร์
            </Link>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <TutorSearch
            initialQuery={searchParams.q ?? ""}
            initialSubject={searchParams.subject ?? "All"}
            initialResult={initial}
          />
        </div>
      </div>
    </div>
  );
}
