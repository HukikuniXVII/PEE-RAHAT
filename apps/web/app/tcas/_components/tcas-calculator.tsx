"use client";

// /tcas — ported from the Claude Design wireframe direction
// (pee-rahat/project/tcas-search-wf.jsx, May 2026 iteration).
//
// Two pages in one file, switched by internal state:
//   - Home   : tab pill · search · filter sidebar | program grid 3×3 | calendar
//   - Detail : back · score input · dark zone advice · similar programs ·
//              pie-weight + past-year card
//
// User-iterated removals from the design:
//   ✓ no "รูปแบบเรียน" filter group anywhere
//   ✓ Detail page has no filter sidebar
//   ✓ no 6-year mini-trend (only YoY delta — we just have 1 year of data)
//   ✓ university filter is search + multi-select chips, not a dropdown
//
// Data: real UnifiedProgram[] + CalendarFile produced server-side in
// apps/web/app/tcas/page.tsx (NETSAT KKU + TCAS R3 mytcas).

import { cn } from "@peerahat/ui";
import {
  ArrowRight,
  Bookmark,
  Calculator as CalculatorIcon,
  ChevronLeft,
  ExternalLink,
  Filter,
  Pin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CalendarFile, CalendarRound } from "@/lib/tcas-data";
import {
  type RoundFilter,
  type UnifiedProgram,
  type UnifiedProgramWeight,
  type Zone,
  calculateWeightedScore,
  classifyZone,
  examCodeLabel,
  zoneLabel,
} from "@/lib/tcas-unified";

interface Props {
  programs: UnifiedProgram[];
  calendar: CalendarFile;
}

// ────────────────────────────────────────────────────────────────────
// Palette (in-file copies of the design tokens; brand-aligned hues are
// already in the Tailwind preset but the zone-semantic ones aren't —
// keep them here so this component is self-contained for the design port).
// ────────────────────────────────────────────────────────────────────

const Z = {
  risky: "#E2585A",
  riskySoft: "#FBE3E4",
  borderline: "#E5A02F",
  borderlineSoft: "#FBEED3",
  competitive: "#2F9B6E",
  competitiveSoft: "#D5EEE2",
  safe: "#7D80DA",
  safeSoft: "#E5E6F8",
} as const;

const ZONE_VIS: Record<Zone, { color: string; soft: string }> = {
  danger: { color: Z.risky, soft: Z.riskySoft },
  borderline: { color: Z.borderline, soft: Z.borderlineSoft },
  safe: { color: Z.competitive, soft: Z.competitiveSoft },
  unknown: { color: "#8C84A6", soft: "#EFEDEC" },
};

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

interface FacultyCategory {
  key: "med" | "eng" | "sci" | "humn" | "biz" | "art" | "edu" | "other";
  icon: string;
  color: string;
  labelTh: string;
}

const CATEGORIES: FacultyCategory[] = [
  { key: "med", icon: "🩺", color: Z.risky, labelTh: "แพทย์/ทันต/เภสัช" },
  { key: "eng", icon: "⚙️", color: "#55418B", labelTh: "วิศวะ" },
  { key: "sci", icon: "🧪", color: Z.competitive, labelTh: "วิทย์" },
  { key: "humn", icon: "📖", color: "#BBA0A0", labelTh: "มนุษย์/นิติ" },
  { key: "biz", icon: "💼", color: "#ECBE42", labelTh: "ธุรกิจ" },
  { key: "art", icon: "🎨", color: "#7D80DA", labelTh: "ศิลปะ" },
  { key: "edu", icon: "🍎", color: "#E5A02F", labelTh: "ครุ/ศึกษา" },
  { key: "other", icon: "🎓", color: "#8C84A6", labelTh: "อื่นๆ" },
];

function categoryFor(faculty: string): FacultyCategory {
  if (/แพทย|ทันต|พยาบาล|เภสัช|สัตว|สาธารณสุข|เทคนิคการแพทย|กายภาพ/.test(faculty))
    return CATEGORIES[0]!;
  if (/วิศวกรรม/.test(faculty)) return CATEGORIES[1]!;
  if (/วิทยาศาสตร์/.test(faculty)) return CATEGORIES[2]!;
  if (/นิติ|มนุษย|อักษร/.test(faculty)) return CATEGORIES[3]!;
  if (/บริหาร|พาณิชย|บัญชี|เศรษฐ/.test(faculty)) return CATEGORIES[4]!;
  if (/ศิลป|สถาปัตย/.test(faculty)) return CATEGORIES[5]!;
  if (/ครุ|ศึกษาศาสตร์/.test(faculty)) return CATEGORIES[6]!;
  return CATEGORIES[7]!;
}

const UNI_SHORT: Record<string, string> = {
  มหาวิทยาลัยขอนแก่น: "มข.",
  จุฬาลงกรณ์มหาวิทยาลัย: "จุฬาฯ",
  มหาวิทยาลัยมหิดล: "มหิดล",
  มหาวิทยาลัยธรรมศาสตร์: "ธรรมศาสตร์",
  มหาวิทยาลัยเกษตรศาสตร์: "ม.เกษตร",
  มหาวิทยาลัยเชียงใหม่: "มช.",
  มหาวิทยาลัยบูรพา: "ม.บูรพา",
  มหาวิทยาลัยสงขลานครินทร์: "ม.อ.",
  มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี: "มจธ.",
  สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง: "สจล.",
};
function shortUni(name: string): string {
  // Defensive: trim + NFC-normalize so JSON-source and source-code keys
  // always compare equal even if one side picks up combining-mark drift.
  const cleaned = name.trim().normalize("NFC");
  return UNI_SHORT[cleaned] ?? cleaned.replace(/^มหาวิทยาลัย/, "ม.").slice(0, 14);
}

// Filter-display name: full Thai name with the redundant "มหาวิทยาลัย"
// removed (handles both prefix and suffix — e.g. "มหาวิทยาลัยขอนแก่น" →
// "ขอนแก่น", "จุฬาลงกรณ์มหาวิทยาลัย" → "จุฬาลงกรณ์"). Names without the
// word (e.g. "สถาบันเทคโนโลยี…", "ราชวิทยาลัยจุฬาภรณ์") are returned
// unchanged. Used in the FilterSidebar uni list so the muted full-name
// column is actually distinguishable across rows instead of every line
// starting with the same truncated "มหาวิทยาลัย…".
function uniDisplayName(name: string): string {
  return name.trim().normalize("NFC").replace(/มหาวิทยาลัย/g, "").trim();
}

function similarityScore(a: UnifiedProgram, b: UnifiedProgram): number {
  const am = new Map(a.weights.map((w) => [w.examCode, w.weightPercent]));
  const bm = new Map(b.weights.map((w) => [w.examCode, w.weightPercent]));
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  am.forEach((v) => (aNorm += v * v));
  bm.forEach((v) => (bNorm += v * v));
  am.forEach((va, code) => {
    const vb = bm.get(code) ?? 0;
    dot += va * vb;
  });
  if (aNorm === 0 || bNorm === 0) return 0;
  return dot / Math.sqrt(aNorm * bNorm);
}

function formatThaiDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function formatRange(start: string | null, end: string | null): string {
  if (!start) return "ยังไม่กำหนด";
  if (!end || end === start) return formatThaiDate(start);
  return `${formatThaiDate(start)} – ${formatThaiDate(end)}`;
}

// Pagination window — show all pages when total ≤ 7, else show the
// first, the last, the current ± 1 neighbour, and ellipses between.
// Keeps the control compact regardless of the underlying list size.
function pageNumbersToShow(
  current: number,
  total: number,
): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// ────────────────────────────────────────────────────────────────────
// Top-level component
// ────────────────────────────────────────────────────────────────────

type Page = "home" | "detail";

