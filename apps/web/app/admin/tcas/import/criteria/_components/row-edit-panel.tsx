"use client";

import {
  componentKey,
  type ExamSystem,
  type ParsedProgramRow,
  type ProgramComponent,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { Plus, Trash2, X } from "lucide-react";

const EXAM_SYSTEMS: Array<{ value: ExamSystem; label: string }> = [
  { value: "tgat", label: "TGAT" },
  { value: "tpat", label: "TPAT" },
  { value: "aLevel", label: "A-Level" },
  { value: "netsat", label: "NetSat" },
  { value: "gpax", label: "GPAX (unused)" },
];

interface Props {
  index: number;
  row: ParsedProgramRow;
  onChange: (next: ParsedProgramRow) => void;
  onClose: () => void;
}

export function RowEditPanel({ index, row, onChange, onClose }: Props) {
  function patch(p: Partial<ParsedProgramRow>) {
    onChange({ ...row, ...p });
  }

  function updateComponent(idx: number, next: ProgramComponent) {
    const exams = [...row.components.exams];
    exams[idx] = next;
    patch({ components: { ...row.components, exams } });
  }

  function removeComponent(idx: number) {
    const exams = row.components.exams.filter((_, i) => i !== idx);
    patch({ components: { ...row.components, exams } });
  }

  function addComponent() {
    patch({
      components: {
        ...row.components,
        exams: [
          ...row.components.exams,
          {
            type: "single",
            system: "aLevel",
            code: "",
            name: "",
            weight: 0,
            min: null,
          },
        ],
      },
    });
  }

  const weightSum = row.components.exams.reduce((a, e) => a + e.weight, 0);

  return (
    <aside className="fixed inset-y-0 right-0 w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl overflow-y-auto z-50">
      <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">
            แถวที่ {index + 1}
            {row.orderNumber !== null && (
              <span className="text-slate-400 ml-2 font-mono">
                PDF: {String(row.orderNumber).padStart(3, "0")}
              </span>
            )}
          </p>
          <h3 className="font-bold text-slate-800">แก้ไขข้อมูล</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {row.notes && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <strong>AI notes:</strong> {row.notes}
          </div>
        )}

        <Field label="คณะ *">
          <input
            type="text"
            value={row.faculty}
            onChange={(e) => patch({ faculty: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
          />
        </Field>

        <Field label="สาขาวิชา *">
          <input
            type="text"
            value={row.major}
            onChange={(e) => patch({ major: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="subTrack">
            <input
              type="text"
              value={row.subTrack ?? ""}
              onChange={(e) =>
                patch({ subTrack: e.target.value || null })
              }
              placeholder="(ว่างได้)"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
          </Field>
          <Field label="programType">
            <input
              type="text"
              value={row.programType ?? ""}
              onChange={(e) =>
                patch({ programType: e.target.value || null })
              }
              placeholder="ภาคปกติ / โครงการพิเศษ / ..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="จำนวนรับ">
            <input
              type="number"
              min={0}
              value={row.quotaSeats ?? ""}
              onChange={(e) =>
                patch({
                  quotaSeats:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
          </Field>
          <Field label="gpaxMin">
            <input
              type="number"
              step="0.01"
              min={0}
              max={4}
              value={row.components.gpaxMin ?? ""}
              onChange={(e) =>
                patch({
                  components: {
                    ...row.components,
                    gpaxMin:
                      e.target.value === "" ? null : Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
          </Field>
          <Field label="totalMin">
            <input
              type="number"
              step="0.01"
              value={row.totalMinScore ?? ""}
              onChange={(e) =>
                patch({
                  totalMinScore:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              components ({row.components.exams.length})
            </p>
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded",
                Math.abs(weightSum - 100) < 0.5
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700",
              )}
            >
              รวม {weightSum.toFixed(2)}%
            </span>
          </div>
          <div className="space-y-2">
            {row.components.exams.map((c, i) => (
              <ComponentRow
                key={i}
                comp={c}
                onChange={(next) => updateComponent(i, next)}
                onRemove={() => removeComponent(i)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addComponent}
            className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-slate-400 hover:text-slate-700"
          >
            <Plus size={12} className="inline mr-1" />
            เพิ่มวิชา
          </button>
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ComponentRow({
  comp,
  onChange,
  onRemove,
}: {
  comp: ProgramComponent;
  onChange: (next: ProgramComponent) => void;
  onRemove: () => void;
}) {
  if (comp.type === "chooseHighest") {
    return (
      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">
            chooseHighest • {comp.options.length} options
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="text-purple-600 hover:text-rose-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={comp.weight}
            onChange={(e) =>
              onChange({ ...comp, weight: Number(e.target.value) })
            }
            placeholder="weight"
            className="px-2 py-1 rounded bg-white border border-purple-200 text-xs font-mono"
          />
          <input
            type="number"
            value={comp.min ?? ""}
            onChange={(e) =>
              onChange({
                ...comp,
                min: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="min (optional)"
            className="px-2 py-1 rounded bg-white border border-purple-200 text-xs font-mono"
          />
        </div>
        <div className="space-y-1">
          {comp.options.map((opt, i) => (
            <div
              key={i}
              className="grid grid-cols-[80px_60px_1fr_auto] gap-1 items-center"
            >
              <select
                value={opt.system}
                onChange={(e) => {
                  const options = [...comp.options];
                  options[i] = {
                    ...options[i]!,
                    system: e.target.value as ExamSystem,
                  };
                  onChange({ ...comp, options });
                }}
                className="px-1 py-0.5 rounded bg-white border border-purple-200 text-[10px]"
              >
                {EXAM_SYSTEMS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={opt.code}
                onChange={(e) => {
                  const options = [...comp.options];
                  options[i] = { ...options[i]!, code: e.target.value };
                  onChange({ ...comp, options });
                }}
                placeholder="code"
                className="px-1 py-0.5 rounded bg-white border border-purple-200 text-[10px] font-mono"
              />
              <input
                type="text"
                value={opt.name}
                onChange={(e) => {
                  const options = [...comp.options];
                  options[i] = { ...options[i]!, name: e.target.value };
                  onChange({ ...comp, options });
                }}
                placeholder="ชื่อวิชา"
                className="px-1 py-0.5 rounded bg-white border border-purple-200 text-[10px]"
              />
              <button
                type="button"
                onClick={() => {
                  const options = comp.options.filter((_, j) => j !== i);
                  if (options.length >= 2) onChange({ ...comp, options });
                }}
                disabled={comp.options.length <= 2}
                className="text-purple-600 hover:text-rose-600 disabled:opacity-30"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...comp,
              options: [
                ...comp.options,
                { system: "aLevel", code: "", name: "" },
              ],
            })
          }
          className="w-full py-1 rounded text-[10px] font-bold text-purple-700 hover:bg-purple-100"
        >
          + เพิ่มตัวเลือก
        </button>
      </div>
    );
  }

  // single
  return (
    <div className="grid grid-cols-[80px_60px_1fr_60px_60px_auto] gap-1 items-center p-2 rounded-lg bg-slate-50 border border-slate-200">
      <select
        value={comp.system}
        onChange={(e) =>
          onChange({ ...comp, system: e.target.value as ExamSystem })
        }
        className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px]"
      >
        {EXAM_SYSTEMS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={comp.code}
        onChange={(e) => onChange({ ...comp, code: e.target.value })}
        placeholder="code"
        className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono"
      />
      <input
        type="text"
        value={comp.name}
        onChange={(e) => onChange({ ...comp, name: e.target.value })}
        placeholder="ชื่อวิชา"
        className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px]"
      />
      <input
        type="number"
        value={comp.weight}
        onChange={(e) => onChange({ ...comp, weight: Number(e.target.value) })}
        placeholder="weight"
        className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono"
      />
      <input
        type="number"
        value={comp.min ?? ""}
        onChange={(e) =>
          onChange({
            ...comp,
            min: e.target.value === "" ? null : Number(e.target.value),
          })
        }
        placeholder="min"
        className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-slate-400 hover:text-rose-600"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// Helper used outside for the table preview — exported here so the client
// component doesn't need to re-implement it.
export function describeComponents(row: ParsedProgramRow): string {
  return row.components.exams
    .map((c) => {
      if (c.type === "chooseHighest") {
        return `[${c.options.length}-of-many]:${c.weight}`;
      }
      const key = componentKey(c.system, c.code);
      return `${key}:${c.weight}${c.min !== null ? `/${c.min}` : ""}`;
    })
    .join(" • ");
}
