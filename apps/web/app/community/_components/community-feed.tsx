"use client";

import type { CommunityPost, Page } from "@peerahat/types";
import { useQuery } from "@tanstack/react-query";

import { createApiClient } from "@/lib/api-client";

import { PostCard } from "./post-card";
import { PostComposer } from "./post-composer";

interface Props {
  initialPage: Page<CommunityPost>;
}

export function CommunityFeed({ initialPage }: Props) {
  const { data } = useQuery({
    queryKey: ["community", "posts"],
    queryFn: () => createApiClient().community.list(),
    initialData: initialPage,
  });
  const posts = data?.items ?? initialPage.items;

  return (
    <div className="space-y-8">
      <PostComposer />
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
