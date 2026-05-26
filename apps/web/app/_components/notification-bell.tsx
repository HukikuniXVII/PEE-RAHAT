"use client";

import type {
  NotificationFeedPage,
  NotificationItem,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createApiClient } from "@/lib/api-client";

/**
 * FR-CM-08 — floating notification bell.
 *
 * Lives top-right of every authenticated page (NOT in the nav bar per
 * spec). Click opens the panel; the panel pulls the paginated feed +
 * marks rows read on click. Unread count comes from the dedicated
 * endpoint so the bell badge stays cheap even when the user has
 * hundreds of rows; SSE listener (separate component) invalidates the
 * `notifications-unread` query the moment a new event arrives.
 *
 * No SSE subscription happens here — that's the listener component's
 * job. The bell only reads + mutates; it doesn't open sockets.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const unread = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => createApiClient().notifications.unreadCount(),
    refetchInterval: 60_000,
  });

  // Trigger the shake animation the first frame the unread count goes
  // up — driven by react-query so the SSE listener doesn't need to know
  // about this component.
  const prevCount = useRef(unread.data?.count ?? 0);
  useEffect(() => {
    const current = unread.data?.count ?? 0;
    if (current > prevCount.current) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 600);
      return () => clearTimeout(t);
    }
    prevCount.current = current;
  }, [unread.data?.count]);

  // Click-outside close. Bell button is part of the wrapped div so
  // clicking the bell itself stays "inside".
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const count = unread.data?.count ?? 0;
  const badge = count > 9 ? "9+" : String(count);

  return (
    <div
      ref={wrapRef}
      className="fixed top-4 right-4 z-[60] md:top-6 md:right-6"
    >
      <motion.button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          // Refresh feed when the panel opens so a stale list isn't
          // sitting next to a fresh badge.
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }
        }}
        aria-label={count > 0 ? `${count} notifications` : "Notifications"}
        animate={
          shake
            ? { rotate: [0, -12, 12, -8, 8, 0], transition: { duration: 0.6 } }
            : { rotate: 0 }
        }
        className="relative w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center justify-center"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
            {badge}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && <NotificationPanel onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

type Tab = "all" | "unread";

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");

  const feed = useQuery({
    queryKey: ["notifications", "feed"],
    queryFn: () => createApiClient().notifications.listPage({ limit: 20 }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => createApiClient().notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const markAllRead = useMutation({
    mutationFn: () => createApiClient().notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = feed.data?.items ?? [];
  const filtered = tab === "unread" ? items.filter((n) => !n.readAt) : items;
  const grouped = groupByDay(filtered);

  function activate(n: NotificationItem) {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.actionUrl) {
      router.push(n.actionUrl as Route);
      onClose();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.14 }}
      // Mobile = bottom sheet (full-width, slide-up); desktop = floating
      // panel anchored under the bell.
      className="fixed inset-x-4 bottom-4 top-20 md:absolute md:inset-auto md:top-14 md:right-0 md:bottom-auto md:w-[380px] md:max-h-[560px] bg-white rounded-[24px] border border-slate-200 shadow-xl flex flex-col overflow-hidden"
    >
      <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <h2 className="thai text-base font-bold text-slate-900">การแจ้งเตือน</h2>
        <div className="flex items-center gap-1">
          {items.some((n) => !n.readAt) && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="thai inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-violet-700 hover:bg-violet-50 disabled:opacity-40"
            >
              <CheckCheck size={12} />
              อ่านทั้งหมด
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="md:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="px-5 pt-3 flex items-center gap-1">
        <TabButton
          active={tab === "all"}
          onClick={() => setTab("all")}
          label="ทั้งหมด"
          count={items.length}
        />
        <TabButton
          active={tab === "unread"}
          onClick={() => setTab("unread")}
          label="ยังไม่อ่าน"
          count={items.filter((n) => !n.readAt).length}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {feed.isLoading && (
          <p className="text-center text-xs text-slate-400 py-8 thai">
            กำลังโหลด…
          </p>
        )}
        {!feed.isLoading && filtered.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-12 space-y-2 thai">
            <Inbox size={24} className="mx-auto text-slate-300" />
            <p>ไม่มีการแจ้งเตือน</p>
          </div>
        )}
        {grouped.map((group) => (
          <section key={group.dayLabel} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 thai">
              {group.dayLabel}
            </p>
            {group.items.map((n) => (
              <NotificationItemRow
                key={n.id}
                item={n}
                onClick={() => activate(n)}
              />
            ))}
          </section>
        ))}
      </div>

      <footer className="px-5 py-3 border-t border-slate-100 text-center">
        <Link
          href={"/account/notifications" as Route}
          onClick={onClose}
          className="thai text-xs font-bold text-violet-700 hover:text-violet-800"
        >
          ดูทั้งหมด · ตั้งค่าการแจ้งเตือน →
        </Link>
      </footer>
    </motion.div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "thai inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors",
        active
          ? "bg-violet-100 text-violet-800"
          : "text-slate-500 hover:bg-slate-50",
      )}
    >
      {label}
      <span
        className={cn(
          "text-[10px] tabular-nums",
          active ? "text-violet-600" : "text-slate-400",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function NotificationItemRow({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: () => void;
}) {
  const unread = !item.readAt;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-3 transition-colors",
        unread ? "bg-violet-50/60 hover:bg-violet-100/60" : "hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "mt-1.5 w-2 h-2 rounded-full shrink-0",
          unread ? "bg-violet-600" : "bg-transparent",
        )}
      />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              "thai text-sm truncate",
              unread ? "font-bold text-slate-900" : "font-medium text-slate-700",
            )}
          >
            {item.title}
          </p>
          <time className="text-[10px] text-slate-400 shrink-0">
            {formatRelative(item.createdAt)}
          </time>
        </div>
        <p className="thai text-xs text-slate-500 line-clamp-2">{item.body}</p>
      </div>
    </button>
  );
}

function groupByDay(items: NotificationItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const map = new Map<string, NotificationItem[]>();
  for (const n of items) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    const key =
      d.getTime() === today.getTime()
        ? "วันนี้"
        : d.getTime() === yesterday.getTime()
          ? "เมื่อวาน"
          : d.toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
    const existing = map.get(key);
    if (existing) existing.push(n);
    else map.set(key, [n]);
  }
  return Array.from(map.entries()).map(([dayLabel, items]) => ({
    dayLabel,
    items,
  }));
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "เพิ่งกี้";
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.`;
  const days = Math.floor(hours / 24);
  return `${days} วัน`;
}

// Suppress unused warning while NotificationFeedPage type is referenced
// indirectly through api-client return shape.
export type _PanelFeedPage = NotificationFeedPage;
