"use client";

import type { AdminPayoutRow } from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initialUnpaid: AdminPayoutRow[];
  initialPaid: AdminPayoutRow[];
}

type Tab = "unpaid" | "paid";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function PayoutsTable({ initialUnpaid, initialPaid }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("unpaid");
  const [period, setPeriod] = useState(defaultPeriod);

  const unpaid = useQuery({
    queryKey: ["admin", "payouts", { paid: false }],
    queryFn: () => createApiClient().admin.payouts({ paid: false }),
    initialData: initialUnpaid,
  });
  const paid = useQuery({
    queryKey: ["admin", "payouts", { paid: true }],
    queryFn: () => createApiClient().admin.payouts({ paid: true }),
    initialData: initialPaid,
  });

  const compute = useMutation({
    mutationFn: () =>
      createApiClient().admin.computePayouts({
        periodStart: new Date(period.start).toISOString(),
        periodEnd: new Date(period.end).toISOString(),
      }),
    onSuccess: (rows) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      toast.success(`คำนวณ payouts แล้ว: ${rows.length} รายการ`);
    },
    onError: (e) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => createApiClient().admin.markPayoutPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      toast.success("Marked as paid");
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = tab === "unpaid" ? unpaid.data ?? [] : paid.data ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Period start
          </label>
          <input
            type="date"
            value={period.start}
            onChange={(e) =>
              setPeriod((p) => ({ ...p, start: e.target.value }))
            }
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Period end
          </label>
          <input
            type="date"
            value={period.end}
            onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={compute.isPending}
          onClick={() => compute.mutate()}
        >
          {compute.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Play size={12} />
          )}
          คำนวณ payouts
        </Button>
      </div>

      <div className="flex gap-2">
        {(["unpaid", "paid"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
              tab === t
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300",
            )}
          >
            {t === "unpaid" ? "Unpaid" : "Paid"}
            <span className="ml-2 text-[10px] opacity-70">
              ({(t === "unpaid" ? unpaid.data : paid.data)?.length ?? 0})
            </span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-sm text-slate-400">
          {tab === "unpaid"
            ? "ไม่มี payout ที่ยังไม่จ่าย"
            : "ยังไม่มี payout ที่จ่ายแล้ว"}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-4 font-bold">Tutor</th>
                <th className="text-left p-4 font-bold">Period</th>
                <th className="text-right p-4 font-bold">Gross</th>
                <th className="text-right p-4 font-bold">Commission</th>
                <th className="text-right p-4 font-bold">WHT</th>
                <th className="text-right p-4 font-bold">Net</th>
                <th className="text-left p-4 font-bold">Scheduled</th>
                <th className="text-right p-4 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">
                      {r.tutorDisplayName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                      {r.tutorId}
                    </p>
                  </td>
                  <td className="p-4 text-xs text-slate-600 whitespace-nowrap">
                    {formatDate(r.periodStart)} → {formatDate(r.periodEnd)}
                  </td>
                  <td className="p-4 text-right text-slate-700 whitespace-nowrap">
                    ฿{r.grossThb.toLocaleString()}
                  </td>
                  <td className="p-4 text-right text-slate-500 whitespace-nowrap">
                    −฿{r.commissionThb.toLocaleString()}
                  </td>
                  <td className="p-4 text-right text-slate-500 whitespace-nowrap">
                    −฿{r.withholdingTaxThb.toLocaleString()}
                  </td>
                  <td className="p-4 text-right font-black text-emerald-600 whitespace-nowrap">
                    ฿{r.netThb.toLocaleString()}
                  </td>
                  <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(r.scheduledAt)}
                    {r.transferredAt && (
                      <p className="text-[10px] text-emerald-600">
                        Paid {formatDate(r.transferredAt)}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {r.transferredAt ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={12} />
                        Paid
                      </span>
                    ) : (
                      <Button
                        size="compact"
                        variant="success"
                        disabled={
                          markPaid.isPending && markPaid.variables === r.id
                        }
                        onClick={() => markPaid.mutate(r.id)}
                      >
                        {markPaid.isPending && markPaid.variables === r.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        Mark paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
