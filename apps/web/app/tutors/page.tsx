import { type Subject, subjectSchema } from "@peerahat/types";
import { ShieldCheck, Sparkles } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { TutorSearch } from "./_components/tutor-search";

interface Props {
  searchParams: { subject?: string; q?: string };
}

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
    <div className="space-y-8">
      {/* Hero banner */}
      <section className="rounded-xl bg-violet-700 text-white p-8 sm:p-10 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/80">
            <ShieldCheck size={12} />
            Verified Tutors
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight thai">
            ค้นหาพี่ติวที่ใช่
            <br />
            <span className="text-accent-500">ยืนยันตัวตน 100% • Escrow</span>
          </h1>
          <p className="text-sm text-white/70 thai">
            ทุกพี่ติวผ่านการยืนยันบัตรประชาชนและทรานสคริปต์ • คืนเงิน 100% ภายใน 24 ชม.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl px-5 py-4 rounded-xl border border-white/15 shrink-0">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Verified
            </p>
            <p className="text-2xl font-bold leading-none mt-0.5">
              {initial.total}
            </p>
          </div>
        </div>
      </section>

      <TutorSearch
        initialResult={initial}
        initialSubject={subject}
        initialQuery={searchParams.q ?? ""}
      />
    </div>
  );
}
