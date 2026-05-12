"use client";

import {
  type Subject,
  type TutorSort,
  subjectSchema,
  tutorSortSchema,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { RotateCcw } from "lucide-react";

const SUBJECT_LABEL: Record<Subject, string> = {
  Math: "คณิตศาสตร์",
  Physics: "ฟิสิกส์",
  Chemistry: "เคมี",
  Biology: "ชีววิทยา",
  English: "อังกฤษ",
  Social: "สังคม",
  Thai: "ภาษาไทย",
};

const PRICE_BUCKETS: { label: string; min?: number; max?: number }[] = [
  { label: "ทั้งหมด" },
  { label: "ต่ำกว่า ฿300", max: 300 },
  { label: "฿300–฿500", min: 300, max: 500 },
  { label: "฿500–฿1,000", min: 500, max: 1000 },
  { label: "สูงกว่า ฿1,000", min: 1000 },
];

const RATING_OPTIONS = [0, 3, 4, 4.5] as const;

const SORT_OPTIONS: { value: TutorSort; label: string }[] = [
  { value: "rating", label: "คะแนนสูงสุด" },
  { value: "priceAsc", label: "ราคาต่ำสุด" },
  { value: "priceDesc", label: "ราคาสูงสุด" },
  { value: "newest", label: "ล่าสุด" },
];

export interface FilterState {
  subject: Subject | "All";
  university: string;
  minPrice?: number;
  maxPrice?: number;
  minRating: number;
  sort: TutorSort;
}

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

export function FilterSidebar({ value, onChange }: Props) {
  const reset = () =>
    onChange({
      subject: "All",
      university: "",
      minPrice: undefined,
      maxPrice: undefined,
      minRating: 0,
      sort: "rating",
    });

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900">ตัวกรอง</h3>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600"
        >
          <RotateCcw size={12} />
          ล้าง
        </button>
      </div>

      <FilterGroup label="วิชา">
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={value.subject === "All"}
            onClick={() => onChange({ ...value, subject: "All" })}
          >
            ทั้งหมด
          </Chip>
          {subjectSchema.options.map((s) => (
            <Chip
              key={s}
              active={value.subject === s}
              onClick={() => onChange({ ...value, subject: s })}
            >
              {SUBJECT_LABEL[s]}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="มหาวิทยาลัย">
        <input
          type="text"
          value={value.university}
          onChange={(e) =>
            onChange({ ...value, university: e.target.value })
          }
          placeholder="เช่น จุฬาฯ, ธรรมศาสตร์"
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </FilterGroup>

      <FilterGroup label="ช่วงราคา (บาท/ชม.)">
        <div className="flex flex-wrap gap-1.5">
          {PRICE_BUCKETS.map((b) => {
            const active =
              value.minPrice === b.min && value.maxPrice === b.max;
            return (
              <Chip
                key={b.label}
                active={active}
                onClick={() =>
                  onChange({ ...value, minPrice: b.min, maxPrice: b.max })
                }
              >
                {b.label}
              </Chip>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup label="คะแนนขั้นต่ำ">
        <div className="flex flex-wrap gap-1.5">
          {RATING_OPTIONS.map((r) => (
            <Chip
              key={r}
              active={value.minRating === r}
              onClick={() => onChange({ ...value, minRating: r })}
            >
              {r === 0 ? "ทั้งหมด" : `${r}+ ดาว`}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="เรียงตาม">
        <select
          value={value.sort}
          onChange={(e) => {
            const parsed = tutorSortSchema.safeParse(e.target.value);
            if (parsed.success)
              onChange({ ...value, sort: parsed.data });
          }}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {label}
      </p>
      {children}
    </div>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
        active
          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
      )}
    >
      {children}
    </button>
  );
}
