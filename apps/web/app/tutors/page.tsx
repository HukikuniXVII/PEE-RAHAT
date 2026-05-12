import { type Subject, subjectSchema } from "@peerahat/types";
import { ShieldCheck, Star, UserPlus } from "lucide-react";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { TutorSearch } from "./_components/tutor-search";

interface Props {
  searchParams: { subject?: string; q?: string };
}

const SUBJECTS = ["All", ...subjectSchema.options] as const;

function parseSubjectParam(raw: string | undefined): Subject | "All" {
  if (!raw || raw === "All") return "All";
  return subjectSchema.safeParse(raw).data ?? "All";
}

export default async function TutorsPage({ searchParams }: Props) {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const subject = parseSubjectParam(searchParams.subject);
  const initial = await api.tutors.search({
    q: searchParams.q,
    subject: subject === "All" ? undefined : subject,
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="space-y-12">
      <section className="relative rounded-[40px] bg-indigo-600 p-8 md:p-12 overflow-hidden text-white">
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} />
              Verified Tutors
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              พี่ติวมหา&apos;ลัยชั้นนำ <br />
              <span className="text-indigo-200">ผ่านการยืนยันตัวตน 100%</span>
            </h2>
            <p className="text-indigo-100 text-lg">
              ทุกพี่ติวต้องส่งบัตรประชาชนและทรานสคริปต์ให้ Admin ตรวจสอบ ก่อนได้ Verified Badge
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-xl px-8 py-6 rounded-[32px] border border-white/20 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <Star size={24} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                Verified Tutors
              </p>
              <p className="text-3xl font-black leading-none mt-1">{initial.total}</p>
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
              {SUBJECTS.map((s) => {
                const active = subject === s;
                return (
                  <Link
                    key={s}
                    href={s === "All" ? "/tutors" : `/tutors?subject=${s}`}
                    className={
                      active
                        ? "px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-100 text-left"
                        : "px-4 py-2 rounded-xl text-sm font-bold bg-white text-slate-500 border border-slate-200 hover:border-indigo-600 text-left"
                    }
                  >
                    {s}
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
            initialSubject={subject}
            initialResult={initial}
          />
        </div>
      </div>
    </div>
  );
}
