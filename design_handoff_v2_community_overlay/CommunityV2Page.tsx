"use client";

/**
 * CommunityV2Page — Facebook-style cozy-card feed (simplified).
 *
 * Recreates the V2 prototype. Adapt to:
 *   - Use lucide-react icons (TrendingUp, Bookmark, Heart, MessageCircle,
 *     Image as ImageIcon, Hash, Globe, MoreHorizontal, BadgeCheck)
 *   - Use Tailwind tokens (violet-500, grape-deep, grape-soft, accent-500,
 *     emerald-600, rose-600, ink, ink-soft, ink-mute, soft-periwinkle)
 *   - Source posts/trending/saved from React Query hooks
 *   - Render <PageBackground photo={false} sparkles="sparse"/> as the backdrop
 */

import { useState } from "react";
import {
  TrendingUp, Bookmark, Heart, MessageCircle,
  Hash, Globe, MoreHorizontal, BadgeCheck, ImageIcon
} from "lucide-react";
import { cn } from "@peerahat/ui";
import { PageBackground, Avatar } from "@peerahat/ui";

// ---------- Types (move to packages/types when ready) ----------

export interface FeedPost {
  id: number;
  author: {
    name: string;
    uni: string;
    verified: boolean;
    handle: string;
  };
  tag: string;
  when: string;
  body: string;
  liked: boolean;
  bookmarked: boolean;
  likes: number;
  comments: number;
  topReplies: Reply[];
  embed?: SheetEmbed | TutorEmbed;
  poll?: Poll;
}

export interface Reply { /* ... */ }
export interface SheetEmbed { /* ... */ }
export interface TutorEmbed { /* ... */ }
export interface Poll { /* ... */ }

export interface TrendingItem {
  tag: string;
  category: string;
  count: string;
}

interface Props {
  posts: FeedPost[];
  trending: TrendingItem[];
  saved: FeedPost[];
  onOpenProfile: (author: FeedPost["author"]) => void;
}

export function CommunityV2Page({ posts, trending, saved, onOpenProfile }: Props) {
  return (
    <div className="relative min-h-screen">
      <PageBackground photo={false} sparkles="sparse"/>
      <div className="relative mx-auto grid grid-cols-[260px_1fr] gap-5 px-6 py-6" style={{maxWidth: 1200}}>
        <LeftRail trending={trending} saved={saved}/>
        <FeedColumn posts={posts} onOpenProfile={onOpenProfile}/>
      </div>
    </div>
  );
}

// ---------- Left Rail ----------

function LeftRail({ trending, saved }: { trending: TrendingItem[]; saved: FeedPost[] }) {
  return (
    <aside className="sticky top-6 space-y-4 self-start">
      <TrendingCard trending={trending}/>
      <SavedCard saved={saved}/>
    </aside>
  );
}

