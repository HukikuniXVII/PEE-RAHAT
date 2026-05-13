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
    tint: "bg-indigo-100 text-indigo-600",
  },
  Physics: {
    label: "ฟิสิกส์",
    icon: Atom,
    tint: "bg-sky-100 text-sky-600",
  },
  Chemistry: {
    label: "เคมี",
    icon: FlaskConical,
    tint: "bg-rose-100 text-rose-600",
  },
  Biology: {
    label: "ชีววิทยา",
    icon: Leaf,
    tint: "bg-emerald-100 text-emerald-600",
  },
  English: {
    label: "อังกฤษ",
    icon: Languages,
    tint: "bg-amber-100 text-amber-600",
  },
  Social: {
    label: "สังคม",
    icon: Globe2,
    tint: "bg-violet-100 text-violet-600",
  },
  Thai: {
    label: "ภาษาไทย",
    icon: BookOpen,
    tint: "bg-orange-100 text-orange-600",
  },
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
                    {meta.label}
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
