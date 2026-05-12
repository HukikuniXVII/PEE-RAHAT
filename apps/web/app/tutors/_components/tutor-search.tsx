"use client";

import type {
  Subject,
  TutorSearchQuery,
  TutorSearchResult,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { type FilterState, FilterSidebar } from "./filter-sidebar";
import { TutorCard } from "./tutor-card";

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
  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      {/* Sticky search bar */}
      <div
        className={cn(
          "sticky top-0 z-20 -mx-4 px-4 sm:-mx-0 sm:px-0 py-3 transition-all",
          scrolled && "bg-white/85 backdrop-blur-md border-b border-slate-200",
        )}
      >
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-2">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาวิชา, มหาวิทยาลัย, หรือชื่อพี่ติว..."
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
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            <SlidersHorizontal size={14} />
            ตัวกรอง
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-20 bg-white rounded-[28px] border border-slate-200 shadow-sm p-6">
            <FilterSidebar value={filters} onChange={setFilters} />
          </div>
        </aside>

        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>
              พบ {total.toLocaleString()} พี่ติว
              {isFetching && (
                <Loader2
                  size={12}
                  className="inline ml-2 animate-spin text-slate-400"
                />
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {tutors.map((tutor) => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
            </AnimatePresence>
          </div>

          {tutors.length === 0 && !isFetching && (
            <p className="text-center text-slate-400 py-12 font-medium">
              ไม่พบพี่ติวที่ตรงเงื่อนไข ลองปรับตัวกรองอีกครั้ง
            </p>
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
                ดูพี่ติวเพิ่มเติม
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
              className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-white rounded-t-[32px] shadow-2xl max-h-[85vh] overflow-y-auto"
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
