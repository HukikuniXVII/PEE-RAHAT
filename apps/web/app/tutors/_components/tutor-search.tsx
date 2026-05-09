"use client";

import {
  type Subject,
  type TutorSearchResult,
  type TutorSort,
  tutorSortSchema,
} from "@peerahat/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { TutorCard } from "./tutor-card";

interface Props {
  initialQuery: string;
  initialSubject: Subject | "All";
  initialResult: TutorSearchResult;
}

const PAGE_SIZE = 20;
const DEFAULT_SORT: TutorSort = "rating";

export function TutorSearch({
  initialQuery,
  initialSubject,
  initialResult,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [sort, setSort] = useState<TutorSort>(DEFAULT_SORT);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  // The SSR fetch from page.tsx ran with debouncedQuery=initialQuery,
  // subject=initialSubject, sort=DEFAULT_SORT. Only seed the cache when
  // the live filters still match — otherwise the user has already
  // changed something and we want a fresh fetch.
  const isInitialFilters =
    debouncedQuery === initialQuery && sort === DEFAULT_SORT;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: [
        "tutors",
        "search",
        { q: debouncedQuery, subject: initialSubject, sort },
      ],
      queryFn: ({ pageParam = 1 }) =>
        createApiClient().tutors.search({
          q: debouncedQuery || undefined,
          subject: initialSubject === "All" ? undefined : initialSubject,
          sort,
          page: pageParam,
          pageSize: PAGE_SIZE,
        }),
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name, university, or bio..."
            className="w-full pl-12 pr-4 py-3 bg-transparent text-sm focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
            Sort by:
          </span>
          <select
            value={sort}
            onChange={(e) => {
              const parsed = tutorSortSchema.safeParse(e.target.value);
              if (parsed.success) setSort(parsed.data);
            }}
            className="text-sm font-bold text-slate-800 bg-slate-50 px-4 py-2 rounded-xl border-none focus:ring-0"
          >
            <option value="rating">Highest Rating</option>
            <option value="priceAsc">Lowest Price</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {isFetching && !isFetchingNextPage && (
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
          Loading...
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {tutors.map((tutor) => (
            <TutorCard key={tutor.id} tutor={tutor} />
          ))}
        </AnimatePresence>
      </div>

      {tutors.length === 0 && !isFetching && (
        <p className="text-center text-slate-400 py-12 font-medium">
          ไม่พบติวเตอร์ที่ตรงเงื่อนไข ลองปรับการค้นหาดู
        </p>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {isFetchingNextPage && (
              <Loader2 size={14} className="animate-spin" />
            )}
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
