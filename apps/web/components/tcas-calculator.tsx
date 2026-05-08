"use client";

import type {
  TcasDeadline,
  TcasProgram,
  TcasScoreField,
  TcasScores,
  TcasWhatIfResult,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Info,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  programs: TcasProgram[];
  deadlines: TcasDeadline[];
}

const FIELDS: Array<{ name: TcasScoreField; label: string }> = [
  { name: "tGat", label: "TGAT" },
  { name: "tPat1", label: "TPAT 1" },
  { name: "tPat3", label: "TPAT 3" },
  { name: "aLevelMath1", label: "Math 1" },
  { name: "aLevelEng", label: "English" },
  { name: "aLevelPhy", label: "Physics" },
  { name: "aLevelChe", label: "Chem" },
  { name: "aLevelBio", label: "Bio" },
  { name: "aLevelSoc", label: "Social" },
  { name: "aLevelThai", label: "Thai" },
];

function fieldLabel(field: TcasScoreField): string {
  return field
    .replace("aLevel", "A-")
    .replace("tGat", "TGAT")
    .replace("tPat", "TPAT");
}

export function TcasCalculator({ programs, deadlines }: Props) {
  const [scores, setScores] = useState<TcasScores>({ gpax: 3.5 });
  const [target, setTarget] = useState<TcasProgram | null>(programs[0] ?? null);
  const [search, setSearch] = useState("");
  const [round, setRound] = useState<"3" | "4">("3");
  const [result, setResult] = useState<TcasWhatIfResult | null>(null);

  useEffect(() => {
    if (!target) return;
    const handle = setTimeout(async () => {
      try {
        const r = await createApiClient().tcas.whatIf({
          programId: target.id,
          scores,
        });
        setResult(r);
      } catch {
        // surface errors via toast in real impl
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [scores, target]);

  const filtered = useMemo(
    () =>
      programs.filter(
        (u) =>
          u.round === round &&
          (u.university.toLowerCase().includes(search.toLowerCase()) ||
            u.major.toLowerCase().includes(search.toLowerCase())),
      ),
    [programs, round, search],
  );

  const isSafe = result?.isOnTrack ?? false;
  const myScore = result?.weightedAverage ?? 0;
  const gap = result?.gap ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Calculator size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                Input Your Scores
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="space-y-1.5 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                  GPAX (x.xx)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={scores.gpax ?? ""}
                  onChange={(e) =>
                    setScores((p) => ({
                      ...p,
                      gpax: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-transparent text-sm font-bold focus:outline-none placeholder:text-slate-300"
                  placeholder="3.50"
                />
              </div>
              {FIELDS.map((field) => {
                const weight = target?.weights[field.name];
                return (
                  <div
                    key={field.name}
                    className={cn(
                      "space-y-1.5 p-3 rounded-2xl border transition-all",
                      weight
                        ? "bg-indigo-50/50 border-indigo-100"
                        : "bg-slate-50/50 border-slate-100 grayscale-[0.5] opacity-60",
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <label
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider",
                          weight ? "text-indigo-600" : "text-slate-400",
                        )}
                      >
                        {field.label}
                      </label>
                      {weight && (
                        <span className="text-[9px] font-bold text-indigo-400">
                          {weight}%
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scores[field.name] ?? ""}
                      onChange={(e) =>
                        setScores((p) => ({
                          ...p,
                          [field.name]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full bg-transparent text-sm font-bold focus:outline-none placeholder:text-slate-300"
                      placeholder="0"
                    />
                  </div>
                );
              })}
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                ✨ Updated for TCAS Round {round} Criteria
              </p>
              <div className="flex bg-slate-100 rounded-lg p-1">
                {(["3", "4"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRound(r)}
                    className={cn(
                      "px-4 py-1 text-[10px] font-bold rounded-md transition-all",
                      round === r
                        ? "bg-white shadow-sm text-indigo-600"
                        : "text-slate-500",
                    )}
                  >
                    Round {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

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
                      {isSafe ? "Safe Zone" : "Risk Zone"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {target.university}
                  </h3>
                  <p className="text-slate-500 font-medium">
                    {target.faculty} • {target.major}
                  </p>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                      Weighted Avg
                    </p>
                    <p
                      className={cn(
                        "text-4xl font-black",
                        isSafe ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {myScore.toFixed(2)}%
                    </p>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                      Target Gap
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-bold",
                        isSafe ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {gap > 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </motion.div>

              {!isSafe && result.subjectGaps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-700">
                    What-If — เพิ่มคะแนนรายวิชาเท่าไหร่จึงจะถึงเป้า
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {result.subjectGaps.map((s) => (
                      <div
                        key={s.field}
                        className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                            {fieldLabel(s.field)} ({s.weightPct}%)
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
                          href={`/tutors?subject=${subjectFromField(s.field)}`}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold whitespace-nowrap hover:bg-indigo-700"
                        >
                          Find Tutor
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isSafe && result.planB.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ArrowRight size={16} className="text-indigo-600" />
                    Plan B: Recommended Nearby Programs
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {result.planB.map((p) => (
                      <button
                        key={p.id}
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
                        <p className="text-[10px] text-slate-500">
                          Cut-off: {p.minScore}%
                        </p>
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
              <h3 className="text-xl font-bold text-slate-800">
                Target Programs
              </h3>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search university or major..."
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
                  onClick={() => setTarget(u)}
                  className={cn(
                    "w-full p-4 rounded-2xl border text-left transition-all",
                    target?.id === u.id
                      ? "bg-indigo-50 border-indigo-200 shadow-sm"
                      : "bg-white border-slate-100 hover:border-indigo-200",
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                      {u.major}
                    </p>
                    <Info size={14} className="text-slate-300" />
                  </div>
                  <h4 className="font-bold text-sm mb-1 text-slate-800">
                    {u.university}
                  </h4>
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] text-slate-500 font-medium">
                      {u.faculty}
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                      Cut-off:{" "}
                      <span className="text-indigo-600">{u.minScore}%</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Deadlines</h3>
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

function subjectFromField(field: TcasScoreField): string {
  if (field.startsWith("aLevelMath")) return "Math";
  if (field === "aLevelPhy") return "Physics";
  if (field === "aLevelChe") return "Chemistry";
  if (field === "aLevelBio") return "Biology";
  if (field === "aLevelEng") return "English";
  if (field === "aLevelSoc") return "Social";
  if (field === "aLevelThai") return "Thai";
  return "All";
}
