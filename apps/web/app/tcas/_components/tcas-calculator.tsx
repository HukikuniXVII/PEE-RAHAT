"use client";

import {
  componentKey,
  type ExamSystem,
  type TcasDeadline,
  type TcasProgram,
  type TcasRound,
  type TcasScores,
} from "@peerahat/types";
import { buttonVariants, cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Info,
  Search,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initialPrograms: TcasProgram[];
  initialDeadlines: TcasDeadline[];
}

const ROUND_LABELS: Record<TcasRound, string> = {
  r1_portfolio: "รอบ 1 Portfolio",
  r2_quota_kku_netsat: "รอบ 2 โควตา (KKU NetSat)",
  r3_admission: "รอบ 3 Admission",
  r4_direct: "รอบ 4 รับตรง",
};

const SYSTEM_LABELS: Record<ExamSystem, string> = {
  gpax: "GPAX",
  tgat: "TGAT",
  tpat: "TPAT",
  aLevel: "A-Level",
  netsat: "NetSat (KKU)",
};

// Map a component to a tutor-search query param. The tutors page does loose
// matching on subject names, so the catalogue's Thai name works as the seed.
function deeplinkSubject(name: string): string {
  return encodeURIComponent(name);
}

export function TcasCalculator({ initialPrograms, initialDeadlines }: Props) {
  const programsQuery = useQuery({
    queryKey: ["tcas", "programs"],
    queryFn: () => createApiClient().tcas.programs(),
    initialData: initialPrograms,
  });
  const deadlinesQuery = useQuery({
    queryKey: ["tcas", "deadlines"],
    queryFn: () => createApiClient().tcas.deadlines(),
    initialData: initialDeadlines,
  });
  const programs = programsQuery.data ?? [];
  const deadlines = deadlinesQuery.data ?? [];

  // Round filter — show whichever rounds appear in seed/imported data.
  const availableRounds = useMemo(() => {
    const set = new Set<TcasRound>();
    programs.forEach((p) => set.add(p.round));
    return Array.from(set);
  }, [programs]);

  const [round, setRound] = useState<TcasRound>(
    availableRounds[0] ?? "r3_admission",
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      programs.filter(
        (p) =>
          p.round === round &&
          (p.university.toLowerCase().includes(search.toLowerCase()) ||
            p.major.toLowerCase().includes(search.toLowerCase())),
      ),
    [programs, round, search],
  );

  const [target, setTarget] = useState<TcasProgram | null>(
    filtered[0] ?? programs[0] ?? null,
  );
  useEffect(() => {
    if (!target && filtered[0]) setTarget(filtered[0]);
  }, [filtered, target]);

  // Scores live in a single record keyed by `${system}:${code}` (or `gpax`).
  // We keep ALL scores the user has typed, even across program switches, so
  // that flipping between programs preserves context.
  const [scores, setScores] = useState<TcasScores>({ gpax: 3.5 });
  const [debouncedScores, setDebouncedScores] = useState<TcasScores>(scores);
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedScores(scores), 200);
    return () => clearTimeout(handle);
  }, [scores]);

  const whatIf = useQuery({
    queryKey: ["tcas", "whatIf", target?.id, debouncedScores],
    enabled: !!target?.id,
    queryFn: () =>
      createApiClient().tcas.whatIf({
        programId: target!.id,
        scores: debouncedScores,
      }),
    placeholderData: (prev) => prev,
  });
  const result = whatIf.data ?? null;
  const isSafe = result?.isOnTrack ?? false;

  const groupedExams = useMemo(() => {
    if (!target) return [] as Array<{ system: ExamSystem; items: TcasProgram["components"]["exams"] }>;
    const groups = new Map<ExamSystem, TcasProgram["components"]["exams"]>();
    for (const c of target.components.exams) {
      const arr = groups.get(c.system) ?? [];
      arr.push(c);
      groups.set(c.system, arr);
    }
    return Array.from(groups.entries()).map(([system, items]) => ({ system, items }));
  }, [target]);

  function updateScore(key: string, raw: string) {
    const value = raw === "" ? undefined : Number(raw);
    setScores((prev) => {
      const next = { ...prev };
      if (value === undefined || Number.isNaN(value)) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Calculator size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                กรอกคะแนนของคุณ
              </h3>
            </div>

            {/* GPAX is always visible — it's a gate, not a weighted component. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div
                className={cn(
                  "space-y-1.5 p-3 rounded-2xl border",
                  target?.components.gpaxMin !== null && target?.components.gpaxMin !== undefined
                    ? "bg-amber-50 border-amber-200"
                    : "bg-slate-50/50 border-slate-100",
                )}
              >
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                    GPAX
                  </label>
                  {target?.components.gpaxMin !== null && target?.components.gpaxMin !== undefined && (
                    <span className="text-[9px] font-bold text-amber-600">
                      ≥ {target.components.gpaxMin.toFixed(2)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={scores["gpax"] ?? ""}
                  onChange={(e) => updateScore("gpax", e.target.value)}
                  className="w-full bg-transparent text-sm font-bold focus:outline-none placeholder:text-slate-300"
                  placeholder="3.50"
                />
              </div>
            </div>

            {target ? (
              <div className="space-y-5">
                {groupedExams.map((group) => (
                  <div key={group.system} className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                      {SYSTEM_LABELS[group.system]}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {group.items.map((c) => {
                        const key = componentKey(c.system, c.code);
                        return (
                          <div
                            key={key}
                            className="space-y-1.5 p-3 rounded-2xl border bg-indigo-50/50 border-indigo-100"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <label
                                className="text-[9px] font-bold text-indigo-600 leading-tight line-clamp-2"
                                title={c.name}
                              >
                                {c.name}
                              </label>
                              <span className="text-[9px] font-bold text-indigo-400 shrink-0">
                                {c.weight}%
                              </span>
                            </div>
                            {c.min !== null && (
                              <p className="text-[8px] font-bold text-rose-500">
                                ขั้นต่ำ {c.min}
                              </p>
                            )}
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={scores[key] ?? ""}
                              onChange={(e) => updateScore(key, e.target.value)}
                              className="w-full bg-transparent text-sm font-bold focus:outline-none placeholder:text-slate-300"
                              placeholder="0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                เลือกสาขาทางขวาเพื่อดูช่องคะแนนที่ต้องกรอก
              </p>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-slate-500 font-medium">
                ✨ TCAS {target?.admissionYear ?? "2569"} ({ROUND_LABELS[round]})
              </p>
              <div className="flex bg-slate-100 rounded-lg p-1 flex-wrap">
                {availableRounds.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRound(r)}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                      round === r
                        ? "bg-white shadow-sm text-indigo-600"
                        : "text-slate-500",
                    )}
                  >
                    {ROUND_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {target && result && (
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-8 rounded-3xl border flex flex-col md:flex-row items-center gap-8 justify-between shadow-sm",
                  isSafe
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-rose-50 border-rose-100",
                )}
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest justify-center md:justify-start">
                    {isSafe ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-600" />
                    )}
                    <span className={isSafe ? "text-emerald-600" : "text-rose-600"}>
                      {isSafe ? "ผ่านเกณฑ์" : "ยังไม่ผ่านเกณฑ์"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {target.university}
                  </h3>
                  <p className="text-slate-500 font-medium">
                    {target.faculty} • {target.major}
                    {target.programType ? ` (${target.programType})` : ""}
                  </p>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                      คะแนนถ่วงน้ำหนัก
                    </p>
                    <p
                      className={cn(
                        "text-4xl font-black",
                        isSafe ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {result.weightedAverage.toFixed(2)}
                    </p>
                  </div>
                  {target.totalMinScore !== null && (
                    <>
                      <div className="w-px h-10 bg-slate-200" />
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                          ต่ำสุดที่รับ
                        </p>
                        <p className="text-2xl font-bold text-slate-700">
                          {target.totalMinScore}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>

              {/* The three gates, surfaced independently per FR-TC-03. */}
              <div className="grid sm:grid-cols-3 gap-3">
                <GateChip
                  label="GPAX"
                  ok={result.meetsGpax}
                  detail={
                    target.components.gpaxMin === null
                      ? "ไม่กำหนดขั้นต่ำ"
                      : `ต้อง ≥ ${target.components.gpaxMin.toFixed(2)}`
                  }
                />
                <GateChip
                  label="คะแนนรวมขั้นต่ำ"
                  ok={result.meetsTotalMin}
                  detail={
                    target.totalMinScore === null
                      ? "ไม่กำหนดขั้นต่ำ"
                      : `ต้อง ≥ ${target.totalMinScore}`
                  }
                />
                <GateChip
                  label="คะแนนแต่ละวิชา"
                  ok={result.failedPerSubjectMins.length === 0}
                  detail={
                    result.failedPerSubjectMins.length === 0
                      ? "ผ่านทุกวิชา"
                      : `ขาด ${result.failedPerSubjectMins.length} วิชา`
                  }
                />
              </div>

              {result.failedPerSubjectMins.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700">
                    วิชาที่ยังไม่ผ่านขั้นต่ำ
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {result.failedPerSubjectMins.map((f) => (
                      <div
                        key={`${f.system}:${f.code}`}
                        className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs"
                      >
                        <p className="font-bold text-rose-700">{f.name}</p>
                        <p className="text-rose-600">
                          มี {f.have} • ต้องได้ {f.need} (ขาด {f.need - f.have})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isSafe && result.subjectGaps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-700">
                    What-If — เพิ่มคะแนนรายวิชาเท่าไหร่จึงจะถึงเป้า
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {result.subjectGaps.map((s) => (
                      <div
                        key={`${s.system}:${s.code}`}
                        className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                            {s.name} ({s.weightPct}%)
                          </p>
                          <p className="text-xs text-slate-500">
                            ต้องการอีก{" "}
                            <span className="font-bold text-rose-600">
                              +{s.pointsNeeded}
                            </span>{" "}
                            คะแนน
                          </p>
                        </div>
                        <Link
                          href={`/tutors?subject=${deeplinkSubject(s.name)}`}
                          className={buttonVariants({ size: "compact" })}
                        >
                          หาติวเตอร์
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {target.pastStats.length > 0 && (
                <PastStatsPanel pastStats={target.pastStats} />
              )}

              {!isSafe && result.planB.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ArrowRight size={16} className="text-indigo-600" />
                    Plan B: สาขาใกล้เคียงที่น่าสมัคร
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {result.planB.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setTarget(programs.find((x) => x.id === p.id) ?? target)
                        }
                        className="p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-600 transition-all"
                      >
                        <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide mb-1">
                          {p.major}
                        </p>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">
                          {p.university}
                        </p>
                        <p className="text-[10px] text-slate-500">{p.faculty}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Search size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">เลือกสาขา</h3>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหามหาวิทยาลัยหรือสาขา..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setTarget(u)}
                  className={cn(
                    "w-full p-4 rounded-2xl border text-left transition-all",
                    target?.id === u.id
                      ? "bg-indigo-50 border-indigo-200 shadow-sm"
                      : "bg-white border-slate-100 hover:border-indigo-200",
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide line-clamp-1">
                      {u.major}
                    </p>
                    <Info size={14} className="text-slate-300 shrink-0" />
                  </div>
                  <h4 className="font-bold text-sm mb-1 text-slate-800 line-clamp-1">
                    {u.university}
                  </h4>
                  <div className="flex justify-between items-end gap-2">
                    <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
                      {u.faculty}
                    </p>
                    {u.totalMinScore !== null && (
                      <p className="text-xs font-bold text-slate-700 shrink-0">
                        ต่ำสุด{" "}
                        <span className="text-indigo-600">{u.totalMinScore}</span>
                      </p>
                    )}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">
                  ยังไม่มีสาขาในรอบนี้
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">วันสำคัญ</h3>
            </div>
            <div className="space-y-4">
              {deadlines.map((d) => (
                <div
                  key={d.id}
                  className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0"
                >
                  <div
                    className={cn(
                      "px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter shrink-0",
                      d.type === "exam"
                        ? "bg-rose-100 text-rose-600"
                        : d.type === "registration"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-emerald-100 text-emerald-600",
                    )}
                  >
                    {d.type}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 leading-none">
                      {d.title}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(d.date).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PastStatsPanel({
  pastStats,
}: {
  pastStats: TcasProgram["pastStats"];
}) {
  // Sort newest → oldest for the label, but feed the sparkline oldest → newest
  // so the line moves left-to-right with time.
  const sorted = [...pastStats].sort((a, b) => b.year - a.year);
  const latest = sorted[0];
  if (!latest) return null;
  const tcasNumber = latest.year - 2500;
  const chronological = [...sorted].reverse();

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            คะแนนรับปีที่แล้ว
          </p>
          <p className="text-lg font-black text-slate-800">
            {latest.minScore !== null
              ? `${latest.minScore.toFixed(2)} – ${latest.maxScore?.toFixed(2) ?? "?"}`
              : "ยังไม่ประกาศ"}
            <span className="text-xs font-bold text-slate-400 ml-2">
              (TCAS {tcasNumber})
            </span>
          </p>
          <p className="text-[10px] text-slate-400">
            สมัคร {latest.applicants.toLocaleString()} • รับ {latest.quotaSeats}
          </p>
        </div>
        {chronological.length >= 2 && (
          <MinScoreSparkline data={chronological} />
        )}
      </div>
      {sorted.length > 1 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-indigo-600 font-bold">
            ดูประวัติทั้งหมด ({sorted.length} ปี)
          </summary>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sorted.map((s) => (
              <div
                key={`${s.year}-${s.round}`}
                className="p-2 rounded-lg bg-slate-50 text-center"
              >
                <p className="text-[9px] font-bold text-slate-400">
                  TCAS {s.year - 2500}
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {s.minScore?.toFixed(2) ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function MinScoreSparkline({
  data,
}: {
  data: TcasProgram["pastStats"];
}) {
  // Tiny hand-rolled SVG sparkline; no chart lib needed for one line.
  const points = data
    .map((s) => s.minScore)
    .filter((v): v is number => v !== null);
  if (points.length < 2) return null;

  const width = 120;
  const height = 36;
  const pad = 4;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const coords = points.map((v, i) => {
    const x = pad + (i * (width - 2 * pad)) / (points.length - 1);
    const y = height - pad - ((v - min) / span) * (height - 2 * pad);
    return { x, y };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  const last = coords[coords.length - 1]!;
  const trendUp =
    points[points.length - 1]! > points[0]!;

  return (
    <svg width={width} height={height} className="shrink-0">
      <title>แนวโน้มคะแนนต่ำสุด</title>
      <path
        d={path}
        fill="none"
        stroke={trendUp ? "#dc2626" : "#059669"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r={2.5}
        fill={trendUp ? "#dc2626" : "#059669"}
      />
    </svg>
  );
}

function GateChip({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-xl border flex items-start gap-2",
        ok ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200",
      )}
    >
      {ok ? (
        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
      )}
      <div>
        <p
          className={cn(
            "text-xs font-bold",
            ok ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "text-[10px] font-medium",
            ok ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}
