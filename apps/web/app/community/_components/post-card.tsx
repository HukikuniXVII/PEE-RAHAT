"use client";

import {
  type CommunityPost,
  type Page,
  HASHTAG_RE_GLOBAL_SPLIT,
  firstHashtag,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Globe,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { ReportDialog } from "@/app/_components/report-dialog";
import { createApiClient } from "@/lib/api-client";

import { Avatar } from "./avatar";
import { ReplyComposer } from "./reply-composer";
import { UniBadge } from "./uni-badge";

interface Props {
  post: CommunityPost;
}

const POSTS_KEY = ["community", "posts"] as const;
const BOOKMARKS_KEY = ["community", "bookmarks"] as const;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60_000));
  if (mins < 60) return `${mins} นาที`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ชม.`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} วัน`;
  const months = Math.round(days / 30);
  return `${months} เดือน`;
}

// Render post body with #hashtags styled as violet links. Uses the
// shared SPLIT variant so highlighting matches the trending aggregator
// exactly — no runtime RegExp construction, no risk of regex drift.
function renderBody(body: string) {
  return body.split(HASHTAG_RE_GLOBAL_SPLIT).map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} className="text-violet-500 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// Render-time merge: legacy posts have a distinct `title` field; the V2
// composer auto-derives title from the first line of content so the body
// already carries it. For legacy posts where they differ, prepend the
// title so it stays visible in the new card without a data migration or
// duplicate render. New posts skip the merge (startsWith check is true).
function displayBodyOf(post: CommunityPost): string {
  if (post.title && !post.content.startsWith(post.title)) {
    return `${post.title}\n${post.content}`;
  }
  return post.content;
}

// authorBadge from the backend is "Faculty | University" for tutors,
// "Student" otherwise. Split into the uni line shown next to the name.
function uniLineFor(badge: string): string | null {
  if (badge === "Student") return null;
  const [faculty, uni] = badge.split(" | ");
  return uni ? `${uni} ${faculty}` : badge;
}

