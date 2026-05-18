import { BookOpen } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

export default async function AdminTcasCataloguePage() {
  const token = await requireAdmin("/admin/tcas/exam-catalogue");
  const entries = await createApiClient({ accessToken: token }).admin.tcas
    .examCatalogue()
    .catch(() => []);

  // Group by system so the operator can scan quickly when copying keys
  // into a CSV.
  const byGroup = new Map<string, typeof entries>();
  for (const e of entries) {
    const arr = byGroup.get(e.system) ?? [];
    arr.push(e);
    byGroup.set(e.system, arr);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
          <BookOpen size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Link href={"/admin/tcas/import" as Route} className="hover:underline">
              นำเข้า TCAS
            </Link>
            {" / "}Exam Catalogue
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            ตารางรหัสวิชา
          </h1>
          <p className="text-sm text-slate-500">
            คีย์ที่ใช้ในคอลัมน์ <code className="font-mono">components</code> ของ
            CSV — ก๊อปได้เลย
          </p>
        </div>
      </header>

      {Array.from(byGroup.entries()).map(([system, items]) => (
        <section key={system} className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">
            {system}
          </h2>
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left p-3 w-40">key</th>
                  <th className="text-left p-3">ชื่อวิชา</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.key} className="border-t border-slate-100 text-xs">
                    <td className="p-3 font-mono text-indigo-700">{e.key}</td>
                    <td className="p-3 text-slate-700">{e.nameTh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">
        ต้องการเพิ่มรหัสวิชาใหม่? แก้ไขไฟล์{" "}
        <code className="font-mono">apps/api/src/tcas/exam-catalogue.ts</code> แล้ว
        deploy ใหม่
      </p>
    </div>
  );
}
