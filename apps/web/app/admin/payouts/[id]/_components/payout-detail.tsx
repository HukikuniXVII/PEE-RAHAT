"use client";

import type { AdminPayoutDetail } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { AdminPassbookBlock } from "@/components/admin-passbook-block";

interface Props {
  payout: AdminPayoutDetail;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

export function PayoutDetail({ payout }: Props) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <main className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                งวด
              </p>
              <p className="text-sm font-bold text-slate-700 mt-1">
                {formatDate(payout.periodStart)} →{" "}
                {formatDate(payout.periodEnd)}
              </p>
            </div>
            <span
              className={cn(
                "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                STATUS_TONE[payout.status] ??
                  "bg-slate-100 text-slate-600 border-slate-200",
              )}
            >
              {payout.status}
            </span>
          </div>

          <dl className="grid sm:grid-cols-2 gap-3">
            <Money label="Gross" value={payout.grossThb} muted />
            <Money
              label="Commission"
              value={-payout.commissionThb}
              muted
              negative
            />
            <Money
              label="Withholding tax"
              value={-payout.withholdingTaxThb}
              muted
              negative
            />
            <Money label="Net to transfer" value={payout.netThb} emphasis />
          </dl>

          {payout.transferredAt && (
            <p className="text-xs text-emerald-700 font-bold flex items-center gap-2 pt-2 border-t border-slate-100">
              <ShieldCheck size={14} />
              โอนแล้วเมื่อ {formatDate(payout.transferredAt)}
            </p>
          )}
          {payout.notes && (
            <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-600">Note:</span>{" "}
              {payout.notes}
            </p>
          )}
        </section>
      </main>

      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-6 space-y-4">
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <header className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <h2 className="text-sm font-black text-slate-900">
                บัญชีรับเงิน
              </h2>
            </header>
            <AdminPassbookBlock
              passbook={payout.passbook}
              amountThb={payout.netThb}
            />
          </section>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2.5">
            <AlertTriangle
              size={16}
              className="text-amber-600 mt-0.5 shrink-0"
            />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              ตรวจสอบให้ตรงก่อนโอน — ไม่สามารถยกเลิกการโอนได้
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Money({
  label,
  value,
  muted,
  negative,
  emphasis,
}: {
  label: string;
  value: number;
  muted?: boolean;
  negative?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-black",
          emphasis
            ? "text-2xl text-emerald-600"
            : muted
              ? "text-sm text-slate-600"
              : "text-base text-slate-800",
          negative && !emphasis && "text-slate-500",
        )}
      >
        {negative ? "−" : ""}฿{Math.abs(value).toLocaleString()}
      </p>
    </div>
  );
}
