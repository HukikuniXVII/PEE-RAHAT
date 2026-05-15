"use client";

import type { AdminKycDetail } from "@peerahat/types";
import { Button } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AdminPassbookBlock } from "@/components/admin-passbook-block";
import { createApiClient } from "@/lib/api-client";

interface Props {
  submission: AdminKycDetail;
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

export function ReviewForm({ submission }: Props) {
  const router = useRouter();
  const [bankChecked, setBankChecked] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const review = useMutation({
    mutationFn: (vars: { decision: "approve" | "reject"; reason?: string }) =>
      createApiClient().admin.reviewKyc(submission.id, vars.decision, vars.reason),
    onSuccess: (_, vars) => {
      toast.success(
        vars.decision === "approve"
          ? "อนุมัติ KYC เรียบร้อย"
          : "ปฏิเสธ KYC เรียบร้อย",
      );
      router.push("/admin/kyc" as Route);
      router.refresh();
    },
    onError: (err: Error) =>
      toast.error(err.message || "ตรวจสอบ KYC ไม่สำเร็จ กรุณาลองใหม่"),
  });

  const alreadyReviewed = submission.status !== "pending";

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              ส่งเมื่อ
            </p>
            <p className="text-sm font-bold text-slate-700">
              {formatDateTime(submission.submittedAt)}
            </p>
          </div>
          <span
            className={
              submission.status === "pending"
                ? "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200"
                : submission.status === "verified"
                  ? "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200"
            }
          >
            {submission.status}
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <PhotoTile label="บัตรประชาชน" url={submission.idPhotoUrl} />
          <PhotoTile label="เซลฟี่" url={submission.selfieUrl} />
          <PhotoTile label="ทรานสคริปต์" url={submission.transcriptUrl} />
        </div>

        {submission.idName && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              ชื่อ-นามสกุลตามบัตรประชาชน
            </p>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {submission.idName}
            </p>
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <header className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-emerald-600" />
          <h2 className="text-lg font-black text-slate-900">
            ข้อมูลบัญชีรับเงิน
          </h2>
        </header>
        <AdminPassbookBlock
          passbook={submission.passbook}
          expectedHolderName={submission.idName}
        />
      </section>

      {submission.rejectionReason && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">
            เหตุผลที่ปฏิเสธก่อนหน้านี้
          </p>
          <p className="text-sm text-rose-800 mt-1">
            {submission.rejectionReason}
          </p>
        </div>
      )}

      {!alreadyReviewed && (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-indigo-600 shrink-0"
              checked={bankChecked}
              onChange={(e) => setBankChecked(e.target.checked)}
              disabled={!submission.passbook || review.isPending}
            />
            <span className="text-sm text-slate-700 leading-relaxed">
              <span className="font-bold">ตรวจสอบข้อมูลบัญชีแล้ว</span> —
              สมุดบัญชี ตรงกับเลขที่บัญชี และชื่อบัญชีตรงกับชื่อในบัตรประชาชน
              <br />
              <span className="text-[11px] text-slate-500">
                จำเป็นต้องติ๊กก่อนกดอนุมัติ
              </span>
            </span>
          </label>

          {rejecting ? (
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                เหตุผลที่ปฏิเสธ
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น ภาพไม่ชัด หรือชื่อบัญชีไม่ตรงกับบัตรประชาชน"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRejecting(false);
                    setReason("");
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!reason.trim() || review.isPending}
                  onClick={() =>
                    review.mutate({
                      decision: "reject",
                      reason: reason.trim(),
                    })
                  }
                >
                  {review.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  ยืนยันการปฏิเสธ
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="default"
                onClick={() => setRejecting(true)}
                disabled={review.isPending}
              >
                <XCircle size={14} />
                ปฏิเสธ
              </Button>
              <Button
                variant="success"
                size="default"
                onClick={() => review.mutate({ decision: "approve" })}
                disabled={
                  review.isPending || !bankChecked || !submission.passbook
                }
              >
                {review.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                อนุมัติ
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function PhotoTile({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
        {label}
      </p>
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-200 border border-slate-200 group-hover:border-indigo-400 transition-colors">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </a>
  );
}
