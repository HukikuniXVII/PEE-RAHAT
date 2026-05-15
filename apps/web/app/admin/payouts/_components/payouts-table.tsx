"use client";

import type { AdminPayoutQueueGroup, AdminPayoutRow } from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleSlash,
  Loader2,
  Play,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initialUnpaid: AdminPayoutRow[];
  initialPaid: AdminPayoutRow[];
}

type Tab = "pending" | "completed";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function nextBatchDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  // Next 15th or 30th, whichever comes first.
  const fifteenth = new Date(y, m, 15);
  const thirtieth = new Date(y, m, 30);
  let target: Date;
  if (d < 15) target = fifteenth;
  else if (d < 30) target = thirtieth;
  else target = new Date(y, m + 1, 15);
  return target.toISOString().slice(0, 10);
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

export function PayoutsTable({ initialUnpaid, initialPaid }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [batchDate, setBatchDate] = useState(nextBatchDate);

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
  const queue = useQuery({
    queryKey: ["admin", "payouts", "queue"],
    queryFn: () => createApiClient().admin.payoutQueue(),
  });

  const generate = useMutation({
    mutationFn: () =>
      createApiClient().admin.generatePayoutBatch({
        batchDate: new Date(batchDate).toISOString(),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      toast.success(`สร้าง batch แล้ว: ${res.count} รายการ`);
    },
    onError: (e) => toast.error(e.message),
  });

  const [transferring, setTransferring] = useState<AdminPayoutRow | null>(null);
  const [failing, setFailing] = useState<AdminPayoutRow | null>(null);

  const rows = tab === "pending" ? unpaid.data ?? [] : paid.data ?? [];
  const pendingRows = rows.filter((r) =>
    tab === "pending" ? r.status !== "completed" : r.status === "completed",
  );

  return (
    <div className="space-y-6">
      {/* Next-batch queue preview */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">
              คิวรอจ่ายงวดถัดไป
            </h2>
            <p className="text-xs text-slate-500">
              {queue.data?.length ?? 0} ติวเตอร์ • ห้องที่จบและพ้น report
              window แล้ว
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Batch date
              </label>
              <input
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <Button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || (queue.data?.length ?? 0) === 0}
            >
              {generate.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              Generate batch for {formatDate(new Date(batchDate).toISOString())}
            </Button>
          </div>
        </div>

        {queue.data && queue.data.length > 0 ? (
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left p-3 font-bold">Tutor</th>
                  <th className="text-right p-3 font-bold">Classes</th>
                  <th className="text-right p-3 font-bold">Gross</th>
                  <th className="text-right p-3 font-bold">Commission</th>
                  <th className="text-right p-3 font-bold">WHT</th>
                  <th className="text-right p-3 font-bold">Net to transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.data.map((g: AdminPayoutQueueGroup) => (
                  <tr key={g.tutorId} className="hover:bg-slate-50/40">
                    <td className="p-3">
                      <p className="font-bold text-slate-800">
                        {g.tutorDisplayName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        PromptPay: {g.tutorPromptPay ?? "—"}
                      </p>
                    </td>
                    <td className="p-3 text-right text-slate-600">
                      {g.classCount}
                    </td>
                    <td className="p-3 text-right text-slate-600 whitespace-nowrap">
                      ฿{g.grossThb.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-slate-500 whitespace-nowrap">
                      −฿{g.commissionThb.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-slate-500 whitespace-nowrap">
                      −฿{g.withholdingTaxThb.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-600 whitespace-nowrap">
                      ฿{g.netThb.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">
            ยังไม่มีคลาสที่พร้อมจ่ายงวดนี้
          </p>
        )}
      </section>

      {/* Existing payouts (per status) */}
      <div className="flex gap-2">
        {(["pending", "completed"] as const).map((t) => (
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
            {t === "pending" ? "Pending / Failed" : "Completed"}
            <span className="ml-2 text-[10px] opacity-70">
              ({(t === "pending" ? unpaid.data : paid.data)?.length ?? 0})
            </span>
          </button>
        ))}
      </div>

      {pendingRows.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-sm text-slate-400">
          {tab === "pending"
            ? "ไม่มี payout ที่ยังไม่ได้โอน"
            : "ยังไม่มี payout ที่โอนแล้ว"}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-4 font-bold">Tutor</th>
                <th className="text-left p-4 font-bold">Period</th>
                <th className="text-right p-4 font-bold">Gross</th>
                <th className="text-right p-4 font-bold">Net</th>
                <th className="text-left p-4 font-bold">Status</th>
                <th className="text-right p-4 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingRows.map((r) => (
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
                  <td className="p-4 text-right font-black text-emerald-600 whitespace-nowrap">
                    ฿{r.netThb.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border",
                        STATUS_TONE[r.status] ??
                          "bg-slate-100 text-slate-600 border-slate-200",
                      )}
                    >
                      {r.status}
                    </span>
                    {r.transferredAt && (
                      <p className="text-[10px] text-emerald-600 mt-1">
                        Transferred {formatDate(r.transferredAt)}
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate">
                        {r.notes}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {r.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={12} />
                        Paid
                      </span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="compact"
                          variant="success"
                          onClick={() => setTransferring(r)}
                        >
                          <Upload size={12} />
                          ทำเครื่องหมายว่าโอนแล้ว
                        </Button>
                        <button
                          type="button"
                          onClick={() => setFailing(r)}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          <CircleSlash size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {transferring && (
        <MarkTransferredDialog
          payout={transferring}
          onClose={() => setTransferring(null)}
          onDone={() => {
            setTransferring(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
          }}
        />
      )}
      {failing && (
        <FailPayoutDialog
          payout={failing}
          onClose={() => setFailing(null)}
          onDone={() => {
            setFailing(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
          }}
        />
      )}
    </div>
  );
}

// ─── dialogs ────────────────────────────────────────────────────────────────

function MarkTransferredDialog({
  payout,
  onClose,
  onDone,
}: {
  payout: AdminPayoutRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("กรุณาแนบสลิปการโอน");
      return;
    }
    setBusy(true);
    try {
      // Same scaffold pattern as payment-dialog: real upload goes through
      // a signed PUT to R2. Until that endpoint is wired here we synthesize
      // a deterministic key from the payout id.
      const slipObjectKey = `payouts/${payout.id}/${file.name}`;
      await createApiClient().admin.markPayoutTransferred(payout.id, {
        slipObjectKey,
        notes: notes.trim() || undefined,
      });
      toast.success("ทำเครื่องหมายว่าโอนแล้ว");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Mark transferred
            </p>
            <h3 className="text-lg font-black text-slate-900">
              {payout.tutorDisplayName}
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              ยอดโอน ฿{payout.netThb.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              สลิปการโอน
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="block w-full mt-1 text-xs"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
              placeholder="ref number / bank reference"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

function FailPayoutDialog({
  payout,
  onClose,
  onDone,
}: {
  payout: AdminPayoutRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (reason.trim().length < 3) {
      toast.error("กรุณาระบุเหตุผล");
      return;
    }
    setBusy(true);
    try {
      await createApiClient().admin.failPayout(payout.id, {
        reason: reason.trim(),
      });
      toast.success("Marked failed — intents returned to queue");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">
              Mark failed
            </p>
            <h3 className="text-lg font-black text-slate-900">
              {payout.tutorDisplayName}
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              ฿{payout.netThb.toLocaleString()} → กลับเข้าคิวรอจ่ายงวดถัดไป
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Reason
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
            placeholder="เช่น PromptPay number ไม่ถูกต้อง / บัญชีปิด"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CircleSlash size={14} />
            )}
            Mark failed
          </button>
        </div>
      </div>
    </div>
  );
}
