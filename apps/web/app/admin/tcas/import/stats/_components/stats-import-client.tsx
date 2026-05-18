"use client";

import type {
  TcasCommitResult,
  TcasRound,
  TcasStatsPreviewResponse,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { CheckCircle2, Upload } from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { ImportPreviewTable } from "../../../_components/import-preview";

const ROUND_OPTIONS: Array<{ value: TcasRound; label: string }> = [
  { value: "r1_portfolio", label: "รอบ 1 Portfolio" },
  { value: "r2_quota_kku_netsat", label: "รอบ 2 โควตา KKU" },
  { value: "r3_admission", label: "รอบ 3 Admission" },
  { value: "r4_direct", label: "รอบ 4 รับตรง" },
];

interface Props {
  accessToken: string;
}

export function StatsImportClient({ accessToken }: Props) {
  const api = createApiClient({ accessToken });
  const [year, setYear] = useState<number>(2568);
  const [round, setRound] = useState<TcasRound>("r3_admission");
  const [filename, setFilename] = useState<string>("");
  const [preview, setPreview] = useState<TcasStatsPreviewResponse | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<TcasCommitResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setCommitResult(null);
    setPreview(null);
    setPreviewing(true);
    setFilename(file.name);
    try {
      const res = await api.admin.tcas.previewStats(file, { year, round });
      setPreview(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await api.admin.tcas.commitStats(preview.uploadId);
      setCommitResult(res);
      setPreview(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCommitting(false);
    }
  }

  function reset() {
    setPreview(null);
    setCommitResult(null);
    setFilename("");
    setError(null);
  }

  const canCommit = preview && preview.summary.error === 0 && !committing;

  return (
    <div className="space-y-6">
      {!preview && !commitResult && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              ระบุปี + รอบของไฟล์
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">
                  ปี (พ.ศ.)
                </label>
                <input
                  type="number"
                  min={2560}
                  max={2580}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-24 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-600">
                  รอบ
                </label>
                <select
                  value={round}
                  onChange={(e) => setRound(e.target.value as TcasRound)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
                >
                  {ROUND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <label
            htmlFor="stats-file"
            className={cn(
              "block p-10 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all",
              previewing
                ? "border-emerald-400 bg-emerald-50/60 animate-pulse"
                : "border-slate-300 bg-white hover:border-emerald-300",
            )}
          >
            <Upload size={28} className="mx-auto text-emerald-500 mb-3" />
            <p className="font-bold text-slate-700">
              {previewing
                ? "กำลังประมวลผล..."
                : "เลือกไฟล์ CSV หรือ XLSX (สถิติคะแนน)"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              สูงสุด 5 MB • ปวงพ. xlsx ใช้ได้โดยตรง
            </p>
            <input
              id="stats-file"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={previewing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                ตัวอย่างจาก
              </p>
              <p className="font-mono text-sm text-slate-700">{filename}</p>
              <p className="text-xs text-slate-500 mt-1">
                ปี {year} • รอบ {round} • ทั้งหมด {preview.summary.total} แถว
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!canCommit}
                onClick={handleCommit}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  canCommit
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed",
                )}
              >
                {committing
                  ? "กำลังบันทึก..."
                  : preview.summary.error > 0
                    ? "แก้แถวที่ผิดพลาดก่อน"
                    : "ยืนยันบันทึก"}
              </button>
            </div>
          </div>
          <ImportPreviewTable rows={preview.rows} summary={preview.summary} />
        </div>
      )}

      {commitResult && (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={20} />
            <p className="font-bold">บันทึกเรียบร้อย</p>
          </div>
          <p className="text-sm text-emerald-700">
            เพิ่ม {commitResult.inserted} แถว • อัปเดต {commitResult.updated}{" "}
            แถว • ข้าม {commitResult.skipped} แถว
          </p>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-xl bg-white text-emerald-700 text-sm font-bold border border-emerald-200 hover:bg-emerald-50"
          >
            อัปโหลดอีกไฟล์
          </button>
        </div>
      )}
    </div>
  );
}
