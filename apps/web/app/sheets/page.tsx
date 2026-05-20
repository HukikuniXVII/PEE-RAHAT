import { type Subject, subjectSchema } from "@peerahat/types";
import { BookOpen, ChevronRight } from "lucide-react";
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
    <div className="space-y-8">
      <div className="grid md:grid-cols-4 gap-5">
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-violet-700">
            Sheet Marketplace
          </h2>
          <p className="text-neutral-500 max-w-2xl font-medium leading-relaxed thai">
            แหล่งรวมชีทสรุปคุณภาพจากพี่ๆ มหาวิทยาลัยชั้นนำ <br />
            มั่นใจด้วยระบบ{" "}
            <span className="text-violet-500 font-bold">Escrow</span>{" "}
            เงินจะถึงมือผู้ขายเมื่อคุณได้รับไฟล์แล้วเท่านั้น
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-card flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Sheet Library
            </p>
            <p className="text-2xl font-bold text-neutral-800 tracking-tight">
              {initial.total.toLocaleString()} Items
            </p>
          </div>
          <div className="w-12 h-12 bg-grape-soft text-violet-500 rounded-xl flex items-center justify-center">
            <BookOpen size={22} />
          </div>
        </div>

        <Link
          href={"/sheets/upload" as Route}
          className="bg-violet-700 p-6 rounded-xl text-white shadow-lg shadow-violet-100 flex flex-col justify-center gap-2 group hover:bg-violet-800 transition-colors"
        >
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider">
            Tutor Hub
          </p>
          <span className="flex items-center gap-2 text-sm font-bold group-hover:text-accent-500 transition-colors thai">
            อยากเป็นผู้ขายชีท?
            <ChevronRight
              size={16}
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
  );
}
