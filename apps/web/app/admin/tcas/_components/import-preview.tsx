"use client";

import type {
  TcasCriteriaPreviewRow,
  TcasPreviewStatus,
  TcasPreviewSummary,
  TcasStatsPreviewRow,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { AlertCircle, CheckCircle2, Edit2, Minus } from "lucide-react";
import { useMemo, useState } from "react";

type AnyPreviewRow = TcasCriteriaPreviewRow | TcasStatsPreviewRow;

interface Props {
  rows: AnyPreviewRow[];
  summary: TcasPreviewSummary;
}

const STATUS_CHIPS: Array<{ key: TcasPreviewStatus; label: string }> = [
  { key: "new", label: "ใหม่" },
  { key: "update", label: "อัปเดต" },
  { key: "unchanged", label: "ไม่เปลี่ยน" },
  { key: "error", label: "ผิดพลาด" },
];

export function ImportPreviewTable({ rows, summary }: Props) {
  const [active, setActive] = useState<Set<TcasPreviewStatus>>(
    new Set(["new", "update", "error"]),
  );

  const visible = useMemo(
    () => rows.filter((r) => active.has(r.status)),
    [rows, active],
  );

  function toggle(key: TcasPreviewStatus) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => {
          const count = summary[chip.key];
          const on = active.has(chip.key);
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => toggle(chip.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                on
                  ? STATUS_STYLES[chip.key].chipOn
                  : "bg-slate-50 border-slate-200 text-slate-400",
              )}
            >
              {chip.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left p-3 w-12">แถว</th>
              <th className="text-left p-3 w-24">สถานะ</th>
              <th className="text-left p-3">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.rowIndex}
                className={cn(
                  "border-t border-slate-100 align-top",
                  STATUS_STYLES[row.status].rowBg,
                )}
              >
                <td className="p-3 font-mono text-xs text-slate-400">
                  {row.rowIndex}
                </td>
                <td className="p-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="p-3 text-xs">
                  <RowDetail row={row} />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-400 text-xs">
                  ไม่มีแถวที่ตรงกับฟิลเตอร์
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<
  TcasPreviewStatus,
  { chipOn: string; rowBg: string; badge: string; icon: typeof CheckCircle2 }
> = {
  new: {
    chipOn: "bg-emerald-50 border-emerald-200 text-emerald-700",
    rowBg: "bg-emerald-50/40",
    badge: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  update: {
    chipOn: "bg-amber-50 border-amber-200 text-amber-700",
    rowBg: "bg-amber-50/40",
    badge: "bg-amber-100 text-amber-700",
    icon: Edit2,
  },
  unchanged: {
    chipOn: "bg-slate-100 border-slate-300 text-slate-600",
    rowBg: "",
    badge: "bg-slate-100 text-slate-500",
    icon: Minus,
  },
  error: {
    chipOn: "bg-rose-50 border-rose-200 text-rose-700",
    rowBg: "bg-rose-50/40",
    badge: "bg-rose-100 text-rose-700",
    icon: AlertCircle,
  },
};

function StatusBadge({ status }: { status: TcasPreviewStatus }) {
  const cfg = STATUS_STYLES[status];
  const Icon = cfg.icon;
  const label = {
    new: "ใหม่",
    update: "อัปเดต",
    unchanged: "ไม่เปลี่ยน",
    error: "ผิดพลาด",
  }[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold",
        cfg.badge,
      )}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

function RowDetail({ row }: { row: AnyPreviewRow }) {
  if (row.status === "error") {
    return <p className="text-rose-600 font-medium">{row.error}</p>;
  }

  if ("components" in (row.data ?? {})) {
    const d = (row as TcasCriteriaPreviewRow).data;
    if (!d) return null;
    return (
      <div className="space-y-1">
        <p className="font-bold text-slate-800">
          {d.university} • {d.faculty} • {d.major}
          {d.programType ? ` (${d.programType})` : ""}
        </p>
        <p className="text-slate-500">
          รอบ {d.round} • ปี {d.admissionYear} • โควตา {d.quotaSeats}
          {d.totalMinScore !== null ? ` • ต่ำสุด ${d.totalMinScore}` : ""}
        </p>
        <p className="text-slate-400 truncate">
          {d.components.exams
            .map(
              (e) =>
                `${e.code ? `${e.system}:${e.code}` : e.system}=${e.weight}${
                  e.min !== null ? `/${e.min}` : ""
                }`,
            )
            .join(" • ")}
        </p>
        {(row as TcasCriteriaPreviewRow).diff &&
          (row as TcasCriteriaPreviewRow).diff!.length > 0 && (
            <details className="text-[10px] text-amber-700">
              <summary className="cursor-pointer font-bold">
                เปลี่ยนแปลง {(row as TcasCriteriaPreviewRow).diff!.length} ฟิลด์
              </summary>
              <ul className="mt-1 space-y-0.5">
                {(row as TcasCriteriaPreviewRow).diff!.map((d) => (
                  <li key={d.field}>
                    <code className="font-mono">{d.field}</code>:{" "}
                    {JSON.stringify(d.before)} → {JSON.stringify(d.after)}
                  </li>
                ))}
              </ul>
            </details>
          )}
      </div>
    );
  }

  const d = (row as TcasStatsPreviewRow).data;
  if (!d) return null;
  return (
    <div className="space-y-1">
      <p className="font-bold text-slate-800">
        {d.courseCode} • {d.university} • {d.major}
      </p>
      <p className="text-slate-500">
        ปี {d.year} • รับ {d.quotaSeats} • สมัคร {d.applicants} • ผ่าน 1/2:{" "}
        {d.passedRound1}/{d.passedRound2}
      </p>
      {d.minScoreR2 !== null && (
        <p className="text-slate-400">
          คะแนน R2: {d.minScoreR2} – {d.maxScoreR2}
        </p>
      )}
      {(row as TcasStatsPreviewRow).programLinkedId === null && (
        <p className="text-[10px] text-amber-600">
          ⚠ ไม่พบโปรแกรมที่ courseCode นี้ — แถวจะถูกบันทึกแบบไม่ผูกโปรแกรม
        </p>
      )}
    </div>
  );
}
