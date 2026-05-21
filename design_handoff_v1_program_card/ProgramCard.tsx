"use client";

/**
 * ProgramCard — search-results card for one TCAS program.
 *
 * Recreates the V1 "Compare Dock" card from the design prototype using the
 * Pee Rahat codebase's conventions:
 *   - Tailwind tokens from packages/config/tailwind/preset.ts (no inline hex)
 *   - lucide-react icons (no inline SVGs)
 *   - cn() helper from @peerahat/ui
 *
 * IMPORTANT: This is a STARTER. Adapt it to:
 *   - Read your TcasProgram + relations shape (this file uses a flattened
 *     ProgramCardProgram intermediate; see the mapper in the handoff README)
 *   - Wire pin state to the parent's useState<number[]>
 *   - Wire the CTA to your /tcas calculator route
 */

import Link from "next/link";
import { Pin, ArrowRight, Calculator } from "lucide-react";
import { cn } from "@peerahat/ui";

// ---------- Types (move to packages/types if reused) ----------

export interface ProgramCardProgram {
  id: number;
  uniShort: string;        // "มข." / "จุฬาฯ" — derived from university name
  university: string;
  faculty: string;
  programName: string;
  status: "active" | "inactive";
  seats: number | null;
  minGpax: number | null;
  weights: Array<{
    examCode: string;
    nameTh: string;
    weightPercent: number;
  }>;
  history: {
    year: number;
    min: number | null;
    mean: number | null;
    max: number | null;
  } | null;
  trend: (number | null)[];  // last ≤6 years of mean scores; nulls allowed
}

export interface ProgramCardProps {
  program: ProgramCardProgram;
  pinned: boolean;
  onTogglePin: (id: number) => void;
  /** Link target for the "คำนวณ" CTA. Default: /tcas?programId=<id> */
  calcHref?: string;
}

// ---------- Constants ----------

// Weight-bar segment colors cycle through these tokens.
const WEIGHT_SEGMENT_COLORS = [
  "bg-violet-500",
  "bg-soft-periwinkle",
  "bg-rosy-taupe",
  "bg-accent-600",
  "bg-emerald-600",   // close to design's "competitive" green
  "bg-amber-500",     // close to design's "borderline" amber
] as const;

// ---------- Subcomponents ----------