function TrendingCard({ trending }: { trending: TrendingItem[] }) {
  return (
    <div className="rounded-2xl bg-white border border-grape-soft/40 shadow-sm overflow-hidden">
      <header className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-grape-soft/40">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-violet-500 text-white">
          <TrendingUp className="w-4 h-4"/>
        </span>
        <div>
          <h3 className="font-bold text-grape-deep text-sm">กำลังมาแรง</h3>
          <p className="text-[10.5px] text-ink-mute">อัปเดตทุก 15 นาที</p>
        </div>
      </header>
      <ul>
        {trending.map((t, i) => (
          <li key={t.tag}>
            <button className={cn(
              "w-full flex items-start justify-between gap-2 px-4 py-3 text-left transition hover:bg-grape-soft/40",
              i > 0 && "border-t border-grape-soft/40"
            )}>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] text-ink-mute">{t.category}</p>
                <p className="text-[13.5px] font-bold text-ink inline-flex items-center gap-1">
                  {t.tag.startsWith("#") ? t.tag : `#${t.tag}`}
                  {i === 0 && <TrendingUp className="w-3 h-3 text-rose-600"/>}
                </p>
                <p className="text-[10.5px] text-ink-mute tabular-nums">{t.count}</p>
              </div>
              <span className={cn(
                "tabular-nums text-[11px] font-bold rounded-full px-1.5 py-0.5",
                i < 3 ? "bg-grape-soft text-grape-deep" : "text-ink-mute"
              )}>
                #{i + 1}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button className="w-full px-4 py-2.5 text-left text-[12.5px] font-semibold text-violet-500 hover:bg-grape-soft/40 transition border-t border-grape-soft/40">
        ดูเทรนด์ทั้งหมด →
      </button>
    </div>
  );
}

function SavedCard({ saved }: { saved: FeedPost[] }) {
  return (
    <div className="rounded-2xl bg-white border border-grape-soft/40 shadow-sm overflow-hidden">
      <header className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-grape-soft/40">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent-500 text-grape-deep">
          <Bookmark className="w-4 h-4 fill-current"/>
        </span>
        <div className="flex-1">
          <h3 className="font-bold text-grape-deep text-sm">ที่บันทึกไว้</h3>
          <p className="text-[10.5px] text-ink-mute">โพสต์ที่เก็บไว้อ่าน</p>
        </div>
        <span className="tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded bg-grape-soft text-grape-deep">
          {saved.length}
        </span>
      </header>
      {saved.length === 0 ? (
        <p className="text-center text-[11.5px] text-ink-mute py-6">🔖 ยังไม่มีโพสต์ที่บันทึก</p>
      ) : (
        <ul>
          {saved.slice(0, 3).map((p, i) => (
            <li key={p.id}>
              <button className={cn(
                "w-full flex items-start gap-2.5 px-4 py-3 text-left transition hover:bg-grape-soft/40",
                i > 0 && "border-t border-grape-soft/40"
              )}>
                <Avatar name={p.author.name} size={28} verified={p.author.verified}/>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-violet-500">{p.author.name} · {p.tag}</p>
                  <p className="text-[12px] text-ink mt-0.5 leading-snug line-clamp-2">{p.body.split("\n")[0]}</p>
                  <p className="text-[10px] text-ink-mute mt-1">บันทึกไว้ {p.when}ที่แล้ว</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="w-full px-4 py-2.5 text-left text-[12.5px] font-semibold text-violet-500 hover:bg-grape-soft/40 transition border-t border-grape-soft/40">
        ดูที่บันทึกทั้งหมด →
      </button>
    </div>
  );
}

// ---------- Feed ----------

function FeedColumn({ posts, onOpenProfile }: { posts: FeedPost[]; onOpenProfile: Props["onOpenProfile"] }) {
  return (
    <main className="space-y-4 min-w-0">
      <Composer/>
      {posts.map(p => <FeedPostCard key={p.id} post={p} onOpenProfile={onOpenProfile}/>)}
    </main>
  );
}

function Composer() {
  const [text, setText] = useState("");
  return (
    <div className="rounded-2xl bg-white border border-grape-soft/40 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <Avatar name="ฉัน" size={40}/>
        <div className="flex-1">
          <textarea
            value={text} onChange={e => setText(e.target.value)} rows={2}
            placeholder="มีอะไรอยากถามรุ่นพี่?"
            className="w-full text-[14px] outline-none resize-none leading-relaxed bg-transparent text-ink"
          />
          <div className="flex items-center gap-1 mt-2 pt-2.5 border-t border-grape-soft/40">
            <button className="text-[13px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition hover:bg-grape-soft/60 text-emerald-600">
              <ImageIcon className="w-4 h-4"/> รูปภาพ
            </button>
            <button className="text-[13px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition hover:bg-grape-soft/60 text-violet-500">
              <Hash className="w-4 h-4"/> แท็ก
            </button>
            <span className="flex-1"/>
            <button
              disabled={!text}
              className={cn(
                "text-[13px] font-bold px-4 py-1.5 rounded-full transition",
                text ? "bg-violet-500 text-white" : "bg-grape-soft text-ink-mute cursor-not-allowed"
              )}
            >โพสต์</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedPostCard({ post: p, onOpenProfile }: { post: FeedPost; onOpenProfile: Props["onOpenProfile"] }) {
  return (
    <article className="rounded-2xl bg-white border border-grape-soft/40 shadow-sm overflow-hidden">
      {/* Author header — note the avatar/name are buttons that open the profile overlay */}
      <header className="px-4 pt-3 pb-2 flex items-start gap-3">
        <button onClick={() => onOpenProfile(p.author)} aria-label={`ดูโปรไฟล์ของ ${p.author.name}`}>
          <Avatar name={p.author.name} size={44} verified={p.author.verified}/>
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onOpenProfile(p.author)}
            className="text-left text-[14px] font-bold text-ink inline-flex items-center gap-1 hover:underline"
          >
            {p.author.name}
            {p.author.verified && <BadgeCheck className="w-3.5 h-3.5 text-violet-500"/>}
          </button>
          {/* uni badge here if verified */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] text-ink-mute">
            <span>{p.when}</span><span>·</span>
            <Globe className="w-3 h-3"/><span>·</span>
            <span className="text-violet-500 hover:underline">{p.tag}</span>
          </div>
        </div>
        <button aria-label="เพิ่มเติม"><MoreHorizontal className="w-5 h-5 text-ink-mute"/></button>
      </header>

      <div className="px-4 pb-3 text-[14.5px] leading-[1.6] text-ink whitespace-pre-line">
        {/* Render p.body with hashtag highlighting */}
      </div>

      {/* embed/poll go here */}

      {/* Reaction summary */}
      <div className="px-4 py-2 flex items-center justify-between text-[12px] text-ink-mute">
        <span className="tabular-nums">❤ 🎉 💡  {p.likes}</span>
        <span className="tabular-nums">{p.comments} ความเห็น</span>
      </div>

      {/* Action row — only 3 buttons (no share) */}
      <div className="px-2 grid grid-cols-3 border-t border-grape-soft/30">
        <ActionBtn icon={<Heart className={cn("w-4 h-4", p.liked && "fill-current")}/>} label="ถูกใจ"   color="rose"      active={p.liked}/>
        <ActionBtn icon={<MessageCircle className="w-4 h-4"/>}                          label="ความเห็น" color="periwinkle"/>
        <ActionBtn icon={<Bookmark className={cn("w-4 h-4", p.bookmarked && "fill-current")}/>} label="บันทึก" color="accent" active={p.bookmarked}/>
      </div>

      {/* Inline comments (if any) */}
      {p.topReplies.length > 0 && <InlineComments replies={p.topReplies}/>}
    </article>
  );
}

function ActionBtn({ icon, label, color, active }: { icon: React.ReactNode; label: string; color: string; active?: boolean }) {
  const colorMap: Record<string, string> = {
    rose: "text-rose-600",
    periwinkle: "text-soft-periwinkle",
    accent: "text-accent-600",
  };
  return (
    <button className={cn(
      "py-2.5 text-[13px] font-semibold inline-flex items-center justify-center gap-2 rounded-lg transition hover:bg-grape-soft/40",
      active ? colorMap[color] : "text-ink-soft"
    )}>
      {icon} {label}
    </button>
  );
}

function InlineComments({ replies }: { replies: Reply[] }) {
  return (
    <div className="px-4 pt-3 pb-3 space-y-2.5 bg-grape-soft/20 border-t border-grape-soft/30">
      {/* render each reply with Avatar + bubble + actions row */}
      {/* + inline reply composer at the bottom */}
    </div>
  );
}
