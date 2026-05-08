"use client";

import type { Subject, TutorSearchResult } from "@peerahat/types";
import { AnimatePresence } from "motion/react";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { TutorCard } from "@/components/tutor-card";
import { createApiClient } from "@/lib/api-client";

interface Props {
  initialQuery: string;
  initialSubject: string;
  initialResult: TutorSearchResult;
}

export function TutorSearch({
  initialQuery,
  initialSubject,
  initialResult,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState(initialResult);
  const [sort, setSort] =
    useState<"rating" | "priceAsc" | "newest">("rating");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const api = createApiClient();
        const next = await api.tutors.search({
          q: query || undefined,
          subject:
            initialSubject === "All"
              ? undefined
              : (initialSubject as Subject),
          sort,
          page: 1,
          pageSize: 20,
        });
        setResult(next);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, sort, initialSubject]);

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
            onChange={(e) =>
              setSort(e.target.value as "rating" | "priceAsc" | "newest")
            }
            className="text-sm font-bold text-slate-800 bg-slate-50 px-4 py-2 rounded-xl border-none focus:ring-0"
          >
            <option value="rating">Highest Rating</option>
            <option value="priceAsc">Lowest Price</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {loading && (
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

      {result.items.length === 0 && !loading && (
        <p className="text-center text-slate-400 py-12 font-medium">
          ไม่พบติวเตอร์ที่ตรงเงื่อนไข ลองปรับการค้นหาดู
        </p>
      )}
    </div>
  );
}