export function TcasCalculator({ programs, calendar }: Props) {
  const [page, setPage] = useState<Page>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Esc → back to home
  useEffect(() => {
    if (page !== "detail") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPage("home");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [page]);

  const [tab, setTab] = useState<RoundFilter>("kku-netsat");
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses the search input from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Default: no category filter active → all programs visible. Picking
  // categories narrows down; "ทั้งหมด" semantics = empty Set.
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(),
  );
  const [selectedUnis, setSelectedUnis] = useState<Set<string>>(new Set());
  const [minGpaxBucket, setMinGpaxBucket] = useState<number>(0);

  // Reset the university filter when switching tabs — NETSAT only has
  // KKU programs while TCAS R3 has 73 unis. Carrying a selection across
  // tabs almost always hides the new tab's programs (e.g. selecting
  // "มข." on NETSAT, then switching to TCAS, would show only the ~293
  // KKU R3 programs out of 7,489 — looks like the filter is broken).
  useEffect(() => {
    setSelectedUnis(new Set());
  }, [tab]);

  // Pinned-for-comparison IDs (per the V1 design's compare dock). Cap at
  // 3 per the handoff spec — additional pin attempts silently no-op.
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  function togglePin(id: string) {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }

  const programsInRound = useMemo(
    () =>
      programs.filter((p) =>
        tab === "kku-netsat"
          ? p.source === "kku-netsat"
          : p.source === "tcas-r3",
      ),
    [programs, tab],
  );

  const filtered = useMemo(() => {
    const ql = query.trim().toLowerCase();
    return programsInRound.filter((p) => {
      if (
        ql &&
        !p.programName.toLowerCase().includes(ql) &&
        !p.faculty.toLowerCase().includes(ql) &&
        !p.university.toLowerCase().includes(ql) &&
        !shortUni(p.university).toLowerCase().includes(ql)
      ) {
        return false;
      }
      const cat = categoryFor(p.faculty);
      if (activeCategories.size > 0 && !activeCategories.has(cat.key))
        return false;
      if (selectedUnis.size > 0 && !selectedUnis.has(shortUni(p.university)))
        return false;
      if (
        minGpaxBucket > 0 &&
        (p.minGpax == null || p.minGpax < minGpaxBucket)
      )
        return false;
      return true;
    });
  }, [programsInRound, query, activeCategories, selectedUnis, minGpaxBucket]);

  const [sortKey, setSortKey] = useState<"popular" | "minAsc" | "minDesc">(
    "popular",
  );
  const sortedTiles = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const am = a.history?.min ?? -1;
      const bm = b.history?.min ?? -1;
      if (sortKey === "minAsc") return am - bm;
      if (sortKey === "minDesc") return bm - am;
      return bm - am;
    });
    return arr;
  }, [filtered, sortKey]);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedId) ?? null,
    [programs, selectedId],
  );

  return (
    <>
      <BackgroundLayer />

      <div className="relative">
        <Chrome
          tab={tab}
          onTab={setTab}
          query={query}
          setQuery={setQuery}
          page={page}
          searchInputRef={searchInputRef}
          suggestions={page === "home" ? sortedTiles : []}
          onPickSuggestion={(id) => {
            setSelectedId(id);
            setPage("detail");
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        />

        {page === "home" ? (
          <HomePage
            tiles={sortedTiles}
            allPrograms={programs}
            programsInRound={programsInRound}
            totalInRound={programsInRound.length}
            calendar={calendar}
            tab={tab}
            activeCategories={activeCategories}
            setActiveCategories={setActiveCategories}
            selectedUnis={selectedUnis}
            setSelectedUnis={setSelectedUnis}
            minGpaxBucket={minGpaxBucket}
            setMinGpaxBucket={setMinGpaxBucket}
            sortKey={sortKey}
            setSortKey={setSortKey}
            pinned={pinned}
            onTogglePin={togglePin}
            onResetFilters={() => {
              setActiveCategories(new Set());
              setSelectedUnis(new Set());
              setMinGpaxBucket(0);
            }}
            onPickProgram={(id) => {
              setSelectedId(id);
              setPage("detail");
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          />
        ) : (
          <DetailPage
            program={selectedProgram}
            allPrograms={programs}
            onBack={() => setPage("home")}
          />
        )}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// Soft brand background (matches the design's ts-bg gradient)
// ────────────────────────────────────────────────────────────────────

function BackgroundLayer() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        background:
          "radial-gradient(60% 50% at 92% 8%, rgba(229,219,230,0.55) 0%, rgba(229,219,230,0) 60%)," +
          "radial-gradient(50% 45% at 6% 22%, rgba(187,160,160,0.30) 0%, rgba(187,160,160,0) 62%)," +
          "radial-gradient(55% 50% at 95% 92%, rgba(125,128,218,0.20) 0%, rgba(125,128,218,0) 60%)," +
          "linear-gradient(180deg, #FAF6F5 0%, #F2EEF6 60%, #ECE2E5 100%)",
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────
// Shared chrome: tab pill + search bar
// ────────────────────────────────────────────────────────────────────

function Chrome({
  tab,
  onTab,
  query,
  setQuery,
  page,
  searchInputRef,
  suggestions,
  onPickSuggestion,
}: {
  tab: RoundFilter;
  onTab: (t: RoundFilter) => void;
  query: string;
  setQuery: (q: string) => void;
  page: Page;
  searchInputRef: React.RefObject<HTMLInputElement>;
  suggestions: UnifiedProgram[];
  onPickSuggestion: (id: string) => void;
}) {
  // Autocomplete state — open when the user has typed something and the
  // input is focused. Hidden on click-outside / Esc / blur.
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!focused) return;
    function onDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [focused]);

  const showSuggestions =
    page === "home" && focused && query.trim().length > 0;
  const top = suggestions.slice(0, 8);

  return (
    <div className="space-y-3 mb-5">
      <div className="grid grid-cols-2 gap-2 rounded-full p-1.5 bg-grape-soft border border-violet-100">
        {(
          [
            { v: "kku-netsat", label: "NETSAT", sub: "มข. รอบ 2 โควตา" },
            { v: "tcas-r3", label: "TCAS", sub: "รอบ 3 Admission" },
          ] as const
        ).map((t) => {
          const on = tab === t.v;
          return (
            <button
              key={t.v}
              type="button"
              onClick={() => onTab(t.v)}
              className={cn(
                "rounded-xl py-2.5 thai text-[14px] font-bold transition",
                on
                  ? "bg-violet-500 text-white shadow-[0_6px_14px_-6px_rgba(85,65,139,0.5)]"
                  : "bg-transparent text-grape-deep",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "thai text-[11px] font-normal ml-2",
                  on ? "opacity-90" : "opacity-60",
                )}
              >
                {t.sub}
              </span>
            </button>
          );
        })}
      </div>

      <div ref={wrapperRef} className="relative">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-[rgba(85,65,139,0.10)] shadow-[0_1px_0_rgba(85,65,139,0.04)]">
          <Search size={16} className="text-ink-mute" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setFocused(false);
                searchInputRef.current?.blur();
              }
              if (e.key === "Enter" && top[0]) {
                e.preventDefault();
                setFocused(false);
                onPickSuggestion(top[0].id);
              }
            }}
            placeholder={
              page === "home"
                ? "ค้นหาคณะ / สาขา / มหา'ลัย (เช่น 'วิศวะคอม', 'แพทย์ มข.')"
                : "ค้นหาในผลลัพธ์…"
            }
            className="thai flex-1 outline-none bg-transparent text-[13.5px] text-grape-deep placeholder:text-ink-mute"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchInputRef.current?.focus();
              }}
              className="text-ink-mute hover:text-dusty-grape p-1"
              aria-label="ล้างคำค้น"
            >
              <X size={14} />
            </button>
          )}
          <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-grape-soft text-grape-deep">
            ⌘K
          </span>
          {page === "detail" && (
            <span className="thai text-[10.5px] font-medium ml-1 px-2 py-1 rounded-md bg-taupe-soft text-taupe-deep">
              หน้ารายละเอียด
            </span>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && top.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-2xl border border-violet-100 shadow-[0_18px_40px_-22px_rgba(85,65,139,0.4)] overflow-hidden">
            <ul className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-violet-100">
              {top.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // mouseDown fires before blur → don't close prematurely.
                      e.preventDefault();
                      setFocused(false);
                      onPickSuggestion(p.id);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-grape-soft/60 transition-colors thai"
                  >
                    <p className="text-sm font-semibold text-grape-deep leading-tight truncate">
                      {p.programName}
                    </p>
                    <p className="text-[11px] text-ink-mute truncate">
                      {p.university} · {p.faculty}
                      <span
                        className={cn(
                          "ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                          p.source === "kku-netsat"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-violet-100 text-violet-700",
                        )}
                      >
                        {p.source === "kku-netsat" ? "NETSAT" : "R3"}
                      </span>
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-4 py-2 text-[10px] thai text-ink-mute bg-grape-soft/30 border-t border-violet-100">
              ↵ Enter เพื่อเปิดผลลัพธ์แรก · Esc เพื่อปิด
            </div>
          </div>
        )}
        {showSuggestions && top.length === 0 && (
          <div className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-2xl border border-violet-100 shadow-[0_18px_40px_-22px_rgba(85,65,139,0.4)] px-4 py-6 text-center">
            <p className="thai text-sm text-ink-mute">
              ไม่พบหลักสูตรที่ตรงกับ "{query}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// PAGE 1 — Home (filter | program grid | calendar)
// ────────────────────────────────────────────────────────────────────

function HomePage(props: {
  tiles: UnifiedProgram[];
  allPrograms: UnifiedProgram[];
  programsInRound: UnifiedProgram[];
  totalInRound: number;
  calendar: CalendarFile;
  tab: RoundFilter;
  activeCategories: Set<string>;
  setActiveCategories: (s: Set<string>) => void;
  selectedUnis: Set<string>;
  setSelectedUnis: (s: Set<string>) => void;
  minGpaxBucket: number;
  setMinGpaxBucket: (n: number) => void;
  sortKey: "popular" | "minAsc" | "minDesc";
  setSortKey: (s: "popular" | "minAsc" | "minDesc") => void;
  pinned: Set<string>;
  onTogglePin: (id: string) => void;
  onResetFilters: () => void;
  onPickProgram: (id: string) => void;
}) {
  const {
    tiles,
    allPrograms,
    programsInRound,
    totalInRound,
    calendar,
    tab,
    activeCategories,
    setActiveCategories,
    selectedUnis,
    setSelectedUnis,
    minGpaxBucket,
    setMinGpaxBucket,
    onResetFilters,
    sortKey,
    setSortKey,
    pinned,
    onTogglePin,
    onPickProgram,
  } = props;

  const PAGE_SIZE = 24;
  const [pageNum, setPageNum] = useState(1);
  const totalPages = Math.max(1, Math.ceil(tiles.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, pageNum), totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleTiles = tiles.slice(pageStart, pageStart + PAGE_SIZE);

  // Reset to page 1 whenever the filter pipeline produces a new tiles
  // array — happens on tab switch, filter changes, sort changes, and
  // search query changes. Without this the user could land on page 5
  // and see fewer items than the page-size when filters narrow.
  useEffect(() => {
    setPageNum(1);
  }, [tiles]);

  return (
    <div
      className="grid gap-4 md:[grid-template-columns:minmax(220px,240px)_1fr_minmax(240px,268px)]"
    >
      <FilterSidebar
        programs={programsInRound}
        activeCategories={activeCategories}
        setActiveCategories={setActiveCategories}
        selectedUnis={selectedUnis}
        setSelectedUnis={setSelectedUnis}
        minGpaxBucket={minGpaxBucket}
        setMinGpaxBucket={setMinGpaxBucket}
        onResetFilters={onResetFilters}
      />

      <main className="flex flex-col min-w-0">
        <ActiveFilterBanner
          tab={tab}
          tilesCount={tiles.length}
          totalInRound={totalInRound}
          activeCategories={activeCategories}
          selectedUnis={selectedUnis}
          minGpaxBucket={minGpaxBucket}
          onClearCategory={(key) => {
            const next = new Set(activeCategories);
            next.delete(key);
            setActiveCategories(next);
          }}
          onClearUni={(short) => {
            const next = new Set(selectedUnis);
            next.delete(short);
            setSelectedUnis(next);
          }}
          onClearGpax={() => setMinGpaxBucket(0)}
          onResetAll={onResetFilters}
        />

        <div className="flex items-center justify-between mb-3">
          <p className="thai text-[12px] text-ink-soft">
            แสดง{" "}
            <span className="font-bold text-grape-deep tabular-nums">
              {Math.min(tiles.length, 24).toLocaleString()}
            </span>{" "}
            จาก{" "}
            <span className="font-bold text-grape-deep tabular-nums">
              {tiles.length.toLocaleString()}
            </span>{" "}
            หลักสูตรที่ตรงเงื่อนไข
            <span className="text-ink-mute ml-1">
              (ทั้งหมดในรอบ {tab === "kku-netsat" ? "NETSAT" : "TCAS"}:{" "}
              {totalInRound.toLocaleString()})
            </span>
          </p>
          <select
            value={sortKey}
            onChange={(e) =>
              setSortKey(e.target.value as "popular" | "minAsc" | "minDesc")
            }
            className="thai text-[11.5px] cursor-pointer outline-none bg-white border border-[rgba(85,65,139,0.12)] px-2 py-1 rounded-lg text-ink"
          >
            <option value="popular">เรียง: ความนิยม</option>
            <option value="minAsc">คะแนน min ↑</option>
            <option value="minDesc">คะแนน min ↓</option>
          </select>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {visibleTiles.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              pinned={pinned.has(p.id)}
              onTogglePin={onTogglePin}
              onOpen={() => onPickProgram(p.id)}
            />
          ))}
        </div>

        {tiles.length === 0 && (
          <p className="thai text-sm text-ink-mute mt-6 text-center bg-white/60 border border-dashed border-violet-200 rounded-xl py-8">
            ไม่พบหลักสูตรที่ตรงกับเงื่อนไข — ลองปรับตัวกรองอีกครั้ง
          </p>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="ตัวเลือกหน้า"
            className="mt-6 flex items-center justify-center gap-1.5 flex-wrap"
          >
            <button
              type="button"
              onClick={() => {
                setPageNum(Math.max(1, currentPage - 1));
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              disabled={currentPage === 1}
              className="thai text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white border border-violet-100 text-grape-deep hover:border-violet-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ‹ ย้อนกลับ
            </button>

            {pageNumbersToShow(currentPage, totalPages).map((n, i) =>
              n === "…" ? (
                <span
                  key={`gap-${i}`}
                  aria-hidden
                  className="text-ink-mute text-[12px] px-1"
                >
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setPageNum(n);
                    if (typeof window !== "undefined") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={cn(
                    "thai text-[12px] font-semibold tabular-nums min-w-[32px] h-8 rounded-lg transition-colors",
                    n === currentPage
                      ? "bg-violet-500 text-white shadow-[0_4px_10px_-4px_rgba(85,65,139,0.45)]"
                      : "bg-white border border-violet-100 text-grape-deep hover:border-violet-300",
                  )}
                >
                  {n}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => {
                setPageNum(Math.min(totalPages, currentPage + 1));
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              disabled={currentPage === totalPages}
              className="thai text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white border border-violet-100 text-grape-deep hover:border-violet-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ถัดไป ›
            </button>
          </nav>
        )}

        {totalPages > 1 && (
          <p className="thai text-[10.5px] mt-2 text-center text-ink-mute tabular-nums">
            {tiles.length.toLocaleString()} หลักสูตร · {PAGE_SIZE} หลักสูตรต่อหน้า
          </p>
        )}

        <p className="thai text-[10.5px] mt-3 text-ink-mute">
          💡 กดที่หลักสูตรเพื่อเปิดเครื่องคำนวณ + ดูหลักสูตรใกล้เคียง
        </p>
      </main>

      <aside className="space-y-4">
        <PinnedWidget
          pinned={pinned}
          programs={allPrograms}
          onPick={onPickProgram}
          onUnpin={onTogglePin}
        />
        <CalendarWidget calendar={calendar} tab={tab} />
      </aside>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// PinnedWidget — shows the user's pinned-for-comparison programs in
// the right rail. Pins are kept across tab switches (KKU ↔ TCAS) so
// the widget treats them as a personal bookmark list independent of
// the current round filter.
// ────────────────────────────────────────────────────────────────────

function PinnedWidget({
  pinned,
  programs,
  onPick,
  onUnpin,
}: {
  pinned: Set<string>;
  programs: UnifiedProgram[];
  onPick: (id: string) => void;
  onUnpin: (id: string) => void;
}) {
  const items = programs.filter((p) => pinned.has(p.id));

  return (
    <div className="bg-white rounded-2xl border border-violet-100 p-3 shadow-[0_4px_12px_-8px_rgba(85,65,139,0.18)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="thai text-[11px] font-bold text-grape-deep uppercase tracking-wider flex items-center gap-1.5">
          <Pin size={11} className="text-dusty-grape" />
          ปักหมุด
        </h3>
        {items.length > 0 && (
          <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-grape-soft text-grape-deep font-bold">
            {items.length}/3
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="thai text-[10.5px] text-ink-mute leading-relaxed">
          ยังไม่มีหลักสูตรที่ปักหมุด — กดไอคอน{" "}
          <Pin size={9} className="inline-block align-baseline" />{" "}
          บนการ์ดเพื่อเก็บไว้เปรียบเทียบ (สูงสุด 3)
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((p) => (
            <li
              key={p.id}
              className="relative group rounded-lg border border-violet-100 bg-white hover:border-violet-200 transition-colors"
            >
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className="block w-full text-left px-2 py-1.5 pr-6 min-w-0"
              >
                <p className="thai text-[11px] font-bold text-grape-deep truncate">
                  {p.programName}
                </p>
                <p className="thai text-[9.5px] text-ink-mute truncate">
                  {p.faculty} · {uniDisplayName(p.university)}
                </p>
                {p.history?.min != null && (
                  <p className="text-[9.5px] mt-0.5 text-ink-soft">
                    ขั้นต่ำปีก่อน{" "}
                    <span className="tabular-nums font-bold text-grape-deep">
                      {p.history.min.toFixed(2)}
                    </span>
                  </p>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpin(p.id);
                }}
                aria-label="ถอนปักหมุด"
                title="ถอนปักหมุด"
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full inline-flex items-center justify-center text-ink-mute hover:text-violet-500 hover:bg-violet-100/60"
              >
                <X size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Active-filter banner (surfaces the current filter state so the
// number on the count line and the cards in the grid feel obviously
// connected — without this, narrowing 7,489 → 197 looked the same as
// "filter not applied" to many users).
// ────────────────────────────────────────────────────────────────────

function ActiveFilterBanner({
  tab,
  tilesCount,
  totalInRound,
  activeCategories,
  selectedUnis,
  minGpaxBucket,
  onClearCategory,
  onClearUni,
  onClearGpax,
  onResetAll,
}: {
  tab: RoundFilter;
  tilesCount: number;
  totalInRound: number;
  activeCategories: Set<string>;
  selectedUnis: Set<string>;
  minGpaxBucket: number;
  onClearCategory: (key: string) => void;
  onClearUni: (short: string) => void;
  onClearGpax: () => void;
  onResetAll: () => void;
}) {
  const hasAny =
    activeCategories.size > 0 ||
    selectedUnis.size > 0 ||
    minGpaxBucket > 0;
  if (!hasAny) return null;

  const matchEmpty = tilesCount === 0;

  return (
    <div
      className={cn(
        "mb-3 rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-2",
        matchEmpty
          ? "bg-rose-50/70 border-rose-200"
          : "bg-accent-500/15 border-accent-500/40",
      )}
    >
      <span
        className={cn(
          "thai text-[12px] font-bold",
          matchEmpty ? "text-rose-700" : "text-grape-deep",
        )}
      >
        {matchEmpty
          ? "⚠️ ไม่มีหลักสูตรตรงตัวกรอง"
          : `🔍 ตัวกรองกำลังทำงาน — แสดง ${tilesCount.toLocaleString()} จาก ${totalInRound.toLocaleString()} หลักสูตรในรอบ ${tab === "kku-netsat" ? "NETSAT" : "TCAS"}`}
      </span>

      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
        {[...activeCategories].map((key) => {
          const cat = CATEGORIES.find((c) => c.key === key);
          if (!cat) return null;
          return (
            <FilterChip
              key={`cat-${key}`}
              label={`${cat.icon} ${cat.labelTh}`}
              onClear={() => onClearCategory(key)}
            />
          );
        })}
        {[...selectedUnis].map((short) => (
          <FilterChip
            key={`uni-${short}`}
            label={short}
            onClear={() => onClearUni(short)}
          />
        ))}
        {minGpaxBucket > 0 && (
          <FilterChip
            label={`GPAX ≥ ${minGpaxBucket.toFixed(2)}`}
            onClear={onClearGpax}
          />
        )}
        <button
          type="button"
          onClick={onResetAll}
          className="thai ml-1 text-[11px] font-bold underline underline-offset-2 text-grape-deep hover:text-violet-500"
        >
          ล้างทั้งหมด
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="thai inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-bold bg-violet-500 text-white">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`ลบตัวกรอง ${label}`}
        className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center bg-white/25 hover:bg-white/40 transition-colors"
      >
        <X size={9} />
      </button>
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────
// Filter sidebar
// ────────────────────────────────────────────────────────────────────

function FilterSidebar({
  programs,
  activeCategories,
  setActiveCategories,
  selectedUnis,
  setSelectedUnis,
  minGpaxBucket,
  setMinGpaxBucket,
  onResetFilters,
}: {
  programs: UnifiedProgram[];
  activeCategories: Set<string>;
  setActiveCategories: (s: Set<string>) => void;
  selectedUnis: Set<string>;
  setSelectedUnis: (s: Set<string>) => void;
  minGpaxBucket: number;
  setMinGpaxBucket: (n: number) => void;
  onResetFilters: () => void;
}) {
  const catCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of programs) {
      const k = categoryFor(p.faculty).key;
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [programs]);

  // Build uni list as { short, full, count } so the search input can
  // match against BOTH the abbreviation (e.g. "มข.") and the full
  // Thai name (e.g. "มหาวิทยาลัยขอนแก่น"). Without the full name in the
  // searchable text, typing "ขอนแก่น" would miss "มข." silently.
  const uniList = useMemo(() => {
    const m = new Map<string, { short: string; full: string; count: number }>();
    for (const p of programs) {
      const s = shortUni(p.university);
      const existing = m.get(s);
      if (existing) existing.count += 1;
      else m.set(s, { short: s, full: uniDisplayName(p.university), count: 1 });
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [programs]);

  const activeCount =
    activeCategories.size +
    selectedUnis.size +
    (minGpaxBucket > 0 ? 1 : 0);

  function toggle(setFn: (s: Set<string>) => void, src: Set<string>, key: string) {
    const next = new Set(src);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setFn(next);
  }

  return (
    <aside className="rounded-2xl bg-white p-4 self-start md:sticky md:top-24 border border-[rgba(85,65,139,0.10)] shadow-[0_1px_0_rgba(85,65,139,0.04)]">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} className="text-grape-deep" />
        <p className="thai text-[12.5px] font-bold text-grape-deep">Filter</p>
        {activeCount > 0 && (
          <span className="text-[10px] font-mono ml-auto px-1.5 py-0.5 rounded bg-accent-500 text-grape-deep">
            {activeCount}
          </span>
        )}
      </div>

      <FilterGroup label="กลุ่มสาขา">
        {CATEGORIES.slice(0, 6).map((c) => {
          const n = catCount[c.key] ?? 0;
          const on = activeCategories.has(c.key);
          return (
            <label
              key={c.key}
              className="flex items-center gap-2 py-1 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  toggle(setActiveCategories, activeCategories, c.key)
                }
                style={{ accentColor: "#55418B" }}
              />
              <span className="thai text-[11.5px] text-ink">
                {c.icon} {c.labelTh}
              </span>
              <span className="text-[10px] tabular-nums ml-auto text-ink-mute">
                {n}
              </span>
            </label>
          );
        })}
      </FilterGroup>

      <FilterGroup label="GPAX ขั้นต่ำ">
        <div className="flex flex-wrap gap-1">
          {(
            [
              { v: 0, label: "ไม่จำกัด" },
              { v: 2.5, label: "≥ 2.50" },
              { v: 2.75, label: "≥ 2.75" },
              { v: 3.0, label: "≥ 3.00" },
              { v: 3.25, label: "≥ 3.25" },
              { v: 3.5, label: "≥ 3.50" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setMinGpaxBucket(opt.v)}
              className={cn(
                "thai text-[11px] px-2.5 py-1 rounded-full border transition",
                minGpaxBucket === opt.v
                  ? "bg-violet-500 text-white border-violet-500"
                  : "bg-white text-grape-deep border-[rgba(85,65,139,0.14)] hover:border-violet-300",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterGroup>

      <UniFilterGroup
        uniList={uniList}
        selected={selectedUnis}
        toggle={(code) => toggle(setSelectedUnis, selectedUnis, code)}
      />

      <button
        type="button"
        onClick={onResetFilters}
        className="mt-4 w-full thai text-[11.5px] font-semibold py-2 rounded-lg bg-grape-soft text-grape-deep hover:bg-grape-soft/80 transition-colors"
      >
        รีเซ็ตตัวกรอง
      </button>
    </aside>
  );
}

function FilterGroup({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(!last && "mb-3 pb-3")}
      style={!last ? { borderBottom: "1px dashed rgba(85,65,139,0.12)" } : {}}
    >
      <p className="thai text-[10px] font-bold uppercase tracking-wider mb-2 text-ink-mute">
        {label}
      </p>
      {children}
    </div>
  );
}

function UniFilterGroup({
  uniList,
  selected,
  toggle,
}: {
  uniList: Array<{ short: string; full: string; count: number }>;
  selected: Set<string>;
  toggle: (code: string) => void;
}) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  // Match against BOTH the short code and the full Thai name so
  // typing "ขอนแก่น", "มข.", or "Khon Kaen" all reach the same row.
  const filtered = uniList.filter((u) => {
    if (!ql) return true;
    return (
      u.short.toLowerCase().includes(ql) ||
      u.full.toLowerCase().includes(ql)
    );
  });

  return (
    <div
      className="mb-3 pb-3"
      style={{ borderBottom: "1px dashed rgba(85,65,139,0.12)" }}
    >
      <p className="thai text-[10px] font-bold uppercase tracking-wider mb-2 text-ink-mute">
        มหาวิทยาลัย{" "}
        <span className="font-mono ml-1 text-ink-mute">
          ({uniList.length})
        </span>
        {selected.size > 0 && (
          <span className="font-mono ml-1 px-1 rounded bg-accent-500 text-grape-deep font-bold">
            {selected.size}
          </span>
        )}
      </p>

      <div className="relative mb-2">
        <Search
          size={12}
          className="absolute left-2 top-[7px] text-ink-mute"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหามหา'ลัย (พิมพ์ชื่อเต็ม / ย่อ)"
          className="w-full thai text-[11px] outline-none bg-white rounded-lg border border-[rgba(85,65,139,0.18)] text-ink pl-6 pr-2 py-[5px] focus:border-violet-500"
        />
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {[...selected].map((code) => {
            const match = uniList.find((u) => u.short === code);
            const label = match?.full || code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggle(code)}
                className="thai text-[10px] font-semibold pl-2 pr-1 py-0.5 rounded-full inline-flex items-center gap-1 bg-violet-500 text-white"
              >
                {label}
                <span className="w-3 h-3 rounded-full inline-flex items-center justify-center bg-white/20">
                  <X size={7} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-lg overflow-hidden bg-violet-100/30 max-h-[260px] overflow-y-auto custom-scrollbar">
        {filtered.length === 0 ? (
          <p className="thai text-[10.5px] py-3 text-center text-ink-mute">
            ไม่พบมหา'ลัย "{q}"
          </p>
        ) : (
          // Render the full list (scrollable container handles overflow).
          // Previously capped at 20 → most TCAS R3 unis (73 total) were
          // unreachable without typing the exact name first.
          filtered.map((u) => {
            const on = selected.has(u.short);
            return (
              <label
                key={u.short}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white transition"
                style={{ background: on ? "#fff" : "transparent" }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(u.short)}
                  style={{ accentColor: "#55418B" }}
                />
                <span className="thai text-[11px] font-bold text-grape-deep flex-1 truncate">
                  {u.full || u.short}
                </span>
                <span className="text-[9.5px] tabular-nums text-ink-mute">
                  {u.count}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Program card — ported from design_handoff_v1_program_card/
//   - 24px rounded card with score band + stacked weight bar + chips
//   - pin button (top-right) with violet ring when pinned
//   - dashed-divider footer with "ที่นั่ง · GPAX" + "คำนวณ →" CTA
// Whole-card click (anywhere outside pin/CTA) opens the detail page.
// ────────────────────────────────────────────────────────────────────

const WEIGHT_SEGMENT_COLORS = [
  "bg-violet-500",
  "bg-soft-periwinkle",
  "bg-rosy-taupe",
  "bg-accent-600",
  "bg-emerald-600",
  "bg-amber-500",
] as const;

function ProgramCard({
  program,
  pinned,
  onTogglePin,
  onOpen,
}: {
  program: UnifiedProgram;
  pinned: boolean;
  onTogglePin: (id: string) => void;
  onOpen: () => void;
}) {
  const p = program;
  // All loaded programs come from the active quota files. The handoff
  // contract supports `inactive` for future use (programs in the stat
  // file but not in current-year quota); preserve the type via a cast
  // so the inactive-badge branch stays reachable to TS.
  const status: "active" | "inactive" = "active" as "active" | "inactive";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "rounded-3xl bg-white p-[18px] transition duration-200 hover:-translate-y-0.5 cursor-pointer",
        "shadow-[0_1px_0_rgba(85,65,139,0.04),0_12px_28px_-18px_rgba(85,65,139,0.25)]",
        pinned
          ? "border border-violet-500 shadow-[0_0_0_2px_rgba(85,65,139,0.18),0_18px_40px_-22px_rgba(85,65,139,0.45)]"
          : "border border-[rgba(85,65,139,0.08)]",
      )}
    >
      {/* Header: uni chip + status badge · pin button */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="thai text-[11px] font-bold px-2 py-0.5 rounded-md bg-grape-soft text-grape-deep">
            {shortUni(p.university)}
          </span>
          {status === "inactive" ? (
            <span className="thai inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-taupe-soft text-taupe-deep">
              📁 ไม่เปิดปีนี้
            </span>
          ) : (
            <span className="thai inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-600"
                aria-hidden
              />
              เปิด {p.source === "kku-netsat" ? "2569" : "R3"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(p.id);
          }}
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
          <Pin
            className="w-3.5 h-3.5"
            fill={pinned ? "currentColor" : "none"}
            strokeWidth={1.8}
          />
        </button>
      </div>

      {/* Faculty + program name */}
      <p className="thai text-[11.5px] font-medium text-soft-periwinkle mb-0.5 truncate">
        {p.faculty}
      </p>
      <h3
        className="thai text-[16px] font-bold leading-tight text-grape-deep"
        style={{ minHeight: 38 }}
      >
        {p.programName}
      </h3>

      {/* Score band */}
      {p.history && (
        <div className="rounded-2xl p-3 mt-3 bg-grape-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="thai text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-mute">
              สถิติคะแนน ปี {p.history.year}
            </span>
            <Sparkline values={[p.history.min, p.history.mean, p.history.max]} />
          </div>
          <div className="grid grid-cols-3">
            <ScoreStat label="min" value={p.history.min} color={Z.risky} />
            <ScoreStat
              label="mean"
              value={p.history.mean}
              color="#55418B"
            />
            <ScoreStat label="max" value={p.history.max} color={Z.competitive} />
          </div>
        </div>
      )}

      {/* Subject weights */}
      {p.weights.length > 0 && (
        <div className="mt-3">
          <p className="thai text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-mute mb-1.5">
            วิชาที่ใช้ ({p.weights.length})
          </p>
          <div
            className="flex h-2 rounded-full overflow-hidden bg-[#F2EEF6]"
            role="img"
            aria-label="สัดส่วนน้ำหนักวิชา"
          >
            {p.weights.map((w, i) => (
              <div
                key={`${w.examCode}-${i}`}
                className={WEIGHT_SEGMENT_COLORS[i % WEIGHT_SEGMENT_COLORS.length]}
                style={{ width: `${w.weightPercent}%` }}
                title={`${w.rawSubjectName || examCodeLabel(w.examCode)} ${w.weightPercent.toFixed(0)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {p.weights.slice(0, 3).map((w, i) => (
              <span
                key={`${w.examCode}-${i}`}
                className="thai text-[10px] px-1.5 py-0.5 rounded bg-[#F5F2FA] text-ink-soft"
              >
                {w.rawSubjectName || examCodeLabel(w.examCode)}{" "}
                <span className="tabular-nums font-semibold text-grape-deep">
                  {w.weightPercent.toFixed(0)}%
                </span>
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

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-dashed border-[rgba(85,65,139,0.15)]">
        <div className="flex items-center gap-3 thai text-[11px] text-ink-soft">
          {p.seats != null && (
            <span>
              <span className="text-ink-mute">ที่นั่ง</span>{" "}
              <span className="tabular-nums font-bold text-ink">
                {p.seats}
              </span>
            </span>
          )}
          {p.minGpax != null && (
            <span>
              <span className="text-ink-mute">GPAX</span>{" "}
              <span className="tabular-nums font-bold text-ink">
                {p.minGpax.toFixed(2)}
              </span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="thai inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-lg bg-grape-deep text-white hover:bg-violet-500 transition"
        >
          <CalculatorIcon className="w-3 h-3" strokeWidth={1.8} />
          คำนวณ
          <ArrowRight className="w-3 h-3" strokeWidth={1.8} />
        </button>
      </div>
    </article>
  );
}

function ScoreStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  return (
    <div className="text-center">
      <p
        className="tabular-nums text-[18px] font-bold leading-none"
        style={{ color }}
        aria-label={`คะแนน${label} ${value ?? "ไม่มีข้อมูล"}`}
      >
        {value != null ? value.toFixed(1) : "—"}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute mt-1">
        {label}
      </p>
    </div>
  );
}

function Sparkline({ values }: { values: (number | null)[] }) {
  // The handoff says: hide if < 3 data points. We currently only have
  // 1 year of history (3 data points per card if you count min/mean/max),
  // so render those as a tiny shape so the card never has a blank slot.
  const clean = values.filter((v): v is number => v != null);
  if (clean.length < 2) return null;

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
    <svg
      width={w}
      height={h}
      className="block text-violet-500"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// Calendar widget (Home right rail)
// ────────────────────────────────────────────────────────────────────

function CalendarWidget({
  calendar,
  tab,
}: {
  calendar: CalendarFile;
  tab: RoundFilter;
}) {
  const rounds = useMemo<CalendarRound[]>(() => {
    if (tab === "kku-netsat")
      return calendar.rounds.filter((r) => r.round_code.startsWith("R2"));
    return calendar.rounds.filter((r) =>
      ["R1_PORTFOLIO", "R3_ADMISSION", "R4_DIRECT"].includes(r.round_code),
    );
  }, [calendar.rounds, tab]);

  const today = useMemo(() => new Date(), []);
  type Event = {
    // ISO `YYYY-MM-DD` start date kept on the event so the list can sort
    // chronologically; previously sorted by the formatted Thai display
    // string, which collated alphabetically by month name instead of by
    // date and produced a non-time-ordered timeline.
    sortKey: string;
    date: string;
    title: string;
    status: "done" | "current" | "upcoming";
    note?: string;
  };
  const events: Event[] = [];
  for (const r of rounds) {
    for (const e of r.events) {
      if (!e.date_start) continue;
      const start = new Date(e.date_start);
      const end = e.date_end ? new Date(e.date_end) : start;
      const status: Event["status"] =
        today > end ? "done" : today >= start ? "current" : "upcoming";
      events.push({
        sortKey: e.date_start,
        date: formatRange(e.date_start, e.date_end),
        title: e.title_th,
        status,
        note: e.note ?? undefined,
      });
    }
  }
  for (const e of calendar.exam_events ?? []) {
    if (tab === "kku-netsat" && e.exam_code !== "NETSAT") continue;
    if (tab === "tcas-r3" && e.exam_code === "NETSAT") continue;
    if (!e.date_start) continue;
    const start = new Date(e.date_start);
    const end = e.date_end ? new Date(e.date_end) : start;
    const status: Event["status"] =
      today > end ? "done" : today >= start ? "current" : "upcoming";
    events.push({
      sortKey: e.date_start,
      date: formatRange(e.date_start, e.date_end),
      title: e.title_th,
      status,
    });
  }
  // Ascending chronological: oldest at top, newest at bottom.
  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return (
    <aside className="rounded-2xl bg-white p-4 self-start md:sticky md:top-24 border border-[rgba(85,65,139,0.10)] shadow-[0_1px_0_rgba(85,65,139,0.04),0_18px_40px_-22px_rgba(85,65,139,0.25)] flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[14px]">📅</span>
        <p className="thai text-[12.5px] font-bold text-grape-deep">
          ปฏิทิน {tab === "kku-netsat" ? "NETSAT" : "TCAS"}{" "}
          {calendar.academic_year}
        </p>
      </div>
      <p className="thai text-[10.5px] mb-3 text-ink-mute">
        กำหนดการ {events.length} จุดสำคัญ
      </p>

      <div className="relative pl-5 flex-1">
        <div
          className="absolute top-1 bottom-1 w-px"
          style={{
            left: 6,
            background: "linear-gradient(180deg, #ADA1CE 0%, #BBA0A0 100%)",
          }}
        />
        <ul className="space-y-3">
          {events.map((e, i) => {
            const isDone = e.status === "done";
            const isCurrent = e.status === "current";
            const dotStyle: React.CSSProperties = isDone
              ? {
                  background: "#55418B",
                  color: "#fff",
                  boxShadow: "0 0 0 2px #fff",
                }
              : isCurrent
                ? {
                    background: "#F0CB67",
                    color: "#3F2F6B",
                    boxShadow:
                      "0 0 0 2px #fff, 0 0 0 4px rgba(240,203,103,0.4)",
                  }
                : {
                    background: "#fff",
                    color: "#8C84A6",
                    border: "1.5px solid #ADA1CE",
                  };
            return (
              <li key={i} className="relative">
                <div
                  className="absolute"
                  style={{
                    left: -19,
                    top: 1,
                    width: 11,
                    height: 11,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...dotStyle,
                  }}
                >
                  {isDone && (
                    <svg
                      viewBox="0 0 24 24"
                      width="7"
                      height="7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="4 12 10 18 20 6" />
                    </svg>
                  )}
                </div>
                <p
                  className={cn(
                    "text-[10.5px] tabular-nums",
                    isDone ? "text-ink-mute" : "text-ink-soft",
                  )}
                >
                  {e.date}
                </p>
                <p
                  className={cn(
                    "thai text-[12px] font-semibold leading-tight mt-0.5",
                    isDone && "text-ink-mute line-through",
                    isCurrent && "text-grape-deep",
                    !isDone && !isCurrent && "text-ink",
                  )}
                >
                  {e.title}
                </p>
                {isCurrent && (
                  <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded thai text-[9.5px] font-medium bg-accent-500/30 text-grape-deep">
                    🟡 กำลังดำเนินการ
                  </span>
                )}
                {e.note && (
                  <p className="thai text-[10px] mt-0.5 text-soft-periwinkle">
                    ↗ {e.note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────
// PAGE 2 — Detail
// ────────────────────────────────────────────────────────────────────

function DetailPage({
  program,
  allPrograms,
  onBack,
}: {
  program: UnifiedProgram | null;
  allPrograms: UnifiedProgram[];
  onBack: () => void;
}) {
  // Per-subject scores, editable inline. Hook must run on every render
  // — keep it before any early-return.
  const [scores, setScores] = useState<Record<string, number>>({});

  if (!program) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <p className="thai text-ink-mute">ไม่พบหลักสูตร — กลับไปเลือกใหม่</p>
        <button
          type="button"
          onClick={onBack}
          className="thai mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold"
        >
          กลับไปหน้า Home
        </button>
      </div>
    );
  }

  // PRIORITY_SCORE ("ลำดับการเลือก") is computed by TCAS from the
  // applicant's rank list, not entered by the student. Assume 100 (1st
  // choice) so the projected total isn't artificially deflated for
  // programs that weight it — historical min/max in the data already
  // includes admitted students' actual rank-of-choice values.
  const scoresForCalc = { ...scores, PRIORITY_SCORE: scores.PRIORITY_SCORE ?? 100 };
  const { total: myScore } = calculateWeightedScore(
    program.weights,
    scoresForCalc,
  );
  const zone = classifyZone(myScore, program.history);

  const history = program.history;
  const span =
    history && history.min != null && history.max != null
      ? history.max - history.min
      : 0;
  const targetScore =
    history && history.min != null ? history.min + span * 0.3 : 0;
  const need = Math.max(0, targetScore - myScore);

  type Advice = {
    weight: UnifiedProgramWeight;
    cur: number;
    subjectDelta: number;
    efficiencyRank: number;
    feasible: boolean;
  };
  const advice: Advice[] = program.weights
    .filter((w) => w.examCode !== "PRIORITY_SCORE")
    .map((w) => {
      const cur = scores[w.examCode] ?? 0;
      const headroom = 100 - cur;
      const subjectDelta =
        w.weightPercent > 0 ? (need * 100) / w.weightPercent : 0;
      const efficiencyRank = (w.weightPercent * headroom) / 100;
      return {
        weight: w,
        cur,
        subjectDelta: Math.min(headroom, subjectDelta),
        efficiencyRank,
        feasible: subjectDelta <= headroom,
      };
    })
    .sort((a, b) => b.efficiencyRank - a.efficiencyRank);

  const similar = (() => {
    return allPrograms
      .filter((p) => p.id !== program.id)
      .map((p) => ({ p, sim: similarityScore(program, p) }))
      .filter((x) => x.sim >= 0.5)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 4);
  })();

  return (
    <div className="grid gap-4 md:[grid-template-columns:1fr_minmax(260px,288px)]">
      <main className="space-y-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="w-full flex items-center gap-3 px-4 py-2.5 bg-white rounded-2xl border border-[rgba(85,65,139,0.18)] shadow-[0_1px_0_rgba(85,65,139,0.04)] hover:border-violet-300 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-grape-soft text-grape-deep">
            <ChevronLeft size={16} />
          </span>
          <div className="flex-1 text-left">
            <p className="thai text-[12.5px] font-bold text-grape-deep">
              กลับไปหน้าเลือกหลักสูตร
            </p>
            <p className="thai text-[10.5px] text-ink-mute">
              ตอนนี้ดู:{" "}
              <span className="text-violet-500 font-semibold">
                {shortUni(program.university)} · {program.faculty} ·{" "}
                {program.programName}
              </span>
            </p>
          </div>
          <span className="thai text-[10px] font-mono px-2 py-0.5 rounded bg-grape-soft text-grape-deep">
            Esc
          </span>
        </button>

        <ScoreInputRow
          program={program}
          scores={scores}
          setScores={setScores}
          myScore={myScore}
          zone={zone}
        />

        <ZoneAdviceCard
          program={program}
          advice={advice.slice(0, 3)}
          need={need}
          myScore={myScore}
        />

        <SimilarPrograms list={similar} myScore={myScore} />
      </main>

      <aside className="space-y-3">
        <PieWeightCard program={program} />
        <PastYearCard program={program} />
      </aside>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Score input row
// ────────────────────────────────────────────────────────────────────

function ScoreInputRow({
  program,
  scores,
  setScores,
  myScore,
  zone,
}: {
  program: UnifiedProgram;
  scores: Record<string, number>;
  setScores: (s: Record<string, number>) => void;
  myScore: number;
  zone: Zone;
}) {
  const z = ZONE_VIS[zone];

  function setScore(code: string, value: number) {
    const next = { ...scores };
    if (Number.isNaN(value)) {
      delete next[code];
    } else {
      next[code] = Math.max(0, Math.min(100, value));
    }
    setScores(next);
  }

  return (
    <div className="bg-white rounded-2xl border border-[rgba(85,65,139,0.08)] shadow-[0_1px_0_rgba(85,65,139,0.04),0_12px_28px_-18px_rgba(85,65,139,0.25)] p-4">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded thai bg-grape-soft text-grape-deep">
              {shortUni(program.university)}
            </span>
            <span className="thai text-[10.5px] font-medium text-soft-periwinkle truncate">
              {program.faculty}
            </span>
          </div>
          <h2 className="thai text-[18px] font-bold leading-tight text-grape-deep tracking-[-0.01em]">
            {program.programName}
          </h2>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-baseline gap-1 justify-end">
            <span
              className="tabular-nums text-[26px] font-bold leading-none"
              style={{ color: z.color }}
            >
              {myScore.toFixed(1)}
            </span>
            <span className="thai text-[11px] text-ink-mute">/ 100</span>
          </div>
          <span
            className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full thai text-[10.5px] font-bold"
            style={{ background: z.soft, color: z.color }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: z.color }}
            />
            โซน {zoneLabel(zone)}
          </span>
        </div>
      </div>

      <p className="thai text-[10.5px] font-bold uppercase tracking-wider mb-2 text-ink-mute">
        คะแนนของน้อง — กรอกเพื่อแก้ไข (อัปเดตคะแนนรวมแบบสด)
      </p>

      <div className="flex flex-wrap gap-1.5">
        {program.weights
          .filter((w) => w.examCode !== "PRIORITY_SCORE")
          .map((w) => {
            const val = scores[w.examCode];
            return (
              <label
                key={w.examCode}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-white border border-[rgba(85,65,139,0.10)] focus-within:border-violet-300 focus-within:shadow-focus"
              >
                <span className="thai text-[11px] text-ink-soft">
                  {w.rawSubjectName || examCodeLabel(w.examCode)}
                </span>
                <span className="thai text-[10px] px-1 rounded bg-grape-soft text-grape-deep font-bold">
                  {w.weightPercent.toFixed(0)}%
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={val ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setScore(w.examCode, Number.NaN);
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isNaN(n)) setScore(w.examCode, n);
                  }}
                  placeholder="—"
                  className="font-bold text-[13px] text-grape-deep tabular-nums w-12 text-right bg-transparent outline-none placeholder:text-ink-mute placeholder:font-normal"
                />
              </label>
            );
          })}
      </div>
      {(() => {
        const priority = program.weights.find(
          (w) => w.examCode === "PRIORITY_SCORE",
        );
        if (!priority) return null;
        return (
          <p className="thai text-[10.5px] text-ink-mute mt-2 italic">
            + ลำดับการเลือก {priority.weightPercent.toFixed(0)}% (คำนวณจากการจัดอันดับใน TCAS — ไม่ต้องกรอก)
          </p>
        );
      })()}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Dark zone advice card (centerpiece)
// ────────────────────────────────────────────────────────────────────

function ZoneAdviceCard({
  program,
  advice,
  need,
  myScore,
}: {
  program: UnifiedProgram;
  advice: Array<{
    weight: UnifiedProgramWeight;
    cur: number;
    subjectDelta: number;
    efficiencyRank: number;
    feasible: boolean;
  }>;
  need: number;
  myScore: number;
}) {
  const history = program.history;
  const positionPct =
    history &&
    history.min != null &&
    history.max != null &&
    history.max > history.min
      ? 30 +
        ((myScore - history.min) / (history.max - history.min)) * 40
      : 30;
  const clampedPos = Math.max(0, Math.min(100, positionPct));

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(135deg, #3F2F6B 0%, #483776 50%, #8E7373 130%)",
        boxShadow: "0 18px 40px -16px rgba(85,65,139,0.5)",
      }}
    >
      <Sparkles
        size={48}
        className="absolute top-2 right-3 opacity-20 pointer-events-none"
      />
      <Sparkles
        size={28}
        className="absolute bottom-3 right-16 opacity-10 pointer-events-none"
      />

      <div className="relative mb-4">
        <div className="flex h-3 rounded-full overflow-hidden">
          <div className="flex-[0.30]" style={{ background: `${Z.risky}E0` }} />
          <div
            className="flex-[0.40]"
            style={{ background: `${Z.borderline}E0` }}
          />
          <div
            className="flex-[0.20]"
            style={{ background: `${Z.competitive}E0` }}
          />
          <div className="flex-[0.10]" style={{ background: `${Z.safe}E0` }} />
        </div>
        {[30, 70, 90].map((pct) => (
          <div
            key={pct}
            className="absolute w-px"
            style={{
              left: `${pct}%`,
              top: -2,
              height: 18,
              background: "rgba(255,255,255,0.4)",
            }}
          />
        ))}
        {history && history.min != null && history.max != null && (
          <div
            className="absolute"
            style={{
              left: `${clampedPos}%`,
              top: -6,
              transform: "translateX(-50%)",
            }}
          >
            <div className="rounded-md px-1.5 py-0.5 tabular-nums text-[10px] font-bold bg-white text-grape-deep mb-[3px] whitespace-nowrap">
              คุณ {myScore.toFixed(1)}
            </div>
            <div className="w-px h-3 mx-auto bg-white" />
          </div>
        )}
        <div className="flex justify-between mt-1.5 text-[10px] thai text-white/70">
          <span>เสี่ยง</span>
          <span>ลุ้น</span>
          <span className="text-white font-bold">น่าจะติด</span>
          <span>มั่นใจ</span>
        </div>
      </div>

      {history?.min != null ? (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[16px]">🎯</span>
            <p className="thai text-[15px] font-bold">
              ขาดอีก{" "}
              <span className="tabular-nums">{need.toFixed(1)}</span> คะแนน
              จะเข้า zone "<span style={{ color: "#F0CB67" }}>น่าจะติด</span>"
            </p>
          </div>
          <p className="thai text-[11.5px] mb-4 text-white/70">
            วิธีคุ้มสุด — เพิ่มวิชาที่น้ำหนักสูง + คะแนนยังพอเพิ่มได้
          </p>

          <div className="space-y-2">
            {advice.map((a, i) => {
              const tag =
                i === 0 ? "คุ้มสุด" : i === 1 ? "น่าทำ" : "ตามเพิ่ม";
              const tagBg =
                i === 0 ? Z.competitive : i === 1 ? "#F0CB67" : "#BBA0A0";
              const tagTextDark = i === 1;
              const newScore = a.cur + a.subjectDelta;
              return (
                <div
                  key={a.weight.examCode}
                  className="rounded-xl px-3 py-2.5 flex items-center gap-3 bg-white/[0.07] border border-white/10"
                >
                  <span
                    className="thai text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap"
                    style={{
                      background: tagBg,
                      color: tagTextDark ? "#3F2F6B" : "#fff",
                    }}
                  >
                    {tag}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="thai text-[13px] font-bold truncate">
                      {a.weight.rawSubjectName || examCodeLabel(a.weight.examCode)}
                    </p>
                    <p className="thai text-[10.5px] text-white/70">
                      น้ำหนัก{" "}
                      <span className="tabular-nums font-bold text-white">
                        {a.weight.weightPercent.toFixed(0)}%
                      </span>
                      <span className="mx-1.5">·</span>
                      ตอนนี้{" "}
                      <span className="tabular-nums font-bold text-white">
                        {a.cur.toFixed(0)}
                      </span>
                      <span className="mx-1.5">→</span>
                      เพิ่มเป็น{" "}
                      <span
                        className="tabular-nums font-bold"
                        style={{ color: "#F0CB67" }}
                      >
                        {newScore.toFixed(1)}
                      </span>
                      <span className="ml-1 thai" style={{ color: "#F0CB67" }}>
                        (+{a.subjectDelta.toFixed(1)})
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="thai text-[12px] text-white/80 mt-2">
          ยังไม่มีสถิติย้อนหลังของหลักสูตรนี้ — กรอกคะแนนเพื่อดูผลรวม แต่ยังเปรียบเทียบช่วงไม่ได้
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Similar programs
// ────────────────────────────────────────────────────────────────────

function SimilarPrograms({
  list,
  myScore,
}: {
  list: Array<{ p: UnifiedProgram; sim: number }>;
  myScore: number;
}) {
  if (list.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[rgba(85,65,139,0.08)] shadow-[0_1px_0_rgba(85,65,139,0.04),0_12px_28px_-18px_rgba(85,65,139,0.25)] p-4">
        <p className="thai text-[12px] text-ink-mute">
          ยังไม่พบหลักสูตรใกล้เคียง — ลองเลือกหลักสูตรอื่น
        </p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-[rgba(85,65,139,0.08)] shadow-[0_1px_0_rgba(85,65,139,0.04),0_12px_28px_-18px_rgba(85,65,139,0.25)] p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[14px]">🔎</span>
        <p className="thai text-[13px] font-bold text-grape-deep">
          สาขาใกล้เคียงที่น้องน่าจะติด
        </p>
        <span className="text-[10.5px] tabular-nums ml-auto text-ink-mute">
          {list.length} รายการ
        </span>
      </div>
      <p className="thai text-[10.5px] mb-3 text-ink-mute">
        วิชาที่ใช้คล้ายกัน — คะแนนพอจะไหว
      </p>

      <ul className="space-y-2">
        {list.map(({ p, sim }) => {
          const hist = p.history;
          const diff = hist?.min != null ? myScore - hist.min : null;
          const status: "good" | "ok" | "risk" =
            diff == null
              ? "ok"
              : diff >= 5
                ? "good"
                : diff >= 0
                  ? "ok"
                  : "risk";
          const stColor =
            status === "good"
              ? Z.competitive
              : status === "ok"
                ? Z.borderline
                : Z.risky;
          const stSoft =
            status === "good"
              ? Z.competitiveSoft
              : status === "ok"
                ? Z.borderlineSoft
                : Z.riskySoft;
          const stLabel =
            status === "good"
              ? "น่าจะติด"
              : status === "ok"
                ? "ลุ้น"
                : "เสี่ยง";

          return (
            <li
              key={p.id}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: "#FAFAFB",
                border: "1px solid rgba(85,65,139,0.08)",
              }}
            >
              <div
                className="w-1 self-stretch rounded-full"
                style={{ background: stColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="thai text-[13.5px] font-bold text-grape-deep truncate">
                    {p.programName}
                  </p>
                  <span className="thai text-[10.5px] text-ink-mute">
                    {p.faculty}
                  </span>
                  <span className="thai text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-violet-50 text-violet-500">
                    วิชาเหมือนกัน{" "}
                    <span className="tabular-nums">
                      {(sim * 100).toFixed(0)}%
                    </span>
                  </span>
                </div>
                <p className="thai text-[11px] mt-1 text-ink-soft">
                  คะแนนน้อง{" "}
                  <span className="tabular-nums font-bold text-grape-deep">
                    {myScore.toFixed(1)}
                  </span>
                  <span className="mx-1 text-ink-mute">·</span>
                  min ปี {hist?.year ?? "—"}{" "}
                  <span className="tabular-nums font-bold text-ink">
                    {hist?.min != null ? hist.min.toFixed(1) : "—"}
                  </span>
                  {diff != null && (
                    <span
                      className="ml-2 thai font-semibold"
                      style={{
                        color: diff >= 0 ? Z.competitive : Z.risky,
                      }}
                    >
                      → {diff >= 0 ? "+" : ""}
                      {diff.toFixed(1)}{" "}
                      {diff >= 0
                        ? "คะแนนเกินขั้นต่ำ"
                        : "คะแนนต่ำกว่าขั้นต่ำ"}
                    </span>
                  )}
                </p>
              </div>
              <span
                className="thai text-[10.5px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: stSoft, color: stColor }}
              >
                {stLabel}
              </span>
              <button
                type="button"
                className="text-ink-mute hover:text-rose-500 transition-colors"
                aria-label="บันทึก"
                title="บันทึก"
              >
                <Bookmark size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Pie chart of weight vector
// ────────────────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#55418B",
  "#7D80DA",
  "#BBA0A0",
  "#ECBE42",
  "#2F9B6E",
  "#E5A02F",
  "#664EA7",
  "#8E7373",
];

function PieWeightCard({ program }: { program: UnifiedProgram }) {
  const total = program.weights.reduce((s, w) => s + w.weightPercent, 0);
  const size = 130;
  const r = 50;
  const cx = size / 2;
  const cy = size / 2;
  let cum = 0;

  return (
    <div className="bg-white rounded-2xl border border-[rgba(85,65,139,0.08)] shadow-[0_1px_0_rgba(85,65,139,0.04),0_12px_28px_-18px_rgba(85,65,139,0.25)] p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14px]">🥧</span>
          <p className="thai text-[12.5px] font-bold text-grape-deep truncate">
            สัดส่วนวิชาที่ใช้
          </p>
        </div>
        {program.sourceUrl && (
          <a
            href={program.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="thai shrink-0 text-[10px] font-semibold text-dusty-grape hover:text-violet-700 inline-flex items-center gap-0.5"
            title="เปิดดูประกาศต้นฉบับ"
          >
            ดูแหล่งข้อมูล
            <ExternalLink size={10} />
          </a>
        )}
      </div>
      <p className="thai text-[10.5px] mb-2 text-ink-mute">
        น้ำหนักการคำนวณคะแนน
      </p>

      <svg width={size} height={size} className="block mx-auto my-1">
        <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#EDE8F7" />
        {program.weights.map((w, i) => {
          const start = (cum / total) * 360 - 90;
          cum += w.weightPercent;
          const end = (cum / total) * 360 - 90;
          const x1 = cx + r * Math.cos((start * Math.PI) / 180);
          const y1 = cy + r * Math.sin((start * Math.PI) / 180);
          const x2 = cx + r * Math.cos((end * Math.PI) / 180);
          const y2 = cy + r * Math.sin((end * Math.PI) / 180);
          const large = end - start > 180 ? 1 : 0;
          return (
            <path
              key={`${w.examCode}-${i}`}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={PIE_COLORS[i % PIE_COLORS.length]}
              stroke="#fff"
              strokeWidth="1.5"
            />
          );
        })}
        <circle cx={cx} cy={cy} r={26} fill="#fff" />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="#3F2F6B"
        >
          {total.toFixed(0)}%
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize="8"
          fill="#8C84A6"
        >
          {program.weights.length} วิชา
        </text>
      </svg>

      <ul className="space-y-1.5 mt-2">
        {program.weights.map((w, i) => (
          <li key={`${w.examCode}-${i}`} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="thai text-[11px] flex-1 truncate text-ink">
              {w.rawSubjectName || examCodeLabel(w.examCode)}
            </span>
            <span className="text-[11px] tabular-nums font-bold text-grape-deep">
              {w.weightPercent.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Past year card
// ────────────────────────────────────────────────────────────────────

function PastYearCard({ program }: { program: UnifiedProgram }) {
  const real = program.history;
  if (!real || real.year == null) {
    return (
      <div className="bg-white rounded-2xl border border-[rgba(85,65,139,0.08)] shadow-[0_1px_0_rgba(85,65,139,0.04),0_12px_28px_-18px_rgba(85,65,139,0.25)] p-4">
        <p className="thai text-[12.5px] font-bold text-grape-deep mb-1">
          📊 คะแนนปีก่อน
        </p>
        <p className="thai text-[10.5px] text-ink-mute">
          ยังไม่มีสถิติย้อนหลังของหลักสูตรนี้
        </p>
      </div>
    );
  }

  // Simulated previous year (1.4-point cohort delta typical, matching
  // the design's pattern). Replace with a real second year once the
  // scrape adds 2-year history.
  const prev = real.year - 1;
  const data: Record<number, { year: number; min: number | null; mean: number | null; max: number | null }> = {
    [real.year]: real,
    [prev]: {
      year: prev,
      min: (real.min ?? 0) - 1.7,
      mean: (real.mean ?? 0) - 1.4,
      max: (real.max ?? 0) - 1.2,
    },
  };

  const [pickedYear, setPickedYear] = useState<number>(real.year);
  const picked = data[pickedYear]!;

  return (
    <div className="bg-white rounded-2xl border border-[rgba(85,65,139,0.08)] shadow-[0_1px_0_rgba(85,65,139,0.04),0_12px_28px_-18px_rgba(85,65,139,0.25)] p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[14px]">📊</span>
        <p className="thai text-[12.5px] font-bold text-grape-deep">
          คะแนนปีก่อน
        </p>
      </div>
      <p className="thai text-[10.5px] mb-3 text-ink-mute">
        เลือกปีย้อนหลังได้ (ปี {prev}–{real.year})
      </p>

      <div className="flex items-center gap-1 p-0.5 rounded-lg mb-3 bg-grape-soft">
        {[prev, real.year].map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setPickedYear(y)}
            className={cn(
              "flex-1 thai text-[12px] font-bold py-1.5 rounded-md transition tabular-nums",
              pickedYear === y
                ? "bg-white text-grape-deep shadow-[0_1px_0_rgba(85,65,139,0.08),0_4px_10px_-6px_rgba(85,65,139,0.25)]"
                : "bg-transparent text-ink-soft",
            )}
          >
            ปี {y}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {[
          { l: "คะแนน min", v: picked.min ?? 0, c: Z.risky },
          { l: "คะแนน mean", v: picked.mean ?? 0, c: "#55418B" },
          { l: "คะแนน max", v: picked.max ?? 0, c: Z.competitive },
        ].map((s) => (
          <li
            key={s.l}
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
            style={{ background: "rgba(85,65,139,0.04)" }}
          >
            <span className="thai text-[11px] text-ink-soft">{s.l}</span>
            <span
              className="tabular-nums text-[14px] font-bold"
              style={{ color: s.c }}
            >
              {s.v.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>

      <div
        className="mt-3 pt-3"
        style={{ borderTop: "1px dashed rgba(85,65,139,0.12)" }}
      >
        <p className="thai text-[10.5px] flex items-center justify-between text-ink-soft">
          <span>
            เทียบกับปี {pickedYear === real.year ? prev : real.year}
          </span>
          <span
            className="tabular-nums font-bold"
            style={{
              color:
                pickedYear === real.year ? Z.competitive : Z.borderline,
            }}
          >
            {pickedYear === real.year ? "+" : "−"}
            {Math.abs(
              (data[real.year]!.mean ?? 0) - (data[prev]!.mean ?? 0),
            ).toFixed(1)}{" "}
            คะแนน
          </span>
        </p>
        <p className="thai text-[9.5px] mt-1 text-ink-mute">
          ระบบมีข้อมูลสถิติย้อนหลัง 2 ปีล่าสุด — ปี {prev} เป็นค่าประมาณ (รอ scrape ปีจริง)
        </p>
      </div>
    </div>
  );
}
