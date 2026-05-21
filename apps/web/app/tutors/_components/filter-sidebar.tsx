"use client";

import {
  SUBJECT_LABELS,
  SUBJECT_TOOLTIPS,
  type Subject,
  type TutorSort,
  tutorSortSchema,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";

// Subject grouping rendered inside the วิชา accordion. Each group is its
// own sub-accordion so the chip strip stays manageable even with 21
// subjects.
const SUBJECT_GROUPS = [
  {
    key: "tcas" as const,
    label: "TGAT / TPAT",
    subjects: ["TGAT", "TPAT1", "TPAT2", "TPAT3", "TPAT4", "TPAT5"] as Subject[],
  },
  {
    key: "science" as const,
    label: "A-Level สายวิทย์",
    subjects: [
      "Math",
      "AppliedScience",
      "Physics",
      "Chemistry",
      "Biology",
    ] as Subject[],
  },
  {
    key: "arts" as const,
    label: "A-Level สายศิลป์ + ภาษา",
    subjects: [
      "Thai",
      "Social",
      "English",
      "French",
      "German",
      "Japanese",
      "Korean",
      "Chinese",
      "Pali",
      "Spanish",
    ] as Subject[],
  },
];

const PRICE_BUCKETS: { label: string; min?: number; max?: number }[] = [
  { label: "ทั้งหมด" },
  { label: "ต่ำกว่า ฿300", max: 300 },
  { label: "฿300–฿500", min: 300, max: 500 },
  { label: "฿500–฿1,000", min: 500, max: 1000 },
  { label: "สูงกว่า ฿1,000", min: 1000 },
];

const RATING_OPTIONS = [0, 3, 4, 4.5] as const;

export interface FilterState {
  subject: Subject | "All";
  university: string;
  minPrice?: number;
  maxPrice?: number;
  minRating: number;
  sort: TutorSort;
}

// `sort` is no longer surfaced inside this component — it lives on the
// results page header. The field stays on FilterState so other call
// sites keep working. Exported for the parent to reuse.
export const SORT_OPTIONS: { value: TutorSort; label: string }[] = [
  { value: "rating", label: "คะแนนสูงสุด" },
  { value: "priceAsc", label: "ราคาต่ำสุด" },
  { value: "priceDesc", label: "ราคาสูงสุด" },
  { value: "newest", label: "ล่าสุด" },
];

export { tutorSortSchema };

type GroupKey =
  | "subject"
  | "price"
  | "university"
  | "rating"
  | "subject_tcas"
  | "subject_science"
  | "subject_arts";

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

export function FilterSidebar({ value, onChange }: Props) {
  // All accordions default to collapsed. Users open only the groups
  // they care about; saves vertical space — especially important now
  // that the subject list has 21 entries split into 3 sub-accordions.
  const [open, setOpen] = useState<Record<GroupKey, boolean>>({
    subject: false,
    price: false,
    university: false,
    rating: false,
    subject_tcas: false,
    subject_science: false,
    subject_arts: false,
  });
  const toggle = (key: GroupKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

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
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-violet-100">
        <h3 className="text-sm font-bold text-grape-deep">ตัวกรอง</h3>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-mute hover:text-dusty-grape transition-colors"
        >
          <RotateCcw size={12} />
          ล้าง
        </button>
      </div>

      {/* 1 — Subject */}
      <FilterGroup
        label="วิชา"
        open={open.subject}
        onToggle={() => toggle("subject")}
      >
        <div className="space-y-3">
          <Chip
            allMode
            active={value.subject === "All"}
            onClick={() => onChange({ ...value, subject: "All" })}
          >
            ทั้งหมด
          </Chip>

          {SUBJECT_GROUPS.map((group) => (
            <SubGroup
              key={group.key}
              label={group.label}
              open={open[`subject_${group.key}` as GroupKey]}
              onToggle={() =>
                toggle(`subject_${group.key}` as GroupKey)
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {group.subjects.map((s) => (
                  <Chip
                    key={s}
                    active={value.subject === s}
                    title={SUBJECT_TOOLTIPS[s]}
                    onClick={() => onChange({ ...value, subject: s })}
                  >
                    {SUBJECT_LABELS[s]}
                  </Chip>
                ))}
              </div>
            </SubGroup>
          ))}
        </div>
      </FilterGroup>

      {/* 2 — Price */}
      <FilterGroup
        label="ช่วงราคา (บาท/ชม.)"
        open={open.price}
        onToggle={() => toggle("price")}
      >
        <div className="flex flex-wrap gap-1.5">
          {PRICE_BUCKETS.map((b) => {
            const isAll = b.min === undefined && b.max === undefined;
            const active =
              value.minPrice === b.min && value.maxPrice === b.max;
            return (
              <Chip
                key={b.label}
                allMode={isAll}
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

      {/* 3 — University */}
      <FilterGroup
        label="มหาวิทยาลัย"
        open={open.university}
        onToggle={() => toggle("university")}
      >
        <input
          type="text"
          value={value.university}
          onChange={(e) =>
            onChange({ ...value, university: e.target.value })
          }
          placeholder="เช่น จุฬาฯ, ธรรมศาสตร์"
          className="w-full bg-white border border-violet-200 rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft placeholder:text-ink-mute focus:outline-none focus:border-violet-500 focus:shadow-focus"
        />
      </FilterGroup>

      {/* 4 — Minimum rating */}
      <FilterGroup
        label="คะแนนขั้นต่ำ"
        open={open.rating}
        onToggle={() => toggle("rating")}
      >
        <div className="flex flex-wrap gap-1.5">
          {RATING_OPTIONS.map((r) => (
            <Chip
              key={r}
              allMode={r === 0}
              active={value.minRating === r}
              onClick={() => onChange({ ...value, minRating: r })}
            >
              {r === 0 ? "ทั้งหมด" : `${r}+ ดาว`}
            </Chip>
          ))}
        </div>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-violet-100/70 last:border-b-0 pb-3 last:pb-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 py-2 text-left group"
      >
        <span className="text-[11px] font-bold text-grape-deep uppercase tracking-widest group-hover:text-dusty-grape transition-colors">
          {label}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={cn(
            "text-ink-mute transition-transform duration-200 group-hover:text-dusty-grape",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open && <div className="pt-2">{children}</div>}
    </div>
  );
}

function SubGroup({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-grape-soft/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left group"
      >
        <span className="text-[12px] font-semibold text-violet-700 group-hover:text-dusty-grape transition-colors">
          {label}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2.5}
          className={cn(
            "text-ink-mute transition-transform duration-200 group-hover:text-dusty-grape",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}

function Chip({
  active,
  allMode,
  children,
  onClick,
  title,
}: {
  active: boolean;
  allMode?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  // `allMode` chips ("ทั้งหมด" / no-constraint) stay outline regardless
  // of selection. Solid violet is reserved for chips that represent an
  // actual narrowing of results, so the user can see at a glance which
  // filters are currently applied.
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        // whitespace-nowrap keeps long Thai labels like
        // "วิทยาศาสตร์ประยุกต์" / "ภาษาฝรั่งเศส" on a single line so the
        // chip strip actually flexes across multiple columns in the
        // narrow sidebar instead of stacking 1-per-row.
        "px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all whitespace-nowrap",
        allMode
          ? active
            ? "bg-grape-soft text-violet-700 border-violet-300"
            : "bg-white text-ink-soft border-neutral-200 hover:border-violet-300"
          : active
            ? "bg-violet-500 text-white border-violet-500 shadow-[0_6px_14px_-6px_rgba(85,65,139,0.5)]"
            : "bg-white text-ink-soft border-neutral-200 hover:border-violet-300 hover:text-violet-700",
      )}
    >
      {children}
    </button>
  );
}
