"use client";

import type { AdminKycQueueItem } from "@peerahat/types";
import { Button } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initial: AdminKycQueueItem[];
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

export function KycQueue({ initial }: Props) {
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ["admin", "kyc", "queue"],
    queryFn: () => createApiClient().admin.kycQueue(),
    initialData: initial,
  });
  const items = queueQuery.data ?? [];

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-sm text-slate-400">
        ไม่มี KYC ที่รออนุมัติในขณะนี้
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <SubmissionCard
          key={item.id}
          item={item}
          onReviewed={() =>
            queryClient.invalidateQueries({
              queryKey: ["admin", "kyc", "queue"],
            })
          }
        />
      ))}
    </div>
  );
}

function SubmissionCard({
  item,
  onReviewed,
}: {
  item: AdminKycQueueItem;
  onReviewed: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const review = useMutation({
    mutationFn: (vars: { decision: "approve" | "reject"; reason?: string }) =>
      createApiClient().admin.reviewKyc(item.id, vars.decision, vars.reason),
    onSuccess: (_, vars) => {
      toast.success(
        vars.decision === "approve"
          ? "อนุมัติ KYC เรียบร้อย"
          : "ปฏิเสธ KYC เรียบร้อย",
      );
      setRejecting(false);
      setReason("");
      onReviewed();
    },
    onError: () => toast.error("ตรวจสอบ KYC ไม่สำเร็จ กรุณาลองใหม่"),
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-900">
            {item.userDisplayName}
          </h2>
          <p className="text-xs text-slate-500">{item.userEmail}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            ส่งเมื่อ
          </p>
          <p className="text-xs text-slate-600">{formatDateTime(item.submittedAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-50">
        <PhotoTile label="บัตรประชาชน" url={item.idPhotoUrl} />
        <PhotoTile label="เซลฟี่" url={item.selfieUrl} />
        <PhotoTile label="ทรานสคริปต์" url={item.transcriptUrl} />
      </div>

      <div className="p-5 space-y-3">
        {rejecting ? (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              เหตุผลที่ปฏิเสธ
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น ภาพไม่ชัด หรือเอกสารไม่ตรงกับชื่อบัญชี"
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
                  review.mutate({ decision: "reject", reason: reason.trim() })
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
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejecting(true)}
              disabled={review.isPending}
            >
              <XCircle size={14} />
              ปฏิเสธ
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => review.mutate({ decision: "approve" })}
              disabled={review.isPending}
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
      </div>
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
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
