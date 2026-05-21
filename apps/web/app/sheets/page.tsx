import { type Subject, subjectSchema } from "@peerahat/types";
import { Card, PageBackground } from "@peerahat/ui";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { SheetGrid } from "./_components/sheet-grid";

interface Props {
  searchParams: { subject?: string; q?: string };
}

function parseSubjectParam(raw: string | undefined): Subject | "All" {
  if (!raw || raw === "All") return "All";
  return subjectSchema.safeParse(raw).data ?? "All";
}

export default async function SheetsPage({ searchParams }: Props) {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const subject = parseSubjectParam(searchParams.subject);
  const initialQuery = searchParams.q ?? "";
  const initial = await api.sheets.list({
    subject: subject === "All" ? undefined : subject,
    q: initialQuery || undefined,
    page: 1,
    pageSize: 20,
  });

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="space-y-8">
        <div className="grid md:grid-cols-4 gap-5">
          {/* Heading */}
          <div className="md:col-span-2 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
              Sheet Marketplace
            </div>
            <h1
              className="thai font-bold text-grape-deep leading-[1.15]"
              style={{
                fontSize: "clamp(28px, 2.6vw, 40px)",
                letterSpacing: "-0.02em",
              }}
            >
              ชีทสรุปจาก
              <span className="text-dusty-grape"> รุ่นพี่ตัวจริง</span>
            </h1>
            <p className="thai text-[15px] text-ink-soft leading-relaxed max-w-2xl">
              แหล่งรวมชีทสรุปคุณภาพจากพี่ๆ มหาวิทยาลัยชั้นนำ มั่นใจด้วย{" "}
              <span className="text-dusty-grape font-semibold">ระบบพักเงินตัวกลาง</span>{" "}
              เงินถึงมือผู้ขายเมื่อคุณได้รับไฟล์แล้วเท่านั้น
            </p>
          </div>

          {/* Stat tile */}
          <Card variant="glass" className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-ink-mute uppercase tracking-widest">
                Sheet Library
              </p>
              <p className="text-2xl font-bold text-grape-deep tracking-tight leading-none">
                {initial.total.toLocaleString()}
              </p>
              <p className="text-[10px] font-bold text-ink-mute uppercase tracking-wider">
                Items
              </p>
            </div>
            <div className="w-12 h-12 bg-violet-500 text-white rounded-xl flex items-center justify-center shadow-[0_8px_18px_-8px_rgba(85,65,139,0.55)]">
              <BookOpen size={22} />
            </div>
          </Card>

          {/* Upload CTA — grape filled, gold hover (Hero CTA aesthetic) */}
          <Link
            href={"/sheets/upload" as Route}
            className="group rounded-[22px] bg-dusty-grape text-white p-6 flex flex-col justify-center gap-2 shadow-[0_12px_28px_-18px_rgba(85,65,139,0.6)] hover:bg-accent-500 hover:text-neutral-800 hover:-translate-y-0.5 hover:shadow-accent-500/30 transition-all"
          >
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest group-hover:text-neutral-800/60">
              Tutor Hub
            </p>
            <span className="thai flex items-center gap-2 text-sm font-bold">
              อยากเป็นผู้ขายชีท?
              <ArrowRight
                size={16}
                strokeWidth={2.5}
                className="group-hover:translate-x-1 transition-transform"
              />
            </span>
          </Link>
        </div>

        <SheetGrid
          initial={initial}
          initialSubject={subject}
          initialQuery={initialQuery}
        />
      </div>
    </>
  );
}
