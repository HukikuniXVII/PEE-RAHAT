"use client";

import {
  componentKey,
  type ExamSystem,
  type ParsedProgramRow,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { AlertCircle, Info, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// ─── Public types ────────────────────────────────────────────────────────
// FR-TC-02: bulk-edit lives on top of the AI-import preview screen.

export interface BulkEditApply {
  // Common weight edits keyed by componentKey (e.g. "tgat", "tpat:30",
  // "aLevel:61"). Only "single"-type components are reachable from here;
  // chooseHighest is intentionally per-row only (v1 non-goal).
  weights: Record<string, number>;
  // Common non-weight fields. Only fields the user actually touched land
  // here; absent keys mean "leave each row's value alone".
  fields: {
    programType?: string | null;
    quotaSeats?: number | null;
    totalMinScore?: number | null;
    gpaxMin?: number | null;
    subTrack?: string | null;
  };
}

interface Props {
  selectedRows: ParsedProgramRow[];
  onApply: (edits: BulkEditApply) => void;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

// Per-row "single" components keyed by componentKey, ignoring chooseHighest.
function singleKeys(row: ParsedProgramRow): Map<string, { weight: number; system: ExamSystem; code: string; name: string }> {
  const out = new Map<string, { weight: number; system: ExamSystem; code: string; name: string }>();
  for (const c of row.components.exams) {
    if (c.type !== "single") continue;
    out.set(componentKey(c.system, c.code), {
      weight: c.weight,
      system: c.system,
      code: c.code,
      name: c.name,
    });
  }
  return out;
}

// Keys present in *any* selected row. Apply skips rows without the key,
// so users can bulk-edit a TGAT weight even when only some selected rows
// actually have a TGAT component. Coverage (rows that contain the key)
// is surfaced in the label so the user knows the scope of the edit.
function unionKeys(rows: ParsedProgramRow[]): Array<{
  key: string;
  coverage: number; // how many of the selected rows have this key
  meta: { system: ExamSystem; code: string; name: string };
}> {
  const acc = new Map<
    string,
    { coverage: number; meta: { system: ExamSystem; code: string; name: string } }
  >();
  for (const row of rows) {
    const keys = singleKeys(row);
    for (const [k, v] of keys) {
      const cur = acc.get(k);
      if (cur) {
        cur.coverage += 1;
        // Keep first-seen name unless current is empty.
        if (!cur.meta.name && v.name) cur.meta.name = v.name;
      } else {
        acc.set(k, { coverage: 1, meta: { system: v.system, code: v.code, name: v.name } });
      }
    }
  }
  return [...acc.entries()].map(([key, { coverage, meta }]) => ({
    key,
    coverage,
    meta,
  }));
}

function sharedValue<T>(
  rows: ParsedProgramRow[],
  pick: (r: ParsedProgramRow) => T,
): { shared: true; value: T } | { shared: false } {
  if (rows.length === 0) return { shared: false };
  const first = pick(rows[0]!);
  for (let i = 1; i < rows.length; i++) {
    if (pick(rows[i]!) !== first) return { shared: false };
  }
  return { shared: true, value: first };
}

// Tri-state input value: untouched ("don't overwrite"), or a user-entered
// value. We track touched separately so an empty string ≠ "user cleared".
type Touched<T> = { touched: false } | { touched: true; value: T };

function untouched<T>(): Touched<T> {
  return { touched: false };
}

// ─── Component ───────────────────────────────────────────────────────────

export function BulkEditModal({ selectedRows, onApply, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerEl = useRef<Element | null>(null);

  // Capture trigger element so we can return focus on close (a11y).
  useEffect(() => {
    triggerEl.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Focus the dialog after mount.
    setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (triggerEl.current instanceof HTMLElement) triggerEl.current.focus();
    };
  }, [onClose]);

  // ─── Derived shared/mixed state ─────────────────────────────────────
  // Union of all "single" component keys across selected rows. A weight is
  // "shared" only if every row that HAS the key agrees on the value AND
  // every selected row has the key (coverage === total).
  const unionKeyEntries = useMemo(() => unionKeys(selectedRows), [selectedRows]);

  const commonKeyMeta = useMemo(() => {
    if (selectedRows.length === 0) return [] as Array<{
      key: string;
      label: string;
      coverage: number;
      total: number;
      shared: { shared: true; value: number } | { shared: false };
    }>;
    const total = selectedRows.length;
    return unionKeyEntries
      .map(({ key, coverage, meta }) => {
        // A value is shared only when (a) coverage is full and (b) the rows
        // that have the key all agree. Partial coverage → always "— ค่าผสม —".
        let shared: { shared: true; value: number } | { shared: false };
        if (coverage < total) {
          shared = { shared: false };
        } else {
          shared = sharedValue(selectedRows, (r) => {
            const m = singleKeys(r);
            return m.get(key)?.weight ?? null;
          }) as { shared: true; value: number } | { shared: false };
        }
        return {
          key,
          label: meta.name ? `${meta.name} (${key})` : key,
          coverage,
          total,
          shared,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [selectedRows, unionKeyEntries]);

  const hasChooseHighest = useMemo(
    () =>
      selectedRows.some((r) =>
        r.components.exams.some((e) => e.type === "chooseHighest"),
      ),
    [selectedRows],
  );

  // ─── Local edit state ───────────────────────────────────────────────
  // Per-key Touched<number>, plus per-field Touched<...>.
  const [weights, setWeights] = useState<Record<string, Touched<number>>>({});
  const [programType, setProgramType] = useState<Touched<string | null>>(
    untouched(),
  );
  const [quotaSeats, setQuotaSeats] = useState<Touched<number | null>>(
    untouched(),
  );
  const [totalMinScore, setTotalMinScore] = useState<Touched<number | null>>(
    untouched(),
  );
  const [gpaxMin, setGpaxMin] = useState<Touched<number | null>>(untouched());
  const [subTrack, setSubTrack] = useState<Touched<string | null>>(untouched());

  function touchWeight(key: string, raw: string) {
    if (raw === "") {
      // Treat blank back to untouched — lets users undo a mistaken edit.
      setWeights((w) => {
        const next = { ...w };
        delete next[key];
        return next;
      });
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    setWeights((w) => ({ ...w, [key]: { touched: true, value: n } }));
  }

  // Live preview of post-apply weight total. Only meaningful for a single
  // selected row (the only case where "the row's total" is unambiguous).
  // For multiple rows we surface per-row outcomes via the existing
  // errorRows set in the parent after apply.
  const previewTotal = useMemo(() => {
    if (selectedRows.length !== 1) return null;
    const sample = singleKeys(selectedRows[0]!);
    let total = 0;
    for (const { key } of unionKeyEntries) {
      const t = weights[key];
      const weightVal =
        t && t.touched ? t.value : (sample.get(key)?.weight ?? 0);
      total += weightVal;
    }
    return { total };
  }, [weights, unionKeyEntries, selectedRows]);

  // ─── Build apply payload ────────────────────────────────────────────
  function buildPayload(): BulkEditApply {
    const w: Record<string, number> = {};
    for (const [k, t] of Object.entries(weights)) {
      if (t && t.touched) w[k] = t.value;
    }
    const fields: BulkEditApply["fields"] = {};
    if (programType.touched) fields.programType = programType.value;
    if (quotaSeats.touched) fields.quotaSeats = quotaSeats.value;
    if (totalMinScore.touched) fields.totalMinScore = totalMinScore.value;
    if (gpaxMin.touched) fields.gpaxMin = gpaxMin.value;
    if (subTrack.touched) fields.subTrack = subTrack.value;
    return { weights: w, fields };
  }

  const touchedCount =
    Object.keys(weights).filter((k) => weights[k]?.touched).length +
    [programType, quotaSeats, totalMinScore, gpaxMin, subTrack].filter(
      (t) => t.touched,
    ).length;

  // Sticky padding so the footer doesn't crash into the last field.
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-800/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-edit-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-[620px] max-h-[88vh] flex flex-col rounded-xl bg-neutral-50 shadow-lg border border-neutral-200 outline-none"
      >
        {/* Header */}
        <header className="p-6 border-b border-neutral-200 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="bulk-edit-title"
              className="text-xl font-bold text-violet-700"
            >
              แก้ไขพร้อมกัน
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              กำลังแก้ไข <strong>{selectedRows.length} รายการ</strong> ·
              แก้ไขเฉพาะฟิลด์ที่เปลี่ยน · ฟิลด์ที่ไม่แตะจะคงค่าเดิมในแต่ละแถว
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="p-2 rounded-md hover:bg-neutral-100 text-neutral-500"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ─── Weights section ─── */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                น้ำหนักคะแนน · ใช้กับเฉพาะแถวที่มีวิชานั้น
              </h3>
              {previewTotal && (
                <span
                  className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded",
                    Math.abs(previewTotal.total - 100) < 0.5
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700",
                  )}
                >
                  รวม: {previewTotal.total.toFixed(2)}% / 100%
                </span>
              )}
            </div>

            {commonKeyMeta.length === 0 ? (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  แถวที่เลือกยังไม่มีวิชาน้ำหนักแบบ single — เพิ่มได้รายแถวก่อน
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {commonKeyMeta.map(({ key, label, coverage, total, shared }) => {
                  const touched = weights[key];
                  const inputVal = touched?.touched
                    ? String(touched.value)
                    : shared.shared
                      ? String(shared.value)
                      : "";
                  const partial = coverage < total;
                  return (
                    <label key={key} className="block space-y-1">
                      <span
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500"
                        title={label}
                      >
                        <span className="truncate">{label}</span>
                        {partial && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 normal-case tracking-normal text-[10px] font-medium">
                            {coverage}/{total} แถว
                          </span>
                        )}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={inputVal}
                        placeholder={shared.shared ? "" : "— ค่าผสม —"}
                        onChange={(e) => touchWeight(key, e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 rounded-md bg-white border border-neutral-200 text-sm font-mono",
                          "focus:outline-none focus:border-violet-500 focus:shadow-focus",
                          !shared.shared && !touched?.touched
                            ? "italic placeholder:text-amber-600"
                            : "",
                        )}
                      />
                    </label>
                  );
                })}
              </div>
            )}

            {hasChooseHighest && (
              <p className="text-[11px] text-neutral-500 italic flex items-center gap-1.5">
                <Info size={12} />
                แถวที่เลือกบางแถวมีกลุ่ม chooseHighest — แก้รายแถวเท่านั้น
              </p>
            )}
          </section>

          {/* ─── Common fields section ─── */}
          <section className="space-y-3 pt-4 border-t border-neutral-200">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
              ฟิลด์อื่น ๆ
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <BulkField
                label="programType"
                placeholder="ภาคปกติ / โครงการพิเศษ / ..."
                shared={sharedValue(selectedRows, (r) => r.programType)}
                touched={programType}
                onChange={(t) => setProgramType(t)}
                kind="text"
              />
              <BulkField
                label="subTrack"
                placeholder="(ว่างได้)"
                shared={sharedValue(selectedRows, (r) => r.subTrack)}
                touched={subTrack}
                onChange={(t) => setSubTrack(t)}
                kind="text"
              />
              <BulkField
                label="จำนวนรับ"
                shared={sharedValue(selectedRows, (r) => r.quotaSeats)}
                touched={quotaSeats}
                onChange={(t) => setQuotaSeats(t)}
                kind="number"
              />
              <BulkField
                label="คะแนนต่ำสุดรวม"
                shared={sharedValue(selectedRows, (r) => r.totalMinScore)}
                touched={totalMinScore}
                onChange={(t) => setTotalMinScore(t)}
                kind="number"
              />
              <BulkField
                label="gpaxMin"
                shared={sharedValue(selectedRows, (r) => r.components.gpaxMin)}
                touched={gpaxMin}
                onChange={(t) => setGpaxMin(t)}
                kind="number"
                step="0.01"
                min={0}
                max={4}
              />
            </div>
          </section>

          {/* ─── Subjects section (v1 read-only stub) ─── */}
          <section className="p-3 rounded-md bg-neutral-100 border border-neutral-200 text-xs text-neutral-500 flex gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              แก้ไขรายการวิชาเพิ่ม/ลบ หรือกลุ่ม chooseHighest แบบรายแถวเท่านั้น
              (รุ่นถัดไป)
            </span>
          </section>
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-neutral-200 flex items-center justify-between gap-3 bg-neutral-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={touchedCount === 0}
            onClick={() => onApply(buildPayload())}
            className={cn(
              "px-5 py-2 rounded-md text-sm font-medium transition-all",
              touchedCount === 0
                ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                : "bg-violet-500 text-neutral-50 hover:bg-accent-500 hover:text-neutral-800 active:scale-[0.98]",
            )}
          >
            นำไปใช้กับ {selectedRows.length} รายการ →
          </button>
        </footer>

        {touchedCount === 0 && (
          <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <AlertCircle size={11} />
              เปลี่ยนค่าอย่างน้อย 1 ฟิลด์เพื่อนำไปใช้
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BulkField — generic shared/mixed text or number input ───────────────

interface BulkFieldProps<T> {
  label: string;
  placeholder?: string;
  shared: { shared: true; value: T } | { shared: false };
  touched: Touched<T>;
  onChange: (next: Touched<T>) => void;
  kind: "text" | "number";
  step?: string;
  min?: number;
  max?: number;
}

function BulkField<T extends string | number | null>({
  label,
  placeholder,
  shared,
  touched,
  onChange,
  kind,
  step,
  min,
  max,
}: BulkFieldProps<T>) {
  const isShared = shared.shared;

  function displayValue(): string {
    if (touched.touched) {
      const v = touched.value;
      return v === null || v === undefined ? "" : String(v);
    }
    if (isShared) {
      const v = shared.value;
      return v === null || v === undefined ? "" : String(v);
    }
    return "";
  }

  function parse(raw: string): T {
    if (kind === "number") {
      if (raw === "") return null as T;
      const n = Number(raw);
      if (Number.isNaN(n)) return null as T;
      return n as T;
    }
    return (raw === "" ? null : raw) as T;
  }

  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
        {label}
        {!isShared && !touched.touched && (
          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 normal-case tracking-normal text-[10px] font-medium">
            — ค่าผสม —
          </span>
        )}
        {isShared && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 normal-case tracking-normal text-[10px] font-medium">
            เหมือนกันทุกแถว
          </span>
        )}
      </span>
      <input
        type={kind === "number" ? "number" : "text"}
        value={displayValue()}
        placeholder={isShared ? placeholder : (placeholder ?? "— ค่าผสม —")}
        step={step}
        min={min}
        max={max}
        onChange={(e) =>
          onChange({ touched: true, value: parse(e.target.value) })
        }
        className={cn(
          "w-full px-3 py-2 rounded-md bg-white border border-neutral-200 text-sm",
          "focus:outline-none focus:border-violet-500 focus:shadow-focus",
          !isShared && !touched.touched
            ? "italic placeholder:text-amber-600"
            : "",
        )}
      />
    </label>
  );
}
