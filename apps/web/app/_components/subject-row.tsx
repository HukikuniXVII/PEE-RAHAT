import type { Subject } from "@peerahat/types";
import { SUBJECT_LABELS, subjectSchema } from "@peerahat/types";
import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  Languages,
  Leaf,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";

// Icon + tint per subject. Label is delegated to SUBJECT_LABELS from
// @peerahat/types so it stays in sync with the rest of the app.
const SUBJECT_META: Record<Subject, { icon: LucideIcon; tint: string }> = {
  // TCAS exams — Sparkles icon, varied tints to distinguish them
  TGAT: { icon: Sparkles, tint: "bg-violet-100 text-violet-600" },
  TPAT1: { icon: Sparkles, tint: "bg-rose-100 text-rose-600" },
  TPAT2: { icon: Sparkles, tint: "bg-pink-100 text-pink-600" },
  TPAT3: { icon: Sparkles, tint: "bg-sky-100 text-sky-600" },
  TPAT4: { icon: Sparkles, tint: "bg-amber-100 text-amber-600" },
  TPAT5: { icon: Sparkles, tint: "bg-emerald-100 text-emerald-600" },
  // Core subjects
  Math: { icon: Calculator, tint: "bg-indigo-100 text-indigo-600" },
  AppliedScience: { icon: Atom, tint: "bg-teal-100 text-teal-600" },
  Physics: { icon: Atom, tint: "bg-sky-100 text-sky-600" },
  Chemistry: { icon: FlaskConical, tint: "bg-rose-100 text-rose-600" },
  Biology: { icon: Leaf, tint: "bg-emerald-100 text-emerald-600" },
  Thai: { icon: BookOpen, tint: "bg-orange-100 text-orange-600" },
  Social: { icon: Globe2, tint: "bg-violet-100 text-violet-600" },
  English: { icon: Languages, tint: "bg-amber-100 text-amber-600" },
  // Languages — all share the Languages icon, varied tints
  French: { icon: Languages, tint: "bg-blue-100 text-blue-600" },
  German: { icon: Languages, tint: "bg-yellow-100 text-yellow-600" },
  Japanese: { icon: Languages, tint: "bg-rose-100 text-rose-600" },
  Korean: { icon: Languages, tint: "bg-pink-100 text-pink-600" },
  Chinese: { icon: Languages, tint: "bg-red-100 text-red-600" },
  Pali: { icon: BookOpen, tint: "bg-orange-100 text-orange-600" },
  Spanish: { icon: Languages, tint: "bg-amber-100 text-amber-600" },
};

export async function SubjectRow() {
  const api = createApiClient();
  const counts = await Promise.all(
    subjectSchema.options.map(async (subject) => {
      const res = await api.tutors
        .search({ subject, pageSize: 1 })
        .catch(() => ({ total: 0 }));
      return { subject, total: res.total };
    }),
  );

  return (
    <div className="-mx-6 sm:mx-0 px-6 sm:px-0 overflow-x-auto scrollbar-none">
      <ul className="flex gap-5 sm:gap-7 min-w-max sm:min-w-0 sm:justify-between">
        {counts.map(({ subject, total }) => {
          const meta = SUBJECT_META[subject];
          const Icon = meta.icon;
          const label = SUBJECT_LABELS[subject];
          return (
            <li key={subject}>
              <Link
                href={`/tutors?subject=${subject}`}
                className="group flex flex-col items-center gap-2.5 w-20"
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all ${meta.tint}`}
                >
                  <Icon size={26} strokeWidth={2.2} />
                </div>
                <div className="text-center space-y-0.5">
                  <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors leading-tight">
                    {label}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {total} คน
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
