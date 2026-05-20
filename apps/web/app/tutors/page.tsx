import { type Subject, subjectSchema } from "@peerahat/types";
import { Card, PageBackground } from "@peerahat/ui";
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
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="space-y-8">
        {/* Hero — frosted brand surface on warm backdrop */}
        <Card
          variant="frosted"
          className="p-8 sm:p-10 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between"
        >
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
              <ShieldCheck size={12} />
              Verified Tutors
            </div>
            <h1
              className="thai font-bold text-grape-deep leading-[1.15]"
              style={{
                fontSize: "clamp(28px, 2.6vw, 40px)",
                letterSpacing: "-0.02em",
              }}
            >
              ค้นหาพี่รหัสที่ใช่
            </h1>
            <p className="thai text-[15px] text-ink-soft leading-relaxed">
              พี่รหัสทุกคนผ่านการยืนยันตัวตน • ปลอดภัย ไร้กังวล
            </p>
          </div>

          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/70 border border-white shadow-[0_8px_18px_-8px_rgba(85,65,139,0.25)] shrink-0">
            <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center text-white shadow-[0_8px_18px_-8px_rgba(85,65,139,0.55)]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
                Verified
              </p>
              <p className="text-2xl font-bold leading-none mt-0.5 text-grape-deep">
                {initial.total}
              </p>
            </div>
          </div>
        </Card>

        <TutorSearch
          initialResult={initial}
          initialSubject={subject}
          initialQuery={searchParams.q ?? ""}
        />
      </div>
    </>
  );
}