/** Tiny inline trend line (last ≤6 years of mean). Hides if < 3 data points. */
function Sparkline({ values, className }: { values: (number | null)[]; className?: string }) {
  const clean = values.filter((v): v is number => v != null);
  if (clean.length < 3) return null;

  const w = 50;
  const h = 16;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = Math.max(1, max - min);

  const points = values
    .map((v, i) => {
      if (v == null) return null;
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <svg width={w} height={h} className={cn("block text-violet-500", className)} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/** "min / mean / max" trio used inside the score band. */
function ScoreStats({ history }: { history: NonNullable<ProgramCardProgram["history"]> }) {
  const stats = [
    { label: "min",  value: history.min,  className: "text-rose-600" },        // ~#E2585A
    { label: "mean", value: history.mean, className: "text-violet-500" },
    { label: "max",  value: history.max,  className: "text-emerald-600" },     // ~#2F9B6E
  ];
  return (
    <div className="grid grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <p
            className={cn("num text-[18px] font-bold leading-none", s.className)}
            aria-label={`คะแนน${s.label} ${s.value ?? "ไม่มีข้อมูล"}`}
          >
            {s.value != null ? s.value.toFixed(1) : "—"}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute mt-1">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Status pill — active (เปิด) or inactive (ไม่เปิดปีนี้). */
function StatusBadge({ status, year = 2569 }: { status: "active" | "inactive"; year?: number }) {
  if (status === "inactive") {
    return (
      <span className="thai inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-taupe-soft text-taupe-deep">
        📁 ไม่เปิดปีนี้
      </span>
    );
  }
  return (
    <span className="thai inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden/>
      เปิด {year}
    </span>
  );
}

// ---------- Main component ----------

export function ProgramCard({ program, pinned, onTogglePin, calcHref }: ProgramCardProps) {
  const p = program;
  const href = calcHref ?? `/tcas?programId=${p.id}`;

  return (
    <article
      className={cn(
        "rounded-3xl bg-white p-[18px] transition duration-200 hover:-translate-y-0.5",
        "shadow-[0_1px_0_rgba(85,65,139,0.04),0_12px_28px_-18px_rgba(85,65,139,0.25)]",
        pinned
          ? "border border-violet-500 shadow-[0_0_0_2px_rgba(85,65,139,0.18),0_18px_40px_-22px_rgba(85,65,139,0.45)]"
          : "border border-[rgba(85,65,139,0.08)]",
      )}
    >
      {/* === Header: uni chip + status, pin button === */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="thai text-[11px] font-bold px-2 py-0.5 rounded-md bg-grape-soft text-grape-deep">
            {p.uniShort}
          </span>
          <StatusBadge status={p.status}/>
        </div>
        <button
          type="button"
          onClick={() => onTogglePin(p.id)}
          aria-pressed={pinned}
          aria-label={pinned ? "ถอนปักหมุด" : "ปักหมุดเปรียบเทียบ"}
          title={pinned ? "ถอนปักหมุด" : "ปักหมุดเปรียบเทียบ"}
          className={cn(
            "w-7 h-7 rounded-full inline-flex items-center justify-center transition shrink-0",
            pinned
              ? "bg-violet-500 text-white border border-violet-500"
              : "bg-white text-ink-mute border border-[rgba(85,65,139,0.18)] hover:border-violet-500 hover:text-violet-500",
          )}
        >
          <Pin className="w-3.5 h-3.5" fill={pinned ? "currentColor" : "none"} strokeWidth={1.8}/>
        </button>
      </div>

      {/* === Faculty + program name === */}
      <Link href={href} className="block group">
        <p className="thai text-[11.5px] font-medium text-soft-periwinkle mb-0.5">
          {p.faculty}
        </p>
        <h3
          className="thai text-[16px] font-bold leading-tight text-grape-deep group-hover:text-violet-500 transition"
          style={{ minHeight: 38 }}
        >
          {p.programName}
        </h3>
      </Link>

      {/* === Score band === */}
      {p.history && (
        <div className="rounded-2xl p-3 mt-3 bg-grape-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="thai text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-mute">
              สถิติคะแนน ปี {p.history.year}
            </span>
            <Sparkline values={p.trend}/>
          </div>
          <ScoreStats history={p.history}/>
        </div>
      )}

      {/* === Subject weights === */}
      {p.weights.length > 0 && (
        <div className="mt-3">
          <p className="thai text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-mute mb-1.5">
            วิชาที่ใช้ ({p.weights.length})
          </p>
          {/* Stacked bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-[#F2EEF6]" role="img" aria-label="สัดส่วนน้ำหนักวิชา">
            {p.weights.map((w, i) => (
              <div
                key={w.examCode}
                className={WEIGHT_SEGMENT_COLORS[i % WEIGHT_SEGMENT_COLORS.length]}
                style={{ width: `${w.weightPercent}%` }}
                title={`${w.nameTh} ${w.weightPercent}%`}
              />
            ))}
          </div>
          {/* Chip list (first 3 + overflow) */}
          <div className="flex flex-wrap gap-1 mt-2">
            {p.weights.slice(0, 3).map((w) => (
              <span
                key={w.examCode}
                className="thai text-[10px] px-1.5 py-0.5 rounded bg-[#F5F2FA] text-ink-soft"
              >
                {w.nameTh}{" "}
                <span className="num font-semibold text-grape-deep">{w.weightPercent}%</span>
              </span>
            ))}
            {p.weights.length > 3 && (
              <span className="thai text-[10px] text-ink-mute self-center">
                +{p.weights.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* === Footer === */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-dashed border-[rgba(85,65,139,0.15)]">
        <div className="flex items-center gap-3 thai text-[11px] text-ink-soft">
          {p.seats != null && (
            <span>
              <span className="text-ink-mute">ที่นั่ง</span>{" "}
              <span className="num font-bold text-ink">{p.seats}</span>
            </span>
          )}
          {p.minGpax != null && (
            <span>
              <span className="text-ink-mute">GPAX</span>{" "}
              <span className="num font-bold text-ink">{p.minGpax.toFixed(2)}</span>
            </span>
          )}
        </div>
        <Link
          href={href}
          className="thai inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-lg bg-grape-deep text-white hover:bg-violet-500 transition"
        >
          <Calculator className="w-3 h-3" strokeWidth={1.8}/>
          คำนวณ
          <ArrowRight className="w-3 h-3" strokeWidth={1.8}/>
        </Link>
      </div>
    </article>
  );
}
