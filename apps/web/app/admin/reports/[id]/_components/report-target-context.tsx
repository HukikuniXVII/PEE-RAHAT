"use client";

import type { ReportTargetContext } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { Star } from "lucide-react";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-700">{value}</span>
    </div>
  );
}

/** Renders the report's target by type for the admin detail right column. */
export function ReportTargetContext({
  context,
}: {
  context: ReportTargetContext;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
        เป้าหมายที่ถูกรายงาน
      </h2>

      {context.kind === "missing" && (
        <p className="text-sm font-medium text-slate-400">
          ไม่พบเป้าหมาย — อาจถูกลบไปแล้วหรือเป็นข้อมูลเก่า
        </p>
      )}

      {context.kind === "booking" && (
        <div>
          <Row label="วิชา" value={context.subject} />
          <Row label="สถานะ" value={context.status} />
          <Row
            label="เวลาเรียน"
            value={new Date(context.scheduledAt).toLocaleString("th-TH")}
          />
          <Row
            label="ยอดเงิน"
            value={`฿${context.amountThb.toLocaleString()}`}
          />
          <Row label="สถานะ escrow" value={context.escrowStatus ?? "—"} />
          <Row label="นักเรียน" value={context.studentName} />
          <Row label="ติวเตอร์" value={context.tutorName} />
          <Row
            label="defectCount ติวเตอร์"
            value={String(context.tutorDefectCount)}
          />
        </div>
      )}

      {context.kind === "chat_message" && (
        <div className="space-y-2">
          {context.bypassMatch && (
            <span className="inline-block rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
              🚩 ระบบตรวจพบ: บายพาส
            </span>
          )}
          <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl bg-slate-50 p-3">
            {context.thread.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs",
                  m.isReported
                    ? "border border-rose-200 bg-rose-50"
                    : "bg-white",
                )}
              >
                <p className="text-[10px] font-bold text-slate-400">
                  {m.authorLabel}
                </p>
                <p className="text-slate-700">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {context.kind === "sheet" && (
        <div>
          <Row label="ชื่อชีท" value={context.title} />
          <Row label="วิชา" value={context.subject} />
          <Row label="ราคา" value={`฿${context.priceThb.toLocaleString()}`} />
          <Row label="ยอดขาย" value={String(context.salesCount)} />
          <Row label="ผู้ขาย" value={context.authorName} />
          <Row label="ถูกซ่อนแล้ว" value={context.removed ? "ใช่" : "ไม่"} />
        </div>
      )}

      {context.kind === "review" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                fill={n <= context.rating ? "currentColor" : "none"}
              />
            ))}
          </div>
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {context.text}
          </p>
          <Row label="นักเรียน (ผู้เขียน)" value={context.studentName} />
          <Row label="ติวเตอร์" value={context.tutorName} />
          <Row label="ถูกซ่อนแล้ว" value={context.removed ? "ใช่" : "ไม่"} />
        </div>
      )}

      {context.kind === "community_post" && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800">{context.title}</p>
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {context.content}
          </p>
          <Row label="ผู้เขียน" value={context.authorName} />
          <Row label="ถูกซ่อนแล้ว" value={context.removed ? "ใช่" : "ไม่"} />
        </div>
      )}
    </section>
  );
}
