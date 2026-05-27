"use client";

import type { ChatThread } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessagesSquare, Search, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createApiClient } from "@/lib/api-client";

import { ChatRoom } from "./chat-room";

interface Props {
  initialThreads: ChatThread[];
  /** Preselect a thread on first render. Used by /chat?with=<tutorId>
   *  and /chat?thread=<threadId> so every chat entry lands in the
   *  split-pane view with the target conversation already active. */
  initialSelectedId?: string | null;
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "เพิ่งกี้";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function ThreadsList({ initialThreads, initialSelectedId = null }: Props) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["chat", "threads"],
    queryFn: () => createApiClient().chat.threads(),
    initialData: initialThreads,
    refetchInterval: 30_000,
  });
  const allThreads = data ?? initialThreads;
  const [search, setSearch] = useState("");
  // Split-pane state: clicking a thread row activates it inline in the
  // right column. Server preselection comes in via initialSelectedId
  // when the page receives `?with=<tutorId>` or `?thread=<threadId>`.
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const selectedThread = useMemo(
    () => allThreads.find((t) => t.id === selectedId) ?? null,
    [allThreads, selectedId],
  );

  /**
   * URL sync: every selection writes back to ?thread=<id> via
   * router.replace (no history push). Without this the URL stays at
   * whatever entry-point query the user arrived with — e.g. they came
   * in via /chat?with=tutorX, clicked tutorY in the sidebar, refreshed,
   * and snapped back to X because the URL never moved. Replace (not
   * push) so the back button still goes wherever the user was before
   * /chat, not through every thread they tapped.
   *
   * "Back" on mobile clears ?thread= so the list view is shareable too.
   */
  function selectThread(id: string | null) {
    setSelectedId(id);
    const next = id ? (`/chat?thread=${id}` as Route) : ("/chat" as Route);
    router.replace(next, { scroll: false });
  }

  const threads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allThreads;
    return allThreads.filter((t) => {
      const haystack = [
        t.counterparty.displayName,
        t.counterparty.subtitle ?? "",
        t.lastMessagePreview,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allThreads, search]);

  if (allThreads.length === 0) {
    // Future layout will be split-screen: contacts list on the left,
    // active chat on the right. Render the empty state in the right
    // column already so the first thread doesn't trigger a layout jump.
    return (
      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* Left — placeholder for the contacts list */}
        <aside className="hidden md:block">
          <div className="bg-white/50 border border-dashed border-violet-200 rounded-[28px] p-6 min-h-[420px] flex items-center justify-center">
            <div className="text-center space-y-2">
              <MessagesSquare
                size={24}
                className="text-violet-300 mx-auto"
                strokeWidth={1.8}
              />
              <p className="thai text-[11px] font-semibold text-ink-mute leading-relaxed">
                รายชื่อบทสนทนา
                <br />
                จะอยู่ตรงนี้
              </p>
            </div>
          </div>
        </aside>

        {/* Right — empty state with brand CTA */}
        <div className="bg-white p-10 rounded-[32px] border border-violet-100 shadow-[0_8px_24px_-16px_rgba(85,65,139,0.25)] text-center flex flex-col items-center gap-5 min-h-[420px] justify-center">
          <div className="space-y-2">
            <h3 className="thai text-xl font-bold text-grape-deep">
              ยังไม่มีบทสนทนา
            </h3>
            <p className="thai text-sm text-ink-soft leading-relaxed max-w-sm">
              เริ่มสนทนาด้วยการเข้าไปที่โปรไฟล์พี่รหัส แล้วกดปุ่ม Chat
            </p>
          </div>
          <Link
            href="/tutors"
            className="thai inline-flex items-center gap-2 rounded-[16px] bg-dusty-grape px-8 py-4 text-[16px] font-bold text-white-smoke shadow-lg transition-all hover:bg-accent-500 hover:text-neutral-800 hover:shadow-lg hover:shadow-accent-500/30"
          >
            ค้นหาพี่รหัสเลย
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    );
  }

  // Split-pane layout: left = conversation list, right = active chat
  // (or a placeholder when nothing is selected). Mirrors the empty state
  // so the page doesn't visually re-flow when the first thread arrives.
  // On mobile (<md) the list and chat swap places: opening a thread
  // hides the list and shows the chat full-width with a back button.
  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-6">
      <aside
        className={cn(
          "space-y-3 min-w-0",
          selectedThread ? "hidden md:block" : "block",
        )}
      >
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute"
          />
          <input
            type="text"
            placeholder="ค้นหาบทสนทนา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="thai w-full pl-10 pr-4 py-3 bg-white border border-violet-100 rounded-2xl text-sm text-ink placeholder:text-ink-mute focus:border-violet-300 focus:shadow-focus outline-none transition-all"
          />
        </div>

        {threads.length === 0 ? (
          <p className="thai text-center text-xs text-ink-mute py-8 font-medium">
            ไม่พบบทสนทนาที่ตรงกับ &ldquo;{search}&rdquo;
          </p>
        ) : null}

        {threads.map((thread) => {
          const isStudentSide = thread.counterparty.role === "tutor";
          const hasUnread = thread.unreadCount > 0;
          const isActive = thread.id === selectedId;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => selectThread(thread.id)}
              aria-pressed={isActive}
              className="block w-full text-left"
            >
              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-[20px] border transition-all shadow-[0_4px_12px_-8px_rgba(85,65,139,0.18)]",
                  isActive
                    ? "bg-grape-soft border-violet-400 ring-2 ring-violet-300/40"
                    : hasUnread
                      ? "bg-grape-soft/60 border-violet-200 hover:border-violet-300"
                      : "bg-white border-violet-100 hover:border-violet-200",
                )}
              >
                {thread.counterparty.avatarUrl ? (
                  <img
                    src={thread.counterparty.avatarUrl}
                    alt={thread.counterparty.displayName}
                    className="w-11 h-11 rounded-2xl object-cover bg-grape-soft shrink-0"
                  />
                ) : (
                  <span className="w-11 h-11 rounded-2xl bg-dusty-grape text-white text-sm font-black flex items-center justify-center shrink-0">
                    {initialsOf(thread.counterparty.displayName)}
                  </span>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={cn(
                        "thai text-sm truncate",
                        hasUnread
                          ? "font-black text-grape-deep"
                          : "font-bold text-ink",
                      )}
                    >
                      {thread.counterparty.displayName}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-medium text-ink-mute">
                        {formatRelative(thread.lastMessageAt)}
                      </span>
                      {hasUnread && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-dusty-grape text-white text-[10px] font-black flex items-center justify-center">
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                        isStudentSide
                          ? "bg-grape-soft text-grape-deep"
                          : "bg-neutral-100 text-ink-mute",
                      )}
                    >
                      {isStudentSide ? "Tutor" : "Student"}
                    </span>
                    <p
                      className={cn(
                        "thai text-xs truncate flex-1",
                        hasUnread ? "font-bold text-ink-soft" : "text-ink-mute",
                      )}
                    >
                      {thread.lastMessagePreview || "ยังไม่มีข้อความ"}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        <p className="thai pt-4 text-[10px] text-ink-mute text-center font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-500" />
          ทุกข้อความถูกกรองช่องทางติดต่อนอกแพลตฟอร์มอัตโนมัติ
        </p>
      </aside>

      {/* Right pane — placeholder when nothing is selected, ChatRoom
          when a thread is active. On mobile the right pane only renders
          once a thread is picked so the list isn't pushed off-screen.
          ChatRoom hydrates messages itself via useQuery so passing an
          empty initialMessages is safe. */}
      {selectedThread ? (
        <div className="bg-white rounded-[32px] border border-violet-100 shadow-[0_8px_24px_-16px_rgba(85,65,139,0.25)] overflow-hidden min-h-[420px]">
          <ChatRoom
            key={selectedThread.id}
            thread={selectedThread}
            initialMessages={[]}
            onBack={() => selectThread(null)}
          />
        </div>
      ) : (
        <div className="hidden md:flex bg-white p-10 rounded-[32px] border border-violet-100 shadow-[0_8px_24px_-16px_rgba(85,65,139,0.25)] text-center flex-col items-center justify-center gap-3 min-h-[420px]">
          <MessagesSquare
            size={28}
            className="text-violet-300"
            strokeWidth={1.8}
          />
          <p className="thai text-sm text-ink-soft leading-relaxed max-w-xs">
            เลือกบทสนทนาจากด้านซ้ายเพื่อเริ่มสนทนากับพี่รหัส
          </p>
        </div>
      )}
    </div>
  );
}
