import { GraduationCap } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

export default async function AdminTcasImportPage() {
  const token = await requireAdmin("/admin/tcas/import");
  const audit = await createApiClient({ accessToken: token }).admin.tcas
    .listImports()
    .catch(() => []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
          <GraduationCap size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            นำเข้าข้อมูล TCAS
          </h1>
          <p className="text-sm text-slate-500">
            เลือกประเภทไฟล์ที่จะอัปโหลด — ระบบจะแสดงผลตัวอย่างก่อนยืนยันบันทึก
          </p>
        </div>
      </header>

      <Link
        href={"/admin/tcas/import/criteria" as Route}
        className="block p-6 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all"
      >
        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-2">
          Criteria
        </p>
        <h3 className="font-bold text-slate-800 mb-1">
          เกณฑ์การรับเข้า (CSV)
        </h3>
        <p className="text-xs text-slate-500">
          อัปโหลดเกณฑ์แอดมิชชั่น/โควตา รวมน้ำหนักวิชา TGAT/TPAT/A-Level/NetSat
        </p>
      </Link>

      <Link
        href={"/admin/tcas/exam-catalogue" as Route}
        className="inline-block text-sm font-bold text-indigo-600 hover:underline"
      >
        ดูตารางรหัสวิชา (exam catalogue) →
      </Link>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          ประวัติการนำเข้าล่าสุด
        </h2>
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left p-3">เวลา</th>
                <th className="text-left p-3">ประเภท</th>
                <th className="text-left p-3">ไฟล์</th>
                <th className="text-right p-3">เพิ่ม</th>
                <th className="text-right p-3">อัปเดต</th>
                <th className="text-right p-3">ข้าม</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 text-xs">
                  <td className="p-3 text-slate-500">
                    {new Date(row.importedAt).toLocaleString("th-TH")}
                  </td>
                  <td className="p-3 font-bold text-slate-700">{row.kind}</td>
                  <td className="p-3 text-slate-600 truncate max-w-[280px]">
                    {row.filename}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-600">
                    {row.inserted}
                  </td>
                  <td className="p-3 text-right font-bold text-amber-600">
                    {row.updated}
                  </td>
                  <td className="p-3 text-right text-slate-400">
                    {row.skipped}
                  </td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                    ยังไม่มีประวัติการนำเข้า
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
