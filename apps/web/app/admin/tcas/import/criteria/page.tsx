import { FileSpreadsheet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

import { CriteriaImportClient } from "./_components/criteria-import-client";

export default async function AdminTcasCriteriaImportPage() {
  const token = await requireAdmin("/admin/tcas/import/criteria");

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
          <FileSpreadsheet size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Link href={"/admin/tcas/import" as Route} className="hover:underline">
              นำเข้า TCAS
            </Link>
            {" / "}Criteria
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            อัปโหลดเกณฑ์การรับเข้า
          </h1>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 text-xs">
        <a
          href="/tcas/templates/tcas_criteria_template.csv"
          download
          className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
        >
          ดาวน์โหลดเทมเพลต
        </a>
        <a
          href="/tcas/templates/tcas_criteria_sample.csv"
          download
          className="px-3 py-1.5 rounded-full bg-slate-50 text-slate-700 font-bold border border-slate-200"
        >
          ดาวน์โหลดตัวอย่าง
        </a>
      </div>

      <CriteriaImportClient accessToken={token} />
    </div>
  );
}
