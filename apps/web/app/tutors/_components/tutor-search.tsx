"use client";

import {
  type Subject,
  type TutorSearchResult,
  type TutorSort,
  tutorSortSchema,
} from "@peerahat/types";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { TutorCard } from "./tutor-card";

interface Props {
  initialQuery: string;
  initialSubject: Subject | "All";
  initialResult: TutorSearchResult;
}

export function TutorSearch({
  initialQuery,
  initialSubject,
  initialResult,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [sort, setSort] = useState<TutorSort>("rating");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: [
      "tutors",
      "search",
      { q: debouncedQuery, subject: initialSubject, sort },
    ],
    queryFn: () =>
      createApiClient().tutors.search({
        q: debouncedQuery || undefined,
        subject: initialSubject === "All" ? undefined : initialSubject,
        sort,
        page: 1,
        pageSize: 20,
      }),
    initialData: initialResult,
    placeholderData: (prev) => prev,
  });

  const result = data ?? initialResult;

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

      {isFetching && (
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
          Loading...
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {result.items.map((tutor) => (
            <TutorCard key={tutor.id} tutor={tutor} />
          ))}
        </AnimatePresence>
      </div>

      {result.items.length === 0 && !isFetching && (
        <p className="text-center text-slate-400 py-12 font-medium">
          ไม่พบติวเตอร์ที่ตรงเงื่อนไข ลองปรับการค้นหาดู
        </p>
      )}
    </div>
  );
}
