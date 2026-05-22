"use client";

import {
  componentKey,
  type ParsedProgramRow,
  type TcasAiParseResponse,
  type TcasCommitResult,
  type TcasRound,
  type TcasRowEdits,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { BulkActionBar } from "./bulk-action-bar";
import { BulkEditModal, type BulkEditApply } from "./bulk-edit-modal";
import { describeComponents, RowEditPanel } from "./row-edit-panel";
import { UndoToast } from "./undo-toast";

const ROUND_OPTIONS: Array<{ value: TcasRound; label: string }> = [
  { value: "r1_portfolio", label: "รอบ 1 Portfolio" },
  { value: "r2_quota_kku_netsat", label: "รอบ 2 โควตา (KKU NetSat)" },
  { value: "r3_admission", label: "รอบ 3 Admission" },
  { value: "r4_direct", label: "รอบ 4 รับตรง" },
];

// Whitelist matching seed conventions. The free-form field underneath
// covers anything that isn't in this short list.
const UNIVERSITIES = [
  "จุฬาลงกรณ์มหาวิทยาลัย",
  "มหาวิทยาลัยธรรมศาสตร์",
  "มหาวิทยาลัยเกษตรศาสตร์",
  "มหาวิทยาลัยมหิดล",
  "มหาวิทยาลัยขอนแก่น",
  "มหาวิทยาลัยเชียงใหม่",
];

type Stage = "upload" | "review" | "committed";
type ConfBand = "high" | "medium" | "low";
type Filter = "all" | ConfBand | "errors" | "chooseHighest";

interface Props {
  accessToken: string;
}

export function CriteriaAiImportClient({ accessToken }: Props) {
  const api = createApiClient({ accessToken });
  const [stage, setStage] = useState<Stage>("upload");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [university, setUniversity] = useState<string>(UNIVERSITIES[0]!);
  const [universityCustom, setUniversityCustom] = useState("");
  const [round, setRound] = useState<TcasRound>("r3_admission");
  const [year, setYear] = useState<number>(2569);
  const [sourceUrl, setSourceUrl] = useState("");
  const [allowFallback, setAllowFallback] = useState(true);

  // Review state
  const [parse, setParse] = useState<TcasAiParseResponse | null>(null);
  const [editedRows, setEditedRows] = useState<ParsedProgramRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [openRowIdx, setOpenRowIdx] = useState<number | null>(null);

  // FR-TC-02 bulk-edit state. selectedIds is keyed by row index — the
  // same identifier the rest of the file uses. Persists across filter
  // changes by design.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<{
    rows: ParsedProgramRow[];
    count: number;
  } | null>(null);

  // Result
  const [commitResult, setCommitResult] = useState<TcasCommitResult | null>(
    null,
  );

  const effectiveUniversity =
    university === "__other__" ? universityCustom.trim() : university;

  // ─── Actions ────────────────────────────────────────────────────────

  async function runParse() {
    if (!file || !effectiveUniversity) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.admin.tcas.parseAi(file, {
        university: effectiveUniversity,
        round,
        admissionYear: year,
        sourceUrl: sourceUrl.trim() || undefined,
        allowFallback,
      });
      setParse(res);
      setEditedRows(res.rows);
      setStage("review");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reparse() {
    if (!parse) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.admin.tcas.reparse(parse.uploadId);
      setParse(res);
      setEditedRows(res.rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (!parse) return;
    // Compute rowEdits by diffing edited vs the parse's original rows.
    const edits: TcasRowEdits = {};
    parse.rows.forEach((orig, i) => {
      const edited = editedRows[i];
      if (!edited) return;
      if (JSON.stringify(orig) !== JSON.stringify(edited)) {
        edits[String(i)] = edited;
      }
    });
    setBusy(true);
    setError(null);
    try {
      const res = await api.admin.tcas.commit(parse.uploadId, edits);
      setCommitResult(res);
      setStage("committed");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStage("upload");
    setError(null);
    setFile(null);
    setParse(null);
    setEditedRows([]);
    setCommitResult(null);
    setFilter("all");
    setOpenRowIdx(null);
    setSelectedIds(new Set());
    setBulkOpen(false);
    setUndoSnapshot(null);
  }

  // ─── Bulk-edit handlers (FR-TC-02) ─────────────────────────────────

  const toggleRow = useCallback((idx: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  function applyBulkEdit(payload: BulkEditApply) {
    // Snapshot first so undo restores the *pre-apply* state.
    setUndoSnapshot({ rows: editedRows.map((r) => structuredClone(r)), count: selectedIds.size });

    const next = editedRows.map((row, i) => {
      if (!selectedIds.has(i)) return row;
      // Apply weight edits — walk only "single" components.
      const exams = row.components.exams.map((c) => {
        if (c.type !== "single") return c;
        const key = componentKey(c.system, c.code);
        const w = payload.weights[key];
        if (w === undefined) return c;
        return { ...c, weight: w };
      });
      // Apply common-field edits.
      const f = payload.fields;
      return {
        ...row,
        components: {
          ...row.components,
          exams,
          gpaxMin: f.gpaxMin !== undefined ? f.gpaxMin : row.components.gpaxMin,
        },
        programType: f.programType !== undefined ? f.programType : row.programType,
        subTrack: f.subTrack !== undefined ? f.subTrack : row.subTrack,
        quotaSeats: f.quotaSeats !== undefined ? f.quotaSeats : row.quotaSeats,
        totalMinScore:
          f.totalMinScore !== undefined ? f.totalMinScore : row.totalMinScore,
      };
    });
    setEditedRows(next);
    setBulkOpen(false);
  }

  function undoBulkEdit() {
    if (!undoSnapshot) return;
    setEditedRows(undoSnapshot.rows);
    setUndoSnapshot(null);
  }

  // ─── Derived ────────────────────────────────────────────────────────

  const confidenceSummary = useMemo(() => {
    const acc = { high: 0, medium: 0, low: 0 };
    editedRows.forEach((r) => {
      if (r.confidence >= 0.8) acc.high++;
      else if (r.confidence >= 0.5) acc.medium++;
      else acc.low++;
    });
    return acc;
  }, [editedRows]);

  const errorRows = useMemo(
    () =>
      editedRows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => {
          if (!r.faculty || !r.major) return true;
          const sum = r.components.exams.reduce((a, e) => a + e.weight, 0);
          if (Math.abs(sum - 100) > 0.5) return true;
          return false;
        }),
    [editedRows],
  );

  const chooseHighestRows = useMemo(
    () =>
      editedRows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) =>
          r.components.exams.some((e) => e.type === "chooseHighest"),
        ),
    [editedRows],
  );

  const visibleRows = useMemo(() => {
    return editedRows
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => {
        if (filter === "all") return true;
        if (filter === "errors") return errorRows.some((er) => er.i === i);
        if (filter === "chooseHighest")
          return chooseHighestRows.some((ch) => ch.i === i);
        if (filter === "high") return r.confidence >= 0.8;
        if (filter === "medium")
          return r.confidence >= 0.5 && r.confidence < 0.8;
        return r.confidence < 0.5;
      });
  }, [editedRows, filter, errorRows, chooseHighestRows]);

  const canCommit = parse !== null && errorRows.length === 0 && !busy;

  // Selection-derived helpers for the action bar + modal.
  const selectedRows = useMemo(
    () => [...selectedIds].sort((a, b) => a - b).map((i) => editedRows[i]!).filter(Boolean),
    [selectedIds, editedRows],
  );
  const visibleSelectedCount = visibleRows.filter(({ i }) =>
    selectedIds.has(i),
  ).length;
  const allVisibleSelected =
    visibleRows.length > 0 && visibleSelectedCount === visibleRows.length;
  const someVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleRows.length;

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const { i } of visibleRows) next.delete(i);
      } else {
        for (const { i } of visibleRows) next.add(i);
      }
      return next;
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────

  if (stage === "committed" && commitResult) {
    return (
      <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
        <div className="flex items-center gap-3 text-emerald-700">
          <CheckCircle2 size={28} />
          <h2 className="text-xl font-black">บันทึกเรียบร้อย</h2>
        </div>
        <p className="text-sm text-emerald-700">
          เพิ่ม {commitResult.inserted} รายการ • อัปเดต {commitResult.updated}{" "}
          รายการ • ข้าม {commitResult.skipped} รายการ
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-white text-emerald-700 text-sm font-bold border border-emerald-200 hover:bg-emerald-50"
        >
          อัปโหลด PDF อีกไฟล์
        </button>
      </div>
    );
  }

  if (stage === "upload") {
    return (
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="p-6 rounded-2xl border border-violet-200 bg-violet-50/30 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="มหาวิทยาลัย *">
              <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-sm font-bold"
              >
                {UNIVERSITIES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="__other__">อื่น ๆ (กรอกเอง)</option>
              </select>
              {university === "__other__" && (
                <input
                  type="text"
                  value={universityCustom}
                  onChange={(e) => setUniversityCustom(e.target.value)}
                  placeholder="ชื่อมหาวิทยาลัย"
                  className="mt-2 w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-sm"
                />
              )}
            </Field>
            <Field label="รอบ *">
              <select
                value={round}
                onChange={(e) => setRound(e.target.value as TcasRound)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-sm font-bold"
              >
                {ROUND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ปี (พ.ศ.) *">
              <input
                type="number"
                min={2560}
                max={2580}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-sm font-bold"
              />
            </Field>
            <Field label="sourceUrl">
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-sm"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={allowFallback}
              onChange={(e) => setAllowFallback(e.target.checked)}
            />
            อนุญาตให้รีพาร์สด้วยโมเดลที่แม่นกว่าหากผลแรกมั่นใจต่ำ
            (เพิ่ม cost)
          </label>
        </div>

        <label
          htmlFor="ai-pdf"
          className={cn(
            "block p-10 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all",
            busy
              ? "border-violet-400 bg-violet-50 animate-pulse"
              : file
                ? "border-violet-300 bg-white"
                : "border-violet-200 bg-white hover:border-violet-300",
          )}
        >
          <Upload size={28} className="mx-auto text-violet-500 mb-3" />
          <p className="font-bold text-slate-700">
            {busy
              ? "AI กำลังสกัดข้อมูล..."
              : file
                ? file.name
                : "เลือกไฟล์ PDF ประกาศการรับสมัคร"}
          </p>
          <p className="text-xs text-slate-400 mt-1">สูงสุด 20 MB / 20 หน้า</p>
          <input
            id="ai-pdf"
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!file || !effectiveUniversity || busy}
            onClick={runParse}
            className={cn(
              "px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2",
              !file || !effectiveUniversity || busy
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-violet-600 text-white hover:bg-violet-700",
            )}
          >
            <Sparkles size={16} />
            {busy ? "กำลังวิเคราะห์..." : "วิเคราะห์ด้วย AI"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Review stage ────────────────────────────────────────────────────
  if (!parse) return null;

  return (
    <div className="space-y-4 relative">
      {error && <ErrorBanner message={error} />}

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-4 text-xs">
        <div>
          <span className="font-bold text-slate-700">{parse.modelUsed}</span>
          <span className="text-slate-400"> • {parse.rows.length} รายการ</span>
        </div>
        <div className="text-slate-500">
          {(parse.parseDurationMs / 1000).toFixed(1)}s •{" "}
          {(parse.promptTokens + parse.completionTokens).toLocaleString()} tokens •
          ~${parse.estimatedCostUsd.toFixed(4)}
        </div>
        <button
          type="button"
          onClick={reparse}
          disabled={busy}
          className="ml-auto px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw size={12} />
          วิเคราะห์ใหม่ด้วยโมเดลที่แม่นกว่า
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <ConfChip
          label={`🟢 ≥0.8 (${confidenceSummary.high})`}
          active={filter === "high"}
          onClick={() => setFilter(filter === "high" ? "all" : "high")}
        />
        <ConfChip
          label={`🟡 0.5-0.8 (${confidenceSummary.medium})`}
          active={filter === "medium"}
          onClick={() => setFilter(filter === "medium" ? "all" : "medium")}
        />
        <ConfChip
          label={`🔴 <0.5 (${confidenceSummary.low})`}
          active={filter === "low"}
          onClick={() => setFilter(filter === "low" ? "all" : "low")}
        />
        <ConfChip
          label={`⚠ Errors (${errorRows.length})`}
          active={filter === "errors"}
          onClick={() => setFilter(filter === "errors" ? "all" : "errors")}
          tone="rose"
        />
        <ConfChip
          label={`🎚 chooseHighest (${chooseHighestRows.length})`}
          active={filter === "chooseHighest"}
          onClick={() =>
            setFilter(filter === "chooseHighest" ? "all" : "chooseHighest")
          }
          tone="purple"
        />
        {filter !== "all" && (
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="px-3 py-1.5 rounded-full text-slate-500 hover:text-slate-700"
          >
            ล้างฟิลเตอร์
          </button>
        )}
      </div>

      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-2 w-10">
                <input
                  type="checkbox"
                  aria-label="เลือกทุกแถวที่แสดง"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={toggleAllVisible}
                  className="accent-violet-600 cursor-pointer"
                />
              </th>
              <th className="text-left p-2 w-12">#</th>
              <th className="text-left p-2">คณะ / สาขา</th>
              <th className="text-left p-2 w-[35%]">น้ำหนัก</th>
              <th className="text-right p-2 w-16">รับ</th>
              <th className="text-right p-2 w-20">conf</th>
              <th className="text-left p-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ r, i }) => {
              const isError = errorRows.some((e) => e.i === i);
              const isSelected = selectedIds.has(i);
              return (
                <tr
                  key={i}
                  className={cn(
                    "border-t border-slate-100 hover:bg-violet-50/40 cursor-pointer",
                    isError && "bg-rose-50/40",
                    isSelected && "bg-violet-50/60 hover:bg-violet-50/80",
                  )}
                  onClick={() => setOpenRowIdx(i)}
                >
                  <td
                    className="p-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(i);
                    }}
                  >
                    <input
                      type="checkbox"
                      aria-label={`เลือกแถวสำหรับ ${r.major || r.faculty || `แถว ${i + 1}`}`}
                      checked={isSelected}
                      onChange={() => toggleRow(i)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-violet-600 cursor-pointer"
                    />
                  </td>
                  <td className="p-2 font-mono text-slate-400">
                    {r.orderNumber !== null
                      ? String(r.orderNumber).padStart(3, "0")
                      : `${i + 1}`}
                  </td>
                  <td className="p-2">
                    <p className="font-bold text-slate-800">{r.faculty}</p>
                    <p className="text-slate-500">
                      {r.major}
                      {r.subTrack ? ` • ${r.subTrack}` : ""}
                      {r.programType ? ` (${r.programType})` : ""}
                    </p>
                  </td>
                  <td className="p-2 text-slate-500 font-mono text-[10px]">
                    {describeComponents(r)}
                  </td>
                  <td className="p-2 text-right font-bold">
                    {r.quotaSeats ?? "—"}
                  </td>
                  <td className="p-2 text-right">
                    <ConfBadge value={r.confidence} />
                  </td>
                  <td className="p-2">
                    {isError && (
                      <AlertCircle
                        size={14}
                        className="text-rose-500 inline"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  ไม่มีแถวที่ตรงกับฟิลเตอร์
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 sticky bottom-4 bg-white/95 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-lg">
        <p className="text-xs text-slate-500">
          แสดง {visibleRows.length} จาก {editedRows.length} แถว
          {errorRows.length > 0 && (
            <span className="text-rose-600 ml-2 font-bold">
              • {errorRows.length} แถวต้องแก้
            </span>
          )}
        </p>
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
            onClick={runCommit}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold",
              canCommit
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-slate-100 text-slate-400 cursor-not-allowed",
            )}
          >
            {busy
              ? "กำลังบันทึก..."
              : errorRows.length > 0
                ? "แก้แถวที่ผิดพลาดก่อน"
                : `บันทึก ${editedRows.length} รายการ`}
          </button>
        </div>
      </div>

      {openRowIdx !== null && editedRows[openRowIdx] && (
        <RowEditPanel
          index={openRowIdx}
          row={editedRows[openRowIdx]!}
          onChange={(next) => {
            const copy = [...editedRows];
            copy[openRowIdx] = next;
            setEditedRows(copy);
          }}
          onClose={() => setOpenRowIdx(null)}
        />
      )}

      <BulkActionBar
        count={selectedIds.size}
        onEdit={() => setBulkOpen(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      {bulkOpen && selectedRows.length > 0 && (
        <BulkEditModal
          selectedRows={selectedRows}
          onApply={applyBulkEdit}
          onClose={() => setBulkOpen(false)}
        />
      )}

      {undoSnapshot && (
        <UndoToast
          count={undoSnapshot.count}
          onUndo={undoBulkEdit}
          onDismiss={() => setUndoSnapshot(null)}
        />
      )}
    </div>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function ConfChip({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "rose" | "purple";
}) {
  const baseTone =
    tone === "rose"
      ? "bg-rose-50 border-rose-200 text-rose-700"
      : tone === "purple"
        ? "bg-purple-50 border-purple-200 text-purple-700"
        : "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full border font-bold transition-all",
        active
          ? "bg-violet-600 border-violet-600 text-white"
          : baseTone + " hover:border-slate-400",
      )}
    >
      {label}
    </button>
  );
}

function ConfBadge({ value }: { value: number }) {
  const tone =
    value >= 0.8
      ? "bg-emerald-100 text-emerald-700"
      : value >= 0.5
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono",
        tone,
      )}
    >
      {value.toFixed(2)}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
      {message}
    </div>
  );
}
