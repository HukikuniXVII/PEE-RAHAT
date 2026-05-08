"use client";

import type { CommunityPost, CommunityReply } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowBigUp,
  ChevronDown,
  MessageCircle,
  Send,
  User,
} from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initial: CommunityPost[];
}

export function CommunityFeed({ initial }: Props) {
  const [posts, setPosts] = useState<CommunityPost[]>(initial);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pdpa, setPdpa] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, CommunityReply[]>>({});

  const handleUpvote = async (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, upvotes: p.upvotes + (p.hasUpvoted ? -1 : 1), hasUpvoted: !p.hasUpvoted }
          : p,
      ),
    );
    try {
      await createApiClient().community.upvote(id);
    } catch {
      // revert in real impl
    }
  };

  const toggleReplies = async (id: string) => {
    if (expanded[id]) {
      const { [id]: _omit, ...rest } = expanded;
      setExpanded(rest);
      return;
    }
    const replies = await createApiClient().community.replies(id);
    setExpanded((e) => ({ ...e, [id]: replies }));
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !pdpa) return;
    const created = await createApiClient().community.create({
      title,
      content,
      consentPdpaAccepted: true,
    });
    setPosts((prev) => [created, ...prev]);
    setTitle("");
    setContent("");
    setPdpa(false);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
            <User size={24} />
          </div>
          <div className="flex-1 space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="หัวข้อกระทู้ของคุณ..."
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="เนื้อหาที่ต้องการแชร์..."
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[120px]"
            />
            <label className="flex items-start gap-2 text-[10px] text-slate-500 font-medium">
              <input
                type="checkbox"
                checked={pdpa}
                onChange={(e) => setPdpa(e.target.checked)}
                className="mt-1"
              />
              <span>
                ข้าพเจ้าได้ตรวจสอบแล้วว่าเนื้อหาไม่มีข้อมูลส่วนบุคคล (PDPA) และยอมรับข้อกำหนดของ Pee Rahat
              </span>
            </label>
            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || !content.trim() || !pdpa}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                ตั้งกระทู้
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <motion.div
            layout
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="flex">
              <div className="w-16 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-6 gap-2">
                <button
                  onClick={() => handleUpvote(post.id)}
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
                    onClick={() =>
                      void createApiClient().reports.submit({
                        targetType: "post",
                        targetId: post.id,
                        reason: "inappropriate",
                        details: "Reported via UI",
                      })
                    }
                    className="p-2 text-slate-300 hover:text-red-400 transition-colors flex items-center gap-1 text-[10px] font-bold"
                  >
                    <AlertTriangle size={14} />
                    Report
                  </button>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {post.content}
                </p>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => toggleReplies(post.id)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <MessageCircle size={18} />
                    {post.replyCount} ความคิดเห็น
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform",
                        expanded[post.id] && "rotate-180",
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
                  {expanded[post.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-6 border-t border-slate-100 overflow-hidden"
                    >
                      {expanded[post.id]!.map((reply) => (
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
                      <ReplyComposer postId={post.id} onCreated={(r) =>
                        setExpanded((e) => ({
                          ...e,
                          [post.id]: [...(e[post.id] ?? []), r],
                        }))
                      } />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ReplyComposer({
  postId,
  onCreated,
}: {
  postId: string;
  onCreated: (reply: CommunityReply) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex gap-3 pt-2">
      <textarea
        placeholder="ตอบกลับ..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500/20"
      />
      <button
        disabled={busy || !body.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            const reply = await createApiClient().community.reply({
              postId,
              content: body,
            });
            onCreated(reply);
            setBody("");
          } finally {
            setBusy(false);
          }
        }}
        className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
      >
        <Send size={14} />
      </button>
    </div>
  );
}
