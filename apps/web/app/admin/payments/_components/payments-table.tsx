"use client";

import type { AdminPaymentRow } from "@peerahat/types";
import { Button } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initial: AdminPaymentRow[];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentsTable({ initial }: Props) {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queue = useQuery({
    queryKey: ["admin", "payments", "queue"],
    queryFn: () => createApiClient().admin.paymentsQueue(),
    initialData: initial,
  });

  const approve = useMutation({
    mutationFn: (id: string) => createApiClient().admin.approvePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
      toast.success("อนุมัติการชำระเงินแล้ว");
    },
    onError: (e) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      createApiClient().admin.rejectPayment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
      setRejectingId(null);
      setRejectReason("");
      toast.success("ปฏิเสธสลิปแล้ว");
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = queue.data ?? [];

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-sm text-slate-400">
        ไม่มีสลิปที่รออนุมัติในขณะนี้
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
          <tr>
            <th className="text-left p-4 font-bold">Payer</th>
            <th className="text-left p-4 font-bold">Item</th>
            <th className="text-right p-4 font-bold">Amount</th>
            <th className="text-left p-4 font-bold">Status</th>
            <th className="text-left p-4 font-bold">When</th>
            <th className="text-right p-4 font-bold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/50 align-top">
              <td className="p-4">
                <p className="font-bold text-slate-800">{r.payerDisplayName}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                  {r.payerId}
                </p>
              </td>
              <td className="p-4">
                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600">
                  {r.itemType}
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-[200px]">
                  {r.bookingId ?? r.sheetId}
                </p>
              </td>
              <td className="p-4 text-right font-black text-slate-900 whitespace-nowrap">
                ฿{r.amountThb.toLocaleString()}
              </td>
              <td className="p-4">
                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700">
                  {r.status}
                </span>
                {r.slipOkRef && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    SlipOK: {r.slipOkRef}
                  </p>
                )}
              </td>
              <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                {formatDateTime(r.createdAt)}
              </td>
              <td className="p-4 text-right">
                {rejectingId === r.id ? (
                  <div className="flex flex-col gap-2 items-end">
                    <input
                      autoFocus
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="เหตุผลที่ปฏิเสธ"
                      className="w-48 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="compact"
                        variant="ghost"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        size="compact"
                        variant="destructive"
                        disabled={!rejectReason.trim() || reject.isPending}
                        onClick={() =>
                          reject.mutate({
                            id: r.id,
                            reason: rejectReason.trim(),
                          })
                        }
                      >
                        {reject.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <XCircle size={12} />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="compact"
                      variant="ghost"
                      onClick={() => setRejectingId(r.id)}
                    >
                      <XCircle size={12} />
                      Reject
                    </Button>
                    <Button
                      size="compact"
                      variant="success"
                      onClick={() => approve.mutate(r.id)}
                      disabled={approve.isPending && approve.variables === r.id}
                    >
                      {approve.isPending && approve.variables === r.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      Approve
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
