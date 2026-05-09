"use client";

import type { CommunityPost, Page } from "@peerahat/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { createApiClient } from "@/lib/api-client";

import { PostCard } from "./post-card";
import { PostComposer } from "./post-composer";

interface Props {
  initialPage: Page<CommunityPost>;
}

export function CommunityFeed({ initialPage }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["community", "posts"],
      queryFn: ({ pageParam = 1 }) =>
        createApiClient().community.list(pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page * lastPage.pageSize < lastPage.total
          ? lastPage.page + 1
          : undefined,
      initialData: { pages: [initialPage], pageParams: [1] },
    });

  const posts = data?.pages.flatMap((p) => p.items) ?? initialPage.items;

  return (
    <div className="space-y-8">
      <PostComposer />
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
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
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
