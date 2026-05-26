"use client";

import type { AdminBankChangeItem } from "@peerahat/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, X } from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";
import { useMutationWithToast } from "@/lib/hooks/use-mutation-with-toast";

interface Props {
  initial: AdminBankChangeItem[];
}

export function BankChangesList({ initial }: Props) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "bank-changes"],
    queryFn: () => createApiClient().admin.bankChanges.list(),
    initialData: initial,
    refetchOnWindowFocus: true,
  });
  const items = data ?? initial;

  if (items.length === 0) {
    return (
      <section className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-12 text-center space-y-3">
        <Clock size={32} className="text-slate-300 mx-auto" strokeWidth={1.8} />
        <p className="thai text-base font-bold text-slate-700">
          ไม่มีคำขอที่รออนุมัติ
        </p>
        <p className="thai text-sm text-slate-500">
          เมื่อติวเตอร์ส่งคำขอแก้ไขข้อมูลบัญชี รายการจะปรากฏที่นี่
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {items.map((item) => (
        <BankChangeRow
          key={item.tutorId}
          item={item}
          onChanged={() =>
            queryClient.invalidateQueries({
              queryKey: ["admin", "bank-changes"],
            })
          }
        />
      ))}
    </section>
  );
}

function BankChangeRow({
  item,
  onChanged,
}: {
  item: AdminBankChangeItem;
  onChanged: () => void;
}) {
  const [showFull, setShowFull] = useState(false);

  const approve = useMutationWithToast({
    mutationFn: () => createApiClient().admin.bankChanges.approve(item.tutorId),
    successMessage: "อนุมัติแล้ว",
    errorMessage: true,
    onSuccess: onChanged,
  });
  const reject = useMutationWithToast({
    mutationFn: () => createApiClient().admin.bankChanges.reject(item.tutorId),
    successMessage: "ปฏิเสธคำขอแล้ว",
    errorMessage: true,
    onSuccess: onChanged,
  });

  const pending = item.pending;
  const current = item.current;
  const busy = approve.isPending || reject.isPending;
  const maskAccount = (num: string) =>
    num.length <= 4 ? num : `•••• •••• ${num.slice(-4)}`;

  return (
    <article className="bg-white rounded-[32px] border border-amber-200 shadow-sm p-6 md:p-8 space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-0.5 min-w-0">
          <p className="thai text-base font-black text-slate-900">
            {item.displayName}
          </p>
          <p className="text-[12px] text-slate-500">{item.email}</p>
          <p className="thai text-[11px] text-slate-400">{item.university}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 rounded-full whitespace-nowrap">
          <Clock size={12} />
          รอตรวจสอบ ·{" "}
          {new Date(pending.submittedAt).toLocaleString("th-TH")}
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <p className="thai text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            บัญชีปัจจุบัน (ยังใช้งานอยู่)
          </p>
          {current ? (
            <dl className="space-y-1">
              <dd className="thai text-sm font-bold text-slate-800">
                {current.bankName}
              </dd>
              <dd className="text-[13px] font-mono text-slate-700 tracking-wider">
                {showFull ? current.accountNumber : maskAccount(current.accountNumber)}
              </dd>
              <dd className="thai text-[12px] text-slate-600">
                {current.accountName}
              </dd>
            </dl>
          ) : (
            <p className="thai text-sm text-slate-400">
              ไม่มีบัญชีเดิมในระบบ
            </p>
          )}
        </div>

        <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-4">
          <p className="thai text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">
            ข้อมูลใหม่ที่รอตรวจสอบ
          </p>
          <dl className="space-y-1">
            <dd className="thai text-sm font-bold text-amber-900">
              {pending.bankName}
            </dd>
            <dd className="text-[13px] font-mono text-amber-900 tracking-wider">
              {showFull ? pending.accountNumber : maskAccount(pending.accountNumber)}
            </dd>
            <dd className="thai text-[12px] text-amber-800">
              {pending.accountName}
            </dd>
            <dd className="thai text-[11px] text-amber-700 pt-1">
              ชื่อตามบัตรประชาชน: <strong>{pending.idName}</strong>
            </dd>
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowFull((v) => !v)}
          className="text-[12px] font-semibold text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
        >
          {showFull ? "ซ่อนเลขบัญชีเต็ม" : "แสดงเลขบัญชีเต็ม"}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => reject.mutate()}
          disabled={busy}
          className="thai inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X size={14} />
          ปฏิเสธ
        </button>
        <button
          type="button"
          onClick={() => approve.mutate()}
          disabled={busy}
          className="thai inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Check size={14} />
          อนุมัติคำขอ
        </button>
      </div>
    </article>
  );
}