export function PostCard({ post }: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [reporting, setReporting] = useState(false);

  const repliesQuery = useInfiniteQuery({
    queryKey: ["community", "replies", post.id],
    queryFn: ({ pageParam = 1 }) =>
      createApiClient().community.replies(post.id, {
        page: pageParam,
        pageSize: 10,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total
        ? lastPage.page + 1
        : undefined,
    enabled: expanded,
  });
  const replies = repliesQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const patchPostInPages = (
    old: InfiniteData<Page<CommunityPost>> | undefined,
    patch: (p: CommunityPost) => CommunityPost,
  ): InfiniteData<Page<CommunityPost>> | undefined => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((p) => (p.id === post.id ? patch(p) : p)),
      })),
    };
  };

  const like = useMutation({
    mutationFn: () => createApiClient().community.upvote(post.id),
    meta: { toast: "ส่งหัวใจไม่สำเร็จ ลองอีกครั้ง" },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: POSTS_KEY });
      const prev =
        queryClient.getQueryData<InfiniteData<Page<CommunityPost>>>(POSTS_KEY);
      queryClient.setQueryData<InfiniteData<Page<CommunityPost>>>(
        POSTS_KEY,
        (old) =>
          patchPostInPages(old, (p) => ({
            ...p,
            upvotes: p.upvotes + (p.hasUpvoted ? -1 : 1),
            hasUpvoted: !p.hasUpvoted,
          })),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(POSTS_KEY, ctx.prev);
    },
    onSuccess: (data) => {
      // Reconcile both count AND boolean from the server. Without
      // hasUpvoted here, a race with another tab can leave the heart's
      // filled state pinned to the optimistic guess instead of truth.
      queryClient.setQueryData<InfiniteData<Page<CommunityPost>>>(
        POSTS_KEY,
        (old) =>
          patchPostInPages(old, (p) => ({
            ...p,
            upvotes: data.upvotes,
            hasUpvoted: data.hasUpvoted,
          })),
      );
    },
  });

  const bookmark = useMutation({
    mutationFn: () => createApiClient().community.toggleBookmark(post.id),
    meta: { toast: "บันทึกโพสต์ไม่สำเร็จ ลองอีกครั้ง" },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: POSTS_KEY });
      const prev =
        queryClient.getQueryData<InfiniteData<Page<CommunityPost>>>(POSTS_KEY);
      queryClient.setQueryData<InfiniteData<Page<CommunityPost>>>(
        POSTS_KEY,
        (old) =>
          patchPostInPages(old, (p) => ({
            ...p,
            hasBookmarked: !p.hasBookmarked,
            bookmarkCount: p.bookmarkCount + (p.hasBookmarked ? -1 : 1),
          })),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(POSTS_KEY, ctx.prev);
    },
    onSuccess: (data) => {
      // Reconcile against the server's authoritative count so optimistic
      // drift (concurrent bookmarks from other users) settles within one
      // round-trip instead of waiting for the next refetch.
      queryClient.setQueryData<InfiniteData<Page<CommunityPost>>>(
        POSTS_KEY,
        (old) =>
          patchPostInPages(old, (p) => ({
            ...p,
            hasBookmarked: data.hasBookmarked,
            bookmarkCount: data.bookmarkCount,
          })),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BOOKMARKS_KEY });
    },
  });

  const isTutor = post.authorBadge !== "Student";
  const uniLine = uniLineFor(post.authorBadge);
  const displayBody = displayBodyOf(post);
  const tag = firstHashtag(displayBody);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="cozy-card overflow-hidden"
    >
      {/* Author header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <Avatar name={post.authorDisplayName} size={44} badge={isTutor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="thai text-[14px] font-bold inline-flex items-center gap-1 text-ink">
              {post.authorDisplayName}
              {isTutor && (
                <CheckCircle2
                  size={13}
                  className="text-violet-500"
                  strokeWidth={2.4}
                />
              )}
            </p>
            {uniLine && <UniBadge uni={uniLine} verified={isTutor} size="sm" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 thai text-[11.5px] text-ink-mute">
            <span>{relativeTime(post.createdAt)}</span>
            <span>·</span>
            <Globe size={11} strokeWidth={1.8} />
            {tag && (
              <>
                <span>·</span>
                <span className="text-violet-500 font-medium">{tag}</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="text-ink-mute hover:text-rose-600 transition-colors p-1"
          aria-label="รายงานโพสต์"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Body — V2 has no separate title affordance. New posts have
          title = first line of content; legacy posts get the title
          prepended at render time so it stays visible without a
          schema/data migration (see displayBodyOf). */}
      <div className="px-4 pb-3">
        <p className="thai text-[14.5px] leading-[1.6] whitespace-pre-line text-ink">
          {renderBody(displayBody)}
        </p>
      </div>

      {/* Reaction summary */}
      <div className="px-4 py-2 flex items-center justify-between thai text-[12px] text-ink-mute">
        <div className="flex items-center gap-1.5">
          {post.upvotes > 0 && (
            <>
              <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center bg-rose-600 text-white text-[10px] border-[1.5px] border-white">
                ❤
              </span>
              <span className="num">{post.upvotes}</span>
            </>
          )}
        </div>
        <div className="num">
          {post.replyCount > 0 && `${post.replyCount} ความเห็น`}
        </div>
      </div>

      {/* Action row */}
      <div className="px-2 cozy-hairline grid grid-cols-3">
        <button
          type="button"
          onClick={() => like.mutate()}
          className={cn(
            "py-2.5 thai text-[13px] font-semibold inline-flex items-center justify-center gap-2 rounded-lg transition cozy-hover",
            post.hasUpvoted ? "text-rose-600" : "text-ink-soft",
          )}
        >
          <Heart
            size={16}
            fill={post.hasUpvoted ? "currentColor" : "none"}
            strokeWidth={1.8}
          />
          ถูกใจ
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="py-2.5 thai text-[13px] font-semibold inline-flex items-center justify-center gap-2 rounded-lg transition cozy-hover text-ink-soft hover:text-soft-periwinkle"
        >
          <MessageCircle size={16} strokeWidth={1.8} />
          ความเห็น
        </button>
        <button
          type="button"
          onClick={() => bookmark.mutate()}
          className={cn(
            "py-2.5 thai text-[13px] font-semibold inline-flex items-center justify-center gap-2 rounded-lg transition cozy-hover",
            post.hasBookmarked ? "text-accent-600" : "text-ink-soft",
          )}
        >
          <Bookmark
            size={16}
            fill={post.hasBookmarked ? "currentColor" : "none"}
            strokeWidth={1.8}
          />
          บันทึก
        </button>
      </div>

      {/* Inline comments */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="cozy-hairline overflow-hidden"
            style={{ background: "rgba(85,65,139,0.02)" }}
          >
            <div className="px-4 pt-3 pb-3 space-y-2.5">
              {repliesQuery.isLoading && (
                <p className="thai text-[11.5px] text-ink-mute inline-flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  กำลังโหลดความเห็น…
                </p>
              )}
              {replies.length === 0 && !repliesQuery.isLoading && (
                <p className="thai text-[12px] text-ink-mute">
                  ยังไม่มีความเห็น — เป็นคนแรกที่ตอบสิ
                </p>
              )}
              {replies.map((reply) => {
                const replyIsTutor = reply.authorBadge !== "Student";
                const replyUni = uniLineFor(reply.authorBadge);
                return (
                  <div key={reply.id} className="flex items-start gap-2">
                    <Avatar
                      name={reply.authorDisplayName}
                      size={32}
                      badge={replyIsTutor}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="rounded-2xl px-3 py-2 bg-white border border-[rgba(85,65,139,0.08)]">
                        <p className="thai text-[12.5px] font-bold inline-flex items-center gap-1.5 leading-tight text-ink">
                          {reply.authorDisplayName}
                          {replyIsTutor && (
                            <CheckCircle2
                              size={11}
                              className="text-violet-500"
                              strokeWidth={2.4}
                            />
                          )}
                          {replyUni && (
                            <UniBadge
                              uni={replyUni}
                              verified={replyIsTutor}
                              size="sm"
                            />
                          )}
                        </p>
                        <p className="thai text-[13px] mt-1 leading-relaxed text-ink">
                          {reply.content}
                        </p>
                      </div>
                      <p className="thai text-[11px] mt-1 ml-3 text-ink-mute">
                        {relativeTime(reply.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {repliesQuery.hasNextPage && (
                <button
                  type="button"
                  onClick={() => repliesQuery.fetchNextPage()}
                  disabled={repliesQuery.isFetchingNextPage}
                  className="thai text-[12px] font-semibold text-violet-500 hover:text-violet-600 inline-flex items-center gap-1 pl-10"
                >
                  {repliesQuery.isFetchingNextPage && (
                    <Loader2 size={11} className="animate-spin" />
                  )}
                  โหลดความเห็นเพิ่ม
                </button>
              )}
              <div className="pt-1 pl-10">
                <ReplyComposer postId={post.id} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {reporting && (
        <ReportDialog
          targetType="community_post"
          targetId={post.id}
          onClose={() => setReporting(false)}
        />
      )}
    </motion.article>
  );
}
