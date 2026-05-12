import type { Subject } from "@peerahat/types";
import { subjectSchema } from "@peerahat/types";
import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  Languages,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";

const SUBJECT_META: Record<
  Subject,
  { label: string; icon: LucideIcon; tint: string }
> = {
  Math: {
    label: "คณิตศาสตร์",
    icon: Calculator,
    tint: "bg-indigo-50 text-indigo-600",
  },
  Physics: {
    label: "ฟิสิกส์",
    icon: Atom,
    tint: "bg-sky-50 text-sky-600",
  },
  Chemistry: {
    label: "เคมี",
    icon: FlaskConical,
    tint: "bg-rose-50 text-rose-600",
  },
  Biology: {
    label: "ชีววิทยา",
    icon: Leaf,
    tint: "bg-emerald-50 text-emerald-600",
  },
  English: {
    label: "อังกฤษ",
    icon: Languages,
    tint: "bg-amber-50 text-amber-600",
  },
  Social: {
    label: "สังคม",
    icon: Globe2,
    tint: "bg-violet-50 text-violet-600",
  },
  Thai: {
    label: "ภาษาไทย",
    icon: BookOpen,
    tint: "bg-orange-50 text-orange-600",
  },
};

export async function SubjectGrid() {
  const api = createApiClient();
  // Per-subject tutor counts in parallel; pageSize:1 keeps the payload tiny —
  // we only need `total`.
  const counts = await Promise.all(
    subjectSchema.options.map(async (subject) => {
      const res = await api.tutors
        .search({ subject, pageSize: 1 })
        .catch(() => ({ total: 0 }));
      return { subject, total: res.total };
    }),
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {counts.map(({ subject, total }) => {
        const meta = SUBJECT_META[subject];
        const Icon = meta.icon;
        return (
          <Link
            key={subject}
            href={`/tutors?subject=${subject}`}
            className="group bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50 transition-all flex flex-col gap-3"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${meta.tint}`}
            >
              <Icon size={22} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                {meta.label}
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                {total} พี่ติว
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
