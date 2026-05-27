"use client";

import type { AdminPaymentRow } from "@peerahat/types";
import {
  Button,
  Dialog,
  DialogContent,
  cn,
} from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { createApiClient } from "@/lib/api-client";
import { useMutationWithToast } from "@/lib/hooks/use-mutation-with-toast";

type Tab = "pending" | "success" | "failed";

interface Props {
  initialPending: AdminPaymentRow[];
  initialSuccess: AdminPaymentRow[];
  initialFailed: AdminPaymentRow[];
}

const TAB_LABEL: Record<Tab, string> = {
  pending: "รออนุมัติ",
  success: "สำเร็จ",
  failed: "ล้มเหลว",
};

const STATUS_COLOR: Record<string, string> = {
  pending_transfer: "bg-slate-100 text-slate-600",
  slip_uploaded: "bg-amber-50 text-amber-700",
  verifying: "bg-amber-50 text-amber-700",
  held_in_escrow: "bg-emerald-50 text-emerald-700",
  released: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
  refunded: "bg-slate-100 text-slate-600",
  disputed: "bg-rose-50 text-rose-700",
};

const EMPTY_COPY: Record<Tab, string> = {
  pending: "ไม่มีสลิปที่รออนุมัติในขณะนี้",
  success: "ยังไม่มีสลิปที่ผ่านการตรวจ",
  failed: "ยังไม่มีสลิปที่ล้มเหลว",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentsTable({
  initialPending,
  initialSuccess,
  initialFailed,
}: Props) {
  const [tab, setTab] = useState<Tab>("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  // FR-PM-01: slip-preview modal. Holds the payment id whose signed URL
  // we're currently fetching/showing; null = modal closed. We don't cache
  // URLs across opens because the signed link expires in 5 min.
  const [slipPreviewId, setSlipPreviewId] = useState<string | null>(null);

  const pending = useQuery({
    queryKey: ["admin", "payments", { status: "pending" }],
    queryFn: () =>
      createApiClient().admin.paymentsQueue({ status: "pending" }),
    initialData: initialPending,
  });
  const success = useQuery({
    queryKey: ["admin", "payments", { status: "success" }],
    queryFn: () =>
      createApiClient().admin.paymentsQueue({ status: "success" }),
    initialData: initialSuccess,
  });
  const failed = useQuery({
    queryKey: ["admin", "payments", { status: "failed" }],
    queryFn: () =>
      createApiClient().admin.paymentsQueue({ status: "failed" }),
    initialData: initialFailed,
  });

  // FR-PM-01: fetch slip bytes through the API proxy and render via a
  // blob URL. Earlier rev fetched a signed S3 URL and rendered it directly
  // in <img>; admins kept seeing broken images because of cross-origin /
  // signed-URL host quirks against MinIO. Going through the API means
  // the browser never talks to MinIO.
  const slipUrlQuery = useQuery({
    queryKey: ["admin", "payments", "slip", slipPreviewId],
    queryFn: () => createApiClient().admin.paymentSlipBlob(slipPreviewId!),
    enabled: !!slipPreviewId,
    // Re-fetch on every open — blob URLs are local handles, no point caching.
    staleTime: 0,
    gcTime: 0,
  });

  // Revoke the blob URL when the modal closes or swaps rows so we don't
  // pin slip bytes in memory across opens.
  useEffect(() => {
    const url = slipUrlQuery.data?.blobUrl;
    if (!url) return;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [slipUrlQuery.data?.blobUrl]);

  const approve = useMutationWithToast({
    mutationFn: (id: string) => createApiClient().admin.approvePayment(id),
    successMessage: "อนุมัติการชำระเงินแล้ว",
    errorMessage: true,
    invalidateKeys: [["admin", "payments"]],
  });

  const reject = useMutationWithToast({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      createApiClient().admin.rejectPayment(id, reason),
    successMessage: "ปฏิเสธสลิปแล้ว",
    errorMessage: true,
    invalidateKeys: [["admin", "payments"]],
    onSuccess: () => {
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const rows =
    (tab === "pending"
      ? pending.data
      : tab === "success"
        ? success.data
        : failed.data) ?? [];
  const canAct = tab === "pending" || tab === "failed";

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["pending", "success", "failed"] as const).map((t) => {
          const data =
            t === "pending"
              ? pending.data
              : t === "success"
                ? success.data
                : failed.data;
          return (
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
              {TAB_LABEL[t]}
              <span className="ml-2 text-[10px] opacity-70">
                ({data?.length ?? 0})
              </span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-sm text-slate-400">
          {EMPTY_COPY[tab]}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-4 font-bold">Payer</th>
                <th className="text-left p-4 font-bold">Item</th>
                <th className="text-right p-4 font-bold">Amount</th>
                <th className="text-left p-4 font-bold">Status</th>
                <th className="text-left p-4 font-bold">When</th>
                {canAct && <th className="text-right p-4 font-bold">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 align-top">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">
                      {r.payerDisplayName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                      {r.payerId}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600">
                        {r.itemType}
                      </span>
                      {r.slipObjectKey && (
                        <button
                          type="button"
                          onClick={() => setSlipPreviewId(r.id)}
                          title="ดูสลิป"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                        >
                          <ImageIcon size={11} />
                          ดูสลิป
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-[200px]">
                      {r.bookingId ?? r.sheetId}
                    </p>
                  </td>
                  <td className="p-4 text-right font-black text-slate-900 whitespace-nowrap">
                    ฿{r.amountThb.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest",
                        STATUS_COLOR[r.status] ?? "bg-slate-100 text-slate-600",
                      )}
                    >
                      {r.status}
                    </span>
                    {r.transactionId && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Txn: {r.transactionId}
                      </p>
                    )}
                    {r.failureReason && (
                      <p className="text-[10px] text-rose-600 mt-1 max-w-[200px]">
                        {r.failureReason}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(r.createdAt)}
                  </td>
                  {canAct && (
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
                              disabled={
                                !rejectReason.trim() || reject.isPending
                              }
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
                            disabled={
                              approve.isPending && approve.variables === r.id
                            }
                          >
                            {approve.isPending &&
                            approve.variables === r.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            Approve
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FR-PM-01: slip preview. Image renders inline for png/jpg/heic;
          PDFs (rare but possible) fall back to a click-to-open link since
          inline <embed> support varies and a signed URL is good as a tab. */}
      <Dialog
        open={!!slipPreviewId}
        onOpenChange={(open) => {
          if (!open) setSlipPreviewId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-grape-deep flex items-center gap-2">
                <ImageIcon size={16} />
                สลิปการโอนเงิน
              </h2>
              <button
                type="button"
                onClick={() => setSlipPreviewId(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ปิด
              </button>
            </div>

            {slipUrlQuery.isLoading && (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}

            {slipUrlQuery.isError && (
              <div className="py-12 text-center text-sm text-rose-600">
                โหลดสลิปไม่สำเร็จ — อาจถูกลบหรือ session หมดอายุ
              </div>
            )}

            {slipUrlQuery.data &&
              (slipUrlQuery.data.contentType === "application/pdf" ? (
                <a
                  href={slipUrlQuery.data.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-50 text-violet-700 text-sm font-bold hover:bg-violet-100 transition-colors"
                >
                  <FileText size={16} />
                  เปิดสลิป (PDF) ในแท็บใหม่
                  <ExternalLink size={14} className="ml-auto" />
                </a>
              ) : (
                <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={slipUrlQuery.data.blobUrl}
                    alt="Payment slip"
                    className="w-full h-auto max-h-[70vh] object-contain bg-white"
                  />
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
