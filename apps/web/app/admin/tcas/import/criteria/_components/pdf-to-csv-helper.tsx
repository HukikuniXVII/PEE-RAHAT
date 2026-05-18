"use client";

import type { TcasRound } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { FileDown, FileType2 } from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

const ROUND_OPTIONS: Array<{ value: TcasRound; label: string }> = [
  { value: "r1_portfolio", label: "รอบ 1 Portfolio" },
  { value: "r2_quota_kku_netsat", label: "รอบ 2 โควตา (KKU NetSat)" },
  { value: "r3_admission", label: "รอบ 3 Admission" },
  { value: "r4_direct", label: "รอบ 4 รับตรง" },
];

interface Props {
  accessToken: string;
}

export function PdfToCsvHelper({ accessToken }: Props) {
  const api = createApiClient({ accessToken });
  const [university, setUniversity] = useState("");
  const [round, setRound] = useState<TcasRound>("r3_admission");
  const [admissionYear, setAdmissionYear] = useState<number>(2569);
  const [sourceUrl, setSourceUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilename, setLastFilename] = useState<string | null>(null);

  const canParse =
    university.trim().length > 0 && file !== null && !parsing;

  async function handleParse() {
    if (!file) return;
    setError(null);
    setLastFilename(null);
    setParsing(true);
    try {
      const blob = await api.admin.tcas.parseCriteriaPdf(file, {
        university: university.trim(),
        round,
        admissionYear,
        sourceUrl: sourceUrl.trim() || undefined,
      });
      // Trigger a download. The server set Content-Disposition with a
      // filename, but anchor download attribute drives the actual save dialog.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = file.name.replace(/\.pdf$/i, "");
      a.href = url;
      a.download = `${base || "tcas-criteria"}-draft.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setLastFilename(`${base}-draft.csv`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  return (
    <section className="p-6 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
          <FileType2 size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">
            นำเข้าจาก PDF (ช่วยเติม CSV)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            อัปโหลด PDF ของเกณฑ์การรับเข้า ระบบจะดาวน์โหลด CSV ตัวอย่างให้
            ทุกแถวจะมีคำว่า <code className="font-mono">{`# REVIEW`}</code> ในช่อง major —
            กรุณาตรวจสอบ + กรอกคอลัมน์ <code className="font-mono">components</code>{" "}
            ก่อนอัปโหลดผ่าน CSV ปกติด้านล่าง
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            มหาวิทยาลัย *
          </label>
          <input
            type="text"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder="จุฬาลงกรณ์มหาวิทยาลัย"
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            รอบ *
          </label>
          <select
            value={round}
            onChange={(e) => setRound(e.target.value as TcasRound)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold"
          >
            {ROUND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            ปี (พ.ศ.) *
          </label>
          <input
            type="number"
            min={2560}
            max={2580}
            value={admissionYear}
            onChange={(e) => setAdmissionYear(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            sourceUrl
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm"
          />
        </div>
      </div>

      <label
        htmlFor="pdf-file"
        className={cn(
          "block p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all",
          parsing
            ? "border-amber-400 bg-amber-50 animate-pulse"
            : file
              ? "border-amber-300 bg-white"
              : "border-amber-200 bg-white hover:border-amber-300",
        )}
      >
        <FileDown size={22} className="mx-auto text-amber-500 mb-2" />
        <p className="font-bold text-slate-700 text-sm">
          {parsing
            ? "กำลังประมวลผล PDF..."
            : file
              ? file.name
              : "เลือกไฟล์ .pdf"}
        </p>
        <p className="text-xs text-slate-400 mt-1">สูงสุด 5 MB</p>
        <input
          id="pdf-file"
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          disabled={parsing}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
        />
      </label>

      <div className="flex items-center justify-end gap-2">
        {file && !parsing && (
          <button
            type="button"
            onClick={() => setFile(null)}
            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
          >
            ล้างไฟล์
          </button>
        )}
        <button
          type="button"
          disabled={!canParse}
          onClick={handleParse}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
            canParse
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
          )}
        >
          {parsing ? "กำลังประมวลผล..." : "ดาวน์โหลด CSV ตัวอย่าง"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}
      {lastFilename && !error && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          ดาวน์โหลด <span className="font-mono">{lastFilename}</span>{" "}
          เรียบร้อย — เปิดไฟล์ใน Excel/Google Sheets แก้แถวที่มี{" "}
          <code className="font-mono">{`# REVIEW`}</code> และคอลัมน์{" "}
          <code className="font-mono">components</code> แล้วอัปโหลดผ่านการ์ดด้านล่าง
        </div>
      )}
    </section>
  );
}
