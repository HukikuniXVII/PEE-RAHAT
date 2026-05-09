"use client";

import type { Page, TutorReview } from "@peerahat/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  tutorId: string;
  initialPage: Page<TutorReview>;
}

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReviewsSection({ tutorId, initialPage }: Props) {
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
    <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Reviews ({total})
        </h2>
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8 font-medium">
          ยังไม่มีรีวิว
        </p>
      ) : (
        <ul className="space-y-6">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="border-b border-slate-100 pb-6 last:border-0 last:pb-0 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">
                  {review.studentDisplayName}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                  <Star size={12} fill="currentColor" />
                  {review.rating}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
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
            Show more
          </button>
        </div>
      )}
    </section>
  );
}
