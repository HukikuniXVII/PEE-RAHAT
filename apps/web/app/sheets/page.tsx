import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

import { SheetGrid } from "@/components/sheet-grid";
import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

interface Props {
  searchParams: { subject?: string; q?: string };
}

export default async function SheetsPage({ searchParams }: Props) {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const initial = await api.sheets.list(
    searchParams.subject && searchParams.subject !== "All"
      ? // biome-ignore lint: bridged from URL param
        (searchParams.subject as never)
      : undefined,
    searchParams.q,
  );

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            Sheet Marketplace
          </h2>
          <p className="text-slate-500 max-w-2xl font-medium leading-relaxed">
            แหล่งรวมชีทสรุปคุณภาพจากพี่ๆ มหาวิทยาลัยชั้นนำ <br />
            มั่นใจด้วยระบบ{" "}
            <span className="text-indigo-600 font-bold">Escrow</span>{" "}
            เงินจะถึงมือผู้ขายเมื่อคุณได้รับไฟล์แล้วเท่านั้น
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sheet Library
            </p>
            <p className="text-2xl font-bold text-slate-800 tracking-tight">
              {initial.total.toLocaleString()} Items
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <BookOpen size={24} />
          </div>
        </div>
        <Link
          href="/sheets/upload"
          className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-200 flex flex-col justify-center gap-3 group"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tutor Hub
          </p>
          <span className="flex items-center gap-2 text-sm font-black hover:text-indigo-300 transition-colors">
            อยากเป็นผู้ขายชีท?
            <ChevronRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </span>
        </Link>
      </div>

      <SheetGrid initial={initial} initialSubject={searchParams.subject ?? "All"} />
    </div>
  );
}
