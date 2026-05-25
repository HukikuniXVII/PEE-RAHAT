"use client";

import {
  type Subject,
  type TutorSearchQuery,
  type TutorSearchResult,
  tutorSortSchema,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { type FilterState, FilterSidebar, SORT_OPTIONS } from "./filter-sidebar";
import { TutorCard } from "./tutor-card";

// Quick-select chips rendered beneath the search bar. Clicking sets the
// university filter; clicking the same chip again clears it. Kept short
// so the row fits on one line on most mobile widths.
const POPULAR_UNIVERSITIES: { label: string; value: string }[] = [
  { label: "จุฬาฯ", value: "จุฬา" },
  { label: "ธรรมศาสตร์", value: "ธรรมศาสตร์" },
  { label: "มหิดล", value: "มหิดล" },
  { label: "เกษตรฯ", value: "เกษตร" },
  { label: "ขอนแก่น", value: "ขอนแก่น" },
  { label: "เชียงใหม่", value: "เชียงใหม่" },
];

interface Props {
  initialQuery: string;
  initialSubject: Subject | "All";
  initialResult: TutorSearchResult;
}

const PAGE_SIZE = 20;

function buildSearchInput(
  q: string,
  filters: FilterState,
): TutorSearchQuery {
  return {
    q: q || undefined,
    subject: filters.subject === "All" ? undefined : filters.subject,
    university: filters.university.trim() || undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating > 0 ? filters.minRating : undefined,
    sort: filters.sort,
    pageSize: PAGE_SIZE,
  };
}

export function TutorSearch({
  initialQuery,
  initialSubject,
  initialResult,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<FilterState>({
    subject: initialSubject,
    university: "",
    minPrice: undefined,
    maxPrice: undefined,
    minRating: 0,
    sort: "rating",
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  // SSR pre-fetched the initial subject + query under the default sort and
  // no other filters. Reuse that as the cache seed only while filters still
  // match it.
  const isInitialFilters = useMemo(
    () =>
      debouncedQuery === initialQuery &&
      filters.subject === initialSubject &&
      !filters.university &&
      filters.minPrice === undefined &&
      filters.maxPrice === undefined &&
      filters.minRating === 0 &&
      filters.sort === "rating",
    [debouncedQuery, initialQuery, initialSubject, filters],
  );

  const queryInput = buildSearchInput(debouncedQuery, filters);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: ["tutors", "search", queryInput],
      queryFn: ({ pageParam = 1 }) =>
        createApiClient().tutors.search({ ...queryInput, page: pageParam }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page * lastPage.pageSize < lastPage.total
          ? lastPage.page + 1
          : undefined,
      initialData: isInitialFilters
        ? { pages: [initialResult], pageParams: [1] }
        : undefined,
      placeholderData: (prev) => prev,
    });

  const tutors = data?.pages.flatMap((p) => p.items) ?? initialResult.items;
  const total = data?.pages[0]?.total ?? initialResult.total;

  return (
    <div className="space-y-6">
      {/* Search bar — non-sticky. Scrolls away with the rest of the
          page content. */}
      <div className="py-3">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-2">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาวิชา, มหาวิทยาลัย, หรือชื่อพี่รหัส..."
            className="flex-1 bg-transparent px-1 py-2 text-sm font-medium focus:outline-none min-w-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-slate-400 hover:text-slate-700 p-1"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500 text-white text-xs font-bold"
          >
            <SlidersHorizontal size={14} />
            ตัวกรอง
          </button>
        </div>

        {/* Popular-university quick-select */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 px-1">
          <span className="text-[11px] font-bold text-ink-mute uppercase tracking-widest mr-1">
            ยอดนิยม
          </span>
          {POPULAR_UNIVERSITIES.map((u) => {
            const active = filters.university === u.value;
            return (
              <button
                key={u.value}
                type="button"
                onClick={() =>
                  setFilters({
                    ...filters,
                    university: active ? "" : u.value,
                  })
                }
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-bold border transition-all",
                  active
                    ? "bg-violet-500 text-white border-violet-500 shadow-[0_6px_14px_-6px_rgba(85,65,139,0.5)]"
                    : "bg-white text-ink-soft border-neutral-200 hover:border-violet-300 hover:text-violet-700",
                )}
              >
                {u.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <aside className="hidden md:block">
          {/* Constant-height sticky shell so the sidebar keeps a visual
              presence even when every accordion is collapsed (~120px
              would otherwise leave a tall empty column). `min-h` floors
              the height; `max-h` + `overflow-y-auto` cap it to viewport
              when many groups are expanded. */}
          <div className="md:sticky md:top-24 bg-white rounded-[28px] border border-violet-100 shadow-[0_8px_24px_-16px_rgba(85,65,139,0.25)] p-5 min-h-[520px] max-h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar">
            <FilterSidebar value={filters} onChange={setFilters} />
          </div>
        </aside>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-ink-soft">
              พบ {total.toLocaleString()} พี่รหัส
              {isFetching && (
                <Loader2
                  size={12}
                  className="inline ml-2 animate-spin text-ink-mute"
                />
              )}
            </span>

            {/* Sort — top-right of results, separated from the filter sidebar */}
            <label className="inline-flex items-center gap-2 text-[11px] font-bold text-ink-mute uppercase tracking-widest">
              เรียงตาม
              <select
                value={filters.sort}
                onChange={(e) => {
                  const parsed = tutorSortSchema.safeParse(e.target.value);
                  if (parsed.success)
                    setFilters({ ...filters, sort: parsed.data });
                }}
                className="bg-white border border-violet-200 rounded-xl px-3 py-1.5 text-xs font-bold text-grape-deep normal-case tracking-normal focus:outline-none focus:border-violet-500 focus:shadow-focus"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {tutors.map((tutor) => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
            </AnimatePresence>
          </div>

          {tutors.length === 0 && !isFetching && (
            <div className="flex flex-col items-center text-center py-10 gap-4">
              <Image
                src="/mascot-confuse.png"
                alt=""
                width={220}
                height={220}
                className="w-40 h-40 sm:w-52 sm:h-52 object-contain"
                priority={false}
              />
              <p className="thai text-sm font-semibold text-ink-soft max-w-xs">
                ไม่พบพี่รหัสที่ตรงเงื่อนไข ลองปรับตัวกรองอีกครั้ง
              </p>
            </div>
          )}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {isFetchingNextPage && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                ดูพี่รหัสเพิ่มเติม
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter bottom-sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/60 md:hidden"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white rounded-t-[32px] shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">
                  ตัวกรอง
                </h3>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                  aria-label="Close filters"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 pb-8">
                <FilterSidebar value={filters} onChange={setFilters} />
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="mt-8 w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700"
                >
                  ดูผลลัพธ์ ({total.toLocaleString()})
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
