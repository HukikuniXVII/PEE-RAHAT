"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";

/**
 * FR-TH-02 dashboard nudge for tutors who haven't filled in bank info.
 * Lives at the top of /tutors/me/edit alongside the Google connect card —
 * the de-facto tutor dashboard for "what's blocking my listing from
 * appearing in search". Same Required/Connected visual grammar as
 * GoogleCalendarCard so the consequences are obvious at a glance.
 */
export function BankStatusBanner() {
  const status = useQuery({
    queryKey: ["tutors", "me", "bank"],
    queryFn: () => createApiClient().tutors.bank.get(),
  });
  const connected = !!status.data;

  return (
    <section
      className={`rounded-[40px] border shadow-sm p-8 md:p-10 space-y-4 ${
        connected
          ? "bg-white border-slate-200"
          : "bg-amber-50/60 border-amber-200"
      }`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">
            บัญชีรับเงิน
          </p>
          <h2 className="text-xl font-black text-slate-900">
            บัญชีธนาคารสำหรับโอนค่าตอบแทน
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md">
            แอดมินใช้ข้อมูลนี้โอนค่าตอบแทนทุกวันที่ 15 และ 30 ของเดือน
          </p>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full whitespace-nowrap">
            <CheckCircle2 size={12} />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 rounded-full whitespace-nowrap">
            <AlertTriangle size={12} />
            Required
          </span>
        )}
      </header>

      {!connected && (
        <div className="bg-white border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle
            size={16}
            className="text-amber-500 shrink-0 mt-0.5"
          />
          <p className="text-xs text-amber-800 leading-relaxed">
            โปรไฟล์ของพี่จะ <strong>ไม่ปรากฏในผลค้นหา</strong> จนกว่าจะมีข้อมูลบัญชีรับเงิน
          </p>
        </div>
      )}

      <Link
        href={"/tutors/me/bank" as Route}
        className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all ${
          connected
            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        <Wallet size={14} />
        {connected ? "จัดการบัญชีรับเงิน" : "เพิ่มข้อมูลบัญชีรับเงิน"}
      </Link>
    </section>
  );
}
