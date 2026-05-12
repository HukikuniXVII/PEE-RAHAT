"use client";

import type { Page, TutorReview } from "@peerahat/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  tutorId: string;
  initialPage: Page<TutorReview>;
  rating: number;
  reviewCount: number;
}

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReviewsSection({ tutorId, initialPage, rating, reviewCount }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["tutors", tutorId, "reviews"],
      queryFn: ({ pageParam = 1 }) =>
        createApiClient().tutors.reviews(tutorId, {
          page: pageParam,
          pageSize: PAGE_SIZE,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const seen = lastPage.page * lastPage.pageSize;
        return seen < lastPage.total ? lastPage.page + 1 : undefined;
      },
      initialData: { pages: [initialPage], pageParams: [1] },
    });

  const reviews = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? initialPage.total;

  return (
    <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          รีวิวจากนักเรียน ({total})
        </h2>
        <div className="flex items-center gap-3 bg-amber-50 rounded-2xl border border-amber-100 px-4 py-2.5">
          <div className="flex items-center gap-0.5 text-amber-500">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={16}
                fill={n <= Math.round(rating) ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            ))}
          </div>
          <span className="text-sm font-black text-amber-700">
            {rating.toFixed(1)}
          </span>
          <span className="text-xs font-bold text-amber-600/70">
            ({reviewCount})
          </span>
        </div>
      </header>

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8 font-medium">
          ยังไม่มีรีวิว
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800 truncate pr-2">
                  {review.studentDisplayName}
                </p>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600 shrink-0">
                  <Star size={12} fill="currentColor" />
                  {review.rating}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                {review.text}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {formatDate(review.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {hasNextPage && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {isFetchingNextPage && (
              <Loader2 size={14} className="animate-spin" />
            )}
            ดูรีวิวเพิ่มเติม
          </button>
        </div>
      )}
    </section>
  );
}
