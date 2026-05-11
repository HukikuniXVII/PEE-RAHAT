"use client";

import type { StudySheet } from "@peerahat/types";
import { Button } from "@peerahat/ui";
import { AlertTriangle, ShieldCheck, Star, Wallet } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { PaymentDialog } from "@/components/payment-dialog";
import { createApiClient } from "@/lib/api-client";

interface Props {
  sheet: StudySheet;
}

export function SheetDetail({ sheet }: Props) {
  const [purchasing, setPurchasing] = useState(false);

  const report = useMutation({
    mutationFn: () =>
      createApiClient().sheets.report({
        sheetId: sheet.id,
        reason: "copyright",
        details: "Reported via UI",
      }),
    meta: { toast: "ส่งรายงานไม่สำเร็จ" },
    onSuccess: () => {
      toast.success("ส่งรายงานเรียบร้อย ทีมงานจะตรวจสอบโดยเร็ว");
    },
  });

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <main className="lg:col-span-2 space-y-6">
          <header className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8 md:p-10 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg">
                {sheet.subject}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                <Star size={12} fill="currentColor" />
                {sheet.rating.toFixed(1)} ({sheet.reviewCount})
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              {sheet.title}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {sheet.sellerDisplayName} • {sheet.sellerUniversity} •{" "}
              {sheet.sellerFaculty}
            </p>
          </header>

          {sheet.previewImageUrls.length > 0 && (
            <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Preview ({sheet.previewImageUrls.length}/{sheet.pageCount})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {sheet.previewImageUrls.map((url, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] rounded-2xl bg-slate-50 overflow-hidden border border-slate-100"
                  >
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {sheet.introVideoUrl && (
            <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Sample Intro
              </h2>
              <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900">
                <video
                  src={sheet.introVideoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
            </section>
          )}

          <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Description
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {sheet.description}
            </p>
          </section>
        </main>

        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Price
              </p>
              <p className="text-4xl font-black text-slate-900">
                ฿{sheet.priceThb.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">
                {sheet.pageCount} หน้า — ส่งไฟล์ทันทีหลังชำระเงิน
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => setPurchasing(true)}
              disabled={sheet.isSuspended}
              className="w-full text-sm font-black shadow-lg shadow-indigo-100"
            >
              <Wallet size={18} />
              {sheet.isSuspended ? "ระงับชั่วคราว" : "Buy Now"}
            </Button>

            <Button
              variant="muted"
              size="sm"
              onClick={() => report.mutate()}
              disabled={report.isPending || report.isSuccess}
              className="w-full"
            >
              <AlertTriangle size={14} />
              {report.isSuccess ? "Reported" : "Report Sheet"}
            </Button>

            <div className="pt-4 border-t border-slate-100 flex items-start gap-3 text-[10px] text-slate-500 leading-relaxed">
              <ShieldCheck size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <span>
                เงินจะอยู่ใน Escrow จนกว่าคุณจะกดยืนยันรับไฟล์ ปลอดภัย 100%
              </span>
            </div>
          </div>
        </aside>
      </div>

      {purchasing && (
        <PaymentDialog
          itemType="sheet"
          itemId={sheet.id}
          amountThb={sheet.priceThb}
          payeeLabel={sheet.sellerDisplayName}
          onClose={() => setPurchasing(false)}
        />
      )}
    </>
  );
}
