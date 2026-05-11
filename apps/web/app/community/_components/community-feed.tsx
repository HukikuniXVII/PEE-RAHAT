"use client";

import type { CommunityPost, Page } from "@peerahat/types";
import { Button } from "@peerahat/ui";
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
          <Button
            variant="muted"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && (
              <Loader2 size={14} className="animate-spin" />
            )}
            Show more
          </Button>
        </div>
      )}
    </div>
  );
}
