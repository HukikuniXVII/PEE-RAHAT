"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@peerahat/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  EvidenceUploader,
  type EvidenceItem,
} from "@/app/_components/evidence-uploader";
import { createApiClient } from "@/lib/api-client";

interface Props {
  reportId: string;
  onClose: () => void;
}

/**
 * Follow-up comment dialog (FR-CM-05) — lets the reporter send extra
 * information or evidence while a report is still open. Reuses the shared
 * EvidenceUploader.
 */
export function ReportCommentDialog({ reportId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const trimmed = text.trim();

  const submit = useMutation({
    mutationFn: () =>
      createApiClient().reports.addComment(reportId, {
        text: trimmed,
        evidenceKeys: evidence.map((e) => e.objectKey),
      }),
    onSuccess: () => {
      toast.success("เพิ่มข้อมูลเรียบร้อย");
      queryClient.invalidateQueries({
        queryKey: ["reports", "detail", reportId],
      });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed && !submit.isPending) submit.mutate();
          }}
          className="space-y-5 p-8"
        >
          <div className="space-y-2">
            <DialogTitle>เพิ่มข้อมูล / หลักฐาน</DialogTitle>
            <DialogDescription className="text-xs">
              ส่งข้อมูลเพิ่มเติมให้แอดมินระหว่างที่กำลังตรวจสอบเรื่องของคุณ
            </DialogDescription>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="comment-text"
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              ข้อความ
            </label>
            <textarea
              id="comment-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder="เล่าข้อมูลเพิ่มเติมที่อยากให้ทีมงานทราบ"
              className="min-h-[100px] w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              หลักฐาน (ไม่บังคับ)
            </label>
            <EvidenceUploader value={evidence} onChange={setEvidence} />
          </div>

          {submit.error && (
            <p className="text-xs font-medium text-rose-600">
              {submit.error.message}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="muted"
              onClick={onClose}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={!trimmed || submit.isPending}
              className="flex-1"
            >
              {submit.isPending ? "กำลังส่ง..." : "ส่ง"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
