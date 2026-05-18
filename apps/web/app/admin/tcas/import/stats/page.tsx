import { BarChart3 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

import { StatsImportClient } from "./_components/stats-import-client";

export default async function AdminTcasStatsImportPage() {
  const token = await requireAdmin("/admin/tcas/import/stats");

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
          <BarChart3 size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Link href={"/admin/tcas/import" as Route} className="hover:underline">
              นำเข้า TCAS
            </Link>
            {" / "}Past Stats
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            อัปโหลดสถิติคะแนนปีที่ผ่านมา
          </h1>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 text-xs">
        <a
          href="/tcas/templates/tcas_stats_template.csv"
          download
          className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
        >
          ดาวน์โหลดเทมเพลต CSV
        </a>
        <a
          href="/tcas/templates/tcas_stats_sample.csv"
          download
          className="px-3 py-1.5 rounded-full bg-slate-50 text-slate-700 font-bold border border-slate-200"
        >
          ดาวน์โหลดตัวอย่าง
        </a>
        <span className="px-3 py-1.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
          รองรับไฟล์ XLSX ของปวงพ. ได้โดยตรง (ไม่ต้องแปลงเป็น CSV)
        </span>
      </div>

      <StatsImportClient accessToken={token} />
    </div>
  );
}
