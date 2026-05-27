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
  currentDisplayName: string | null;
}

export function CommunityFeed({ initialPage, currentDisplayName }: Props) {
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
    <div className="space-y-4">
      {currentDisplayName && (
        <PostComposer currentDisplayName={currentDisplayName} />
      )}

      {posts.length === 0 ? (
        <div className="cozy-card p-10 text-center space-y-2">
          <p className="text-[28px]">💬</p>
          <p className="thai text-[14px] font-bold text-grape-deep">
            ยังไม่มีโพสต์
          </p>
          <p className="thai text-[12px] text-ink-soft">
            เป็นคนแรกที่เริ่มถามรุ่นพี่ในชุมชน
          </p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

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
            โหลดเพิ่มเติม
          </Button>
        </div>
      )}
    </div>
  );
}
