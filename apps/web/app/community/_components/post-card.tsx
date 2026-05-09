"use client";

import type { CommunityPost, Page } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowBigUp,
  ChevronDown,
  MessageCircle,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { ReplyComposer } from "./reply-composer";

interface Props {
  post: CommunityPost;
}

const POSTS_KEY = ["community", "posts"] as const;

export function PostCard({ post }: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const repliesQuery = useQuery({
    queryKey: ["community", "replies", post.id],
    queryFn: () => createApiClient().community.replies(post.id),
    enabled: expanded,
  });
  const replies = repliesQuery.data ?? [];

  const upvote = useMutation({
    mutationFn: () => createApiClient().community.upvote(post.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: POSTS_KEY });
      const prev = queryClient.getQueryData<Page<CommunityPost>>(POSTS_KEY);
      queryClient.setQueryData<Page<CommunityPost>>(POSTS_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  upvotes: p.upvotes + (p.hasUpvoted ? -1 : 1),
                  hasUpvoted: !p.hasUpvoted,
                }
              : p,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(POSTS_KEY, ctx.prev);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Page<CommunityPost>>(POSTS_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((p) =>
            p.id === post.id ? { ...p, upvotes: data.upvotes } : p,
          ),
        };
      });
    },
  });

  const report = useMutation({
    mutationFn: () =>
      createApiClient().reports.submit({
        targetType: "post",
        targetId: post.id,
        reason: "inappropriate",
        details: "Reported via UI",
      }),
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="flex">
        <div className="w-16 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-6 gap-2">
          <button
            type="button"
            onClick={() => upvote.mutate()}
            className={cn(
              "p-1 rounded-lg transition-colors",
              post.hasUpvoted
                ? "text-indigo-600 bg-indigo-100"
                : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-100",
            )}
            aria-label="Upvote"
          >
            <ArrowBigUp size={32} />
          </button>
          <span className="font-black text-slate-700">{post.upvotes}</span>
        </div>

        <div className="flex-1 p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                  {post.authorBadge}
                </span>
                <span className="text-[10px] text-slate-300 font-bold">•</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date(post.createdAt).toLocaleString("th-TH")}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 leading-tight">
                {post.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => report.mutate()}
              disabled={report.isPending || report.isSuccess}
              className="p-2 text-slate-300 hover:text-red-400 transition-colors flex items-center gap-1 text-[10px] font-bold disabled:opacity-50"
            >
              <AlertTriangle size={14} />
              {report.isSuccess ? "Reported" : "Report"}
            </button>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {post.content}
          </p>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <MessageCircle size={18} />
              {post.replyCount} ความคิดเห็น
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-900">
                  {post.authorDisplayName}
                </p>
                <p className="text-[9px] text-slate-400 uppercase tracking-tighter">
                  Post Author
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <User size={16} />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-6 border-t border-slate-100 overflow-hidden"
              >
                {repliesQuery.isLoading && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Loading...
                  </p>
                )}
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="flex gap-3 pl-4 border-l-2 border-slate-100 py-1"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                      <User size={12} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-900">
                          {reply.authorDisplayName}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(reply.createdAt).toLocaleString("th-TH")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))}
                <ReplyComposer postId={post.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
