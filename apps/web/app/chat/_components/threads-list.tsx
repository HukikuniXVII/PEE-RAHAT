"use client";

import type {
  ChatThread,
  ChatThreadBookingSummary,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessagesSquare, Plus, Search } from "lucide-react";
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

type Filter = "all" | "booked" | "unread";

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "เพิ่งกี้";
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วัน`;
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

function formatBookedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

// Mirrors apps/web/app/community/_components/avatar.tsx so the same user
// renders with the same chip letter (and therefore the same hash-derived
// color) across chat + community. trim() handles "น้อง Pim" / "พี่ กิ๊ฟ"
// where a space follows the honorific.
function initialsOf(name: string): string {
  const stripped = name.replace(/^พี่/, "").replace(/^น้อง/, "").trim();
  return (stripped.slice(0, 1) || "?").toUpperCase();
}

function BookingBadge({ summary }: { summary: ChatThreadBookingSummary }) {
  // Maps the handoff palette: paid=emerald, proposed=accent, completed=grape-soft.
  // "other" (e.g. requested/cancelled) is suppressed at the call site.
  const styles =
    summary.status === "paid"
      ? "bg-[rgba(47,155,110,0.12)] text-emerald-600"
      : summary.status === "proposed"
        ? "bg-[rgba(240,203,103,0.25)] text-accent-700"
        : "bg-grape-soft text-grape-deep";
  const label =
    summary.status === "paid"
      ? "จองแล้ว"
      : summary.status === "proposed"
        ? "รอตอบ"
        : "เสร็จแล้ว";
  return (
    <span
      className={cn(
        "thai text-[9.5px] font-bold inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full",
        styles,
      )}
    >
      ● {label}
    </span>
  );
}

export function ThreadsList({ initialThreads, initialSelectedId = null }: Props) {
  const router = useRouter();
  // FR-CM-08 rev2: SSE pushes ["chat", "threads"] on any thread mutation,
  // so the 30s timer is gone — refetch fires on demand.
  const { data } = useQuery({
    queryKey: ["chat", "threads"],
    queryFn: () => createApiClient().chat.threads(),
    initialData: initialThreads,
  });
  const allThreads = data ?? initialThreads;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // Split-pane selection — clicking a thread activates it inline in the
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

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allThreads.filter((t) => {
      if (filter === "booked") {
        // Treat "booked" as anything that has a paid or completed linked
        // booking. "proposed" stays off this filter since it's not yet
        // a confirmed class.
        if (
          t.bookingSummary?.status !== "paid" &&
          t.bookingSummary?.status !== "completed"
        ) {
          return false;
        }
      }
      if (filter === "unread" && t.unreadCount === 0) return false;
      if (!q) return true;
      const haystack = [
        t.counterparty.displayName,
        t.counterparty.subtitle ?? "",
        t.lastMessagePreview,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allThreads, search, filter]);

  const counts = useMemo(() => {
    return {
      all: allThreads.length,
      booked: allThreads.filter(
        (t) =>
          t.bookingSummary?.status === "paid" ||
          t.bookingSummary?.status === "completed",
      ).length,
      unread: allThreads.filter((t) => t.unreadCount > 0).length,
    };
  }, [allThreads]);

  if (allThreads.length === 0) {
    return (
      <div className="cozy-card p-10 text-center flex flex-col items-center gap-5 min-h-[420px] justify-center">
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
          className="thai inline-flex items-center gap-2 rounded-[16px] bg-violet-500 px-8 py-4 text-[16px] font-bold text-white shadow-lg transition-all hover:bg-accent-500 hover:text-neutral-800"
        >
          ค้นหาพี่รหัสเลย
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[340px_1fr] gap-4 items-stretch min-h-[calc(100dvh-160px)]">
      {/* Left rail. Hidden on mobile when a thread is selected so the
          conversation gets the full screen. */}
      <aside
        className={cn(
          "cozy-card overflow-hidden flex flex-col min-h-0",
          selectedThread ? "hidden md:flex" : "flex",
        )}
      >
        <div className="px-4 pt-4 pb-3 shrink-0 space-y-3 border-b border-[rgba(85,65,139,0.06)]">
          <div className="flex items-center justify-between">
            <h2 className="thai text-[18px] font-bold tracking-tight text-grape-deep">
              ข้อความ
            </h2>
            <Link
              href="/tutors"
              aria-label="หาพี่รหัสเพื่อเริ่มแชทใหม่"
              className="grid place-items-center w-8 h-8 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition"
            >
              <Plus className="w-4 h-4" strokeWidth={2.4} />
            </Link>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-grape-soft">
            <Search size={16} className="text-ink-mute shrink-0" />
            <input
              type="text"
              placeholder="ค้นหารุ่นพี่ / หัวข้อ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="thai flex-1 outline-none text-[12.5px] bg-transparent text-ink placeholder:text-ink-mute"
            />
          </div>
          <div className="flex gap-1.5">
            {(
              [
                ["all", "ทั้งหมด"],
                ["booked", "จองแล้ว"],
                ["unread", "ยังไม่อ่าน"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "thai text-[11.5px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition",
                  filter === key
                    ? "bg-violet-500 text-white"
                    : "text-grape-deep border border-grape-soft hover:bg-grape-soft/60",
                )}
              >
                {label}
                <span className="num opacity-70">{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <li className="thai text-center text-xs text-ink-mute py-8 px-4 font-medium">
              {search
                ? `ไม่พบบทสนทนาที่ตรงกับ "${search}"`
                : "ยังไม่มีบทสนทนาในตัวกรองนี้"}
            </li>
          ) : (
            filteredThreads.map((thread) => {
              const isActive = thread.id === selectedId;
              const hasUnread = thread.unreadCount > 0;
              const showBadge =
                thread.bookingSummary &&
                thread.bookingSummary.status !== "other";
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => selectThread(thread.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "w-full px-4 py-3 flex items-start gap-3 text-left transition border-l-[3px]",
                      isActive
                        ? "bg-grape-soft border-violet-500"
                        : "border-transparent hover:bg-[rgba(85,65,139,0.04)]",
                    )}
                  >
                    <div className="relative shrink-0">
                      {thread.counterparty.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thread.counterparty.avatarUrl}
                          alt={thread.counterparty.displayName}
                          className="w-[42px] h-[42px] rounded-full object-cover bg-grape-soft"
                        />
                      ) : (
                        <span className="w-[42px] h-[42px] rounded-full bg-violet-500 text-white text-sm font-bold flex items-center justify-center">
                          {initialsOf(thread.counterparty.displayName)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={cn(
                            "thai text-[13.5px] truncate",
                            hasUnread
                              ? "font-bold text-grape-deep"
                              : "font-semibold text-ink",
                          )}
                        >
                          {thread.counterparty.displayName}
                        </h3>
                        <span
                          className={cn(
                            "text-[10px] font-medium shrink-0 num",
                            hasUnread ? "text-violet-500" : "text-ink-mute",
                          )}
                        >
                          {formatRelative(thread.lastMessageAt)}
                        </span>
                      </div>
                      {thread.counterparty.subtitle && (
                        <p className="thai text-[10.5px] text-soft-periwinkle truncate mt-0.5">
                          {thread.counterparty.subtitle}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p
                          className={cn(
                            "thai text-[12px] truncate flex-1",
                            hasUnread
                              ? "font-bold text-ink"
                              : "text-ink-mute",
                          )}
                        >
                          {thread.lastMessagePreview || "ยังไม่มีข้อความ"}
                        </p>
                        {hasUnread && (
                          <span className="num min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {thread.unreadCount > 99
                              ? "99+"
                              : thread.unreadCount}
                          </span>
                        )}
                      </div>
                      {showBadge && thread.bookingSummary && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <BookingBadge summary={thread.bookingSummary} />
                          <span className="thai text-[10px] text-ink-mute num truncate">
                            {formatBookedDate(thread.bookingSummary.scheduledAt)}{" "}
                            · {thread.bookingSummary.subject}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* Right pane — conversation when a thread is selected, otherwise
          a desktop-only placeholder. On mobile the placeholder is hidden
          because the list takes the full screen until a thread is picked. */}
      {selectedThread ? (
        <ChatRoom
          key={selectedThread.id}
          thread={selectedThread}
          initialMessages={[]}
          onBack={() => selectThread(null)}
        />
      ) : (
        <div className="hidden md:flex cozy-card p-10 flex-col items-center justify-center gap-3 min-h-[420px]">
          <MessagesSquare
            size={28}
            className="text-violet-200"
            strokeWidth={1.8}
          />
          <p className="thai text-sm text-ink-soft leading-relaxed max-w-xs text-center">
            เลือกบทสนทนาจากด้านซ้ายเพื่อเริ่มสนทนากับพี่รหัส
          </p>
        </div>
      )}
    </div>
  );
}
