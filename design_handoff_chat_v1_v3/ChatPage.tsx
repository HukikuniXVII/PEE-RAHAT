"use client";

/**
 * ChatPage — V1 Desktop Split layout for the student↔tutor chat.
 *
 * Recreates the V1 prototype. Adapt to:
 *   - Tailwind tokens from packages/config/tailwind/preset.ts
 *   - @peerahat/ui Avatar
 *   - lucide-react icons (Search, Plus, MoreHorizontal, Calendar, Send, Paperclip, Image, Smile, BadgeCheck)
 *   - Real ChatThread / ChatMessage data via React Query
 *
 * NO top-app-nav inside this component (the host shell provides it).
 * NO "จองเรียนใหม่", NO "ดูรายละเอียด" link, NO more (⋯) menu, NO "Active booking strip".
 * The only header action is "เสนอเวลาเรียนใหม่".
 */

import { useState } from "react";
import { Avatar, cn } from "@peerahat/ui";
import {
  Search, Plus, Calendar, Send, Paperclip, Image as ImageIcon, Smile, BadgeCheck
} from "lucide-react";
import type { ChatThread, ChatMessage } from "@peerahat/types";

interface Props {
  threads: ChatThread[];
  activeThreadId: string;
  onPickThread: (id: string) => void;
  messages: RenderableMessage[];
  onSend: (body: string) => void;
  onProposeNewTime: () => void;
  onSearchThreads?: (query: string) => void;
}

export type RenderableMessage =
  | { kind: "divider"; label: string }
  | { kind: "them"; author: string; verified?: boolean; body: string; body2redacted?: string; time: string }
  | { kind: "me"; body: string; body2redacted?: string; time: string; read: boolean }
  | { kind: "system"; tone: "success" | "info" | "warn"; icon: string; label: string; sub?: string }
  | { kind: "system-booking-proposal"; from: string; date: string; time: string; durationMin: number; subject: string; note: string };

export function ChatPage(props: Props) {
  const { threads, activeThreadId } = props;
  const active = threads.find(t => t.id === activeThreadId);
  if (!active) return null;

  return (
    <div className="h-screen flex flex-col bg-neutral-50">
      <SlimTopBar/>
      <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: "340px 1fr" }}>
        <ThreadListRail {...props} active={active}/>
        <Conversation {...props} active={active}/>
      </div>
    </div>
  );
}

// ---------- Top bar (no nav) ----------
function SlimTopBar() {
  return (
    <header className="px-5 py-2.5 flex items-center gap-3 bg-white border-b border-grape-soft/40">
      <a className="flex items-center gap-2">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-violet-500 text-white">
          {/* logo */}
        </span>
        <span className="text-[16px] font-bold tracking-tight text-grape-deep">Pee Rahat</span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-grape-soft text-grape-deep">แชท</span>
      </a>
      <span className="flex-1"/>
      <Avatar name="ฉัน" size={32}/>
    </header>
  );
}

// ---------- Left rail ----------
function ThreadListRail({ threads, activeThreadId, onPickThread, onSearchThreads, active }: Props & { active: ChatThread }) {
  const [filter, setFilter] = useState<"all" | "booked" | "unread">("all");
  return (
    <aside className="flex flex-col min-h-0 bg-white border-r border-grape-soft/40">
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[18px] font-bold tracking-tight text-grape-deep">ข้อความ</h1>
          <button className="grid place-items-center w-8 h-8 rounded-lg bg-violet-500 text-white" aria-label="แชทใหม่">
            <Plus className="w-4 h-4"/>
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-grape-soft">
          <Search className="w-4 h-4 text-ink-mute"/>
          <input
            onChange={e => onSearchThreads?.(e.target.value)}
            className="flex-1 outline-none text-[12.5px] bg-transparent"
            placeholder="ค้นหารุ่นพี่/หัวข้อ"
          />
        </div>
        <div className="flex gap-1.5 mt-3">
          {(["all","booked","unread"] as const).map(c => {
            const label = c === "all" ? "ทั้งหมด" : c === "booked" ? "จองแล้ว" : "ยังไม่อ่าน";
            return (
              <button
                key={c} onClick={() => setFilter(c)}
                className={cn(
                  "text-[11.5px] font-semibold px-2.5 py-1 rounded-full transition",
                  filter === c
                    ? "bg-violet-500 text-white"
                    : "text-grape-deep border border-grape-soft hover:bg-grape-soft/60"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {threads.map(t => (
          <li key={t.id}>
            <ThreadRow t={t} active={t.id === activeThreadId} onClick={() => onPickThread(t.id)}/>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ThreadRow({ t, active, onClick }: { t: ChatThread; active: boolean; onClick: () => void }) {
  // … render avatar + name + uni + preview + time + unread pill + BookingBadge
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-3 flex items-start gap-3 text-left transition",
        active ? "bg-grape-soft border-l-[3px] border-violet-500 pl-[13px]" : "border-l-[3px] border-transparent hover:bg-grape-soft/40"
      )}
    >
      {/* … */}
    </button>
  );
}

// ---------- Conversation ----------
function Conversation({ active, messages, onSend, onProposeNewTime }: Props & { active: ChatThread }) {
  return (
    <main className="flex flex-col min-h-0 bg-[var(--color-surface-cream)]">
      {/* Sticky counterparty header — only "เสนอเวลาเรียนใหม่" action */}
      <header className="px-5 py-3 flex items-center gap-3 shrink-0 bg-white/95 backdrop-blur-md border-b border-grape-soft/40">
        <div className="relative">
          <Avatar name={active.counterparty.displayName} size={44} verified={active.counterparty.verified}/>
          {active.counterparty.online && (
            <span className="absolute -bottom-px -right-px w-3 h-3 rounded-full bg-emerald-600 ring-2 ring-white"/>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-ink inline-flex items-center gap-1.5">
            {active.counterparty.displayName}
            {active.counterparty.verified && <BadgeCheck className="w-3.5 h-3.5 text-violet-500"/>}
          </p>
          <p className="text-[11px] text-ink-soft">
            {active.counterparty.uni}
            {active.counterparty.online && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"/> ออนไลน์
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onProposeNewTime}
          className="px-3 py-2 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 bg-grape-soft text-grape-deep hover:bg-grape-soft/70"
        >
          <Calendar className="w-4 h-4"/> เสนอเวลาเรียนใหม่
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => <MessageRow key={i} m={m}/>)}
      </div>

      <Composer onSend={onSend}/>
    </main>
  );
}

function MessageRow({ m }: { m: RenderableMessage }) {
  if (m.kind === "divider") return <DayDivider label={m.label}/>;
  if (m.kind === "system") return <SystemCard tone={m.tone} icon={m.icon} label={m.label} sub={m.sub}/>;
  if (m.kind === "system-booking-proposal") return <BookingProposalCard {...m}/>;
  // them / me bubble
  return <Bubble {...m}/>;
}

function Bubble(m: Extract<RenderableMessage, { kind: "them" | "me" }>) {
  const isMe = m.kind === "me";
  return (
    <div className={cn("flex items-end gap-2", isMe && "justify-end")}>
      {!isMe && <Avatar name={(m as any).author} size={28} verified={(m as any).verified}/>}
      <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
        <div className={cn(
          "px-3.5 py-2.5 text-[13.5px] leading-relaxed",
          isMe
            ? "bg-violet-500 text-white rounded-[18px] rounded-br-[4px]"
            : "bg-white text-ink border border-grape-soft/40 rounded-[18px] rounded-bl-[4px]"
        )}>
          {m.body}
          {m.body2redacted && (
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] bg-taupe-soft text-taupe-deep border border-dashed border-rosy-taupe">
              🔒 {m.body2redacted}
            </span>
          )}
        </div>
        <p className="text-[10px] mt-1 px-1 text-ink-mute">
          {m.time}
          {isMe && <span className={cn("ml-1", (m as any).read ? "text-violet-500" : "text-ink-mute")}>
            · {(m as any).read ? "อ่านแล้ว ✓✓" : "ส่งแล้ว"}
          </span>}
        </p>
      </div>
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2" role="separator">
      <div className="flex-1 h-px bg-grape-soft/60"/>
      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-grape-soft text-grape-deep">
        {label}
      </span>
      <div className="flex-1 h-px bg-grape-soft/60"/>
    </div>
  );
}

function SystemCard({ tone, icon, label, sub }: { tone: "success"|"info"|"warn"; icon: string; label: string; sub?: string }) {
  const palette = {
    success: { bg: "bg-emerald-50",    fg: "text-emerald-700", border: "border-emerald-200" },
    info:    { bg: "bg-violet-100/40", fg: "text-violet-500",  border: "border-violet-300/40" },
    warn:    { bg: "bg-accent-500/20", fg: "text-accent-700",  border: "border-accent-500/40" },
  }[tone];
  return (
    <div className="flex justify-center my-1">
      <div className={cn("rounded-2xl px-4 py-2.5 max-w-[480px] flex items-start gap-2.5 border", palette.bg, palette.border)}>
        <span className="text-[18px] shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={cn("text-[12.5px] font-bold leading-tight", palette.fg)}>{label}</p>
          {sub && <p className="text-[11px] mt-0.5 text-ink-soft">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// Booking proposal — NO payment amount shown. Just accept the time.
function BookingProposalCard(m: Extract<RenderableMessage, { kind: "system-booking-proposal" }>) {
  return (
    <div className="flex justify-center my-2">
      <div className="rounded-2xl p-4 max-w-[440px] bg-gradient-to-br from-violet-100/60 to-white border border-violet-300/30 shadow-lg">
        <header className="flex items-center gap-2 mb-3">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-violet-500 text-white">
            <Calendar className="w-4 h-4"/>
          </span>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-violet-500">เสนอเวลาเรียน</p>
            <p className="text-[11px] text-ink-mute">โดย {m.from}</p>
          </div>
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-700">
            ● รอตอบรับ
          </span>
        </header>

        <div className="rounded-xl p-3 mb-3 bg-grape-soft">
          <p className="text-[14px] font-bold text-grape-deep">{m.date}</p>
          <p className="text-[12.5px] mt-0.5 text-ink-soft">{m.time} · {m.durationMin} นาที</p>
        </div>

        <p className="text-[12.5px] font-bold mb-1 text-ink">📚 {m.subject}</p>
        <p className="text-[11.5px] leading-relaxed mb-3 text-ink-soft">{m.note}</p>

        <div className="flex items-center gap-2 pt-2 border-t border-dashed border-grape-soft">
          <button className="text-[12px] font-semibold px-3 py-2 rounded-lg border border-grape-soft text-ink-soft">
            เสนอเวลาอื่น
          </button>
          <button className="text-[12px] font-semibold px-3 py-2 rounded-lg text-taupe-deep">
            ปฏิเสธ
          </button>
          <span className="flex-1"/>
          <button className="text-[13px] font-bold px-5 py-2 rounded-lg bg-violet-500 text-white shadow-md hover:bg-grape-deep">
            ตอบรับ
          </button>
        </div>
      </div>
    </div>
  );
}

// Composer
function Composer({ onSend }: { onSend: (body: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="px-4 py-3 shrink-0 bg-white border-t border-grape-soft/40">
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-0.5">
          {[<Paperclip key="p" className="w-4 h-4"/>, <ImageIcon key="i" className="w-4 h-4"/>, <Smile key="s" className="w-4 h-4"/>].map((ic, i) => (
            <button key={i} className="grid place-items-center w-9 h-9 rounded-lg text-ink-soft hover:bg-grape-soft/60">{ic}</button>
          ))}
        </div>
        <div className="flex-1 rounded-2xl px-3.5 py-2.5 bg-grape-soft/60 border border-grape-soft/40">
          <textarea
            rows={1}
            value={text} onChange={e => setText(e.target.value)}
            className="w-full text-[13.5px] outline-none resize-none bg-transparent leading-relaxed text-ink"
            placeholder="พิมพ์ข้อความ… (ห้ามแลกเบอร์/Line — ระบบจะซ่อนให้อัตโนมัติ)"
          />
        </div>
        <button
          onClick={() => { if (text) { onSend(text); setText(""); } }}
          className="grid place-items-center w-10 h-10 rounded-xl bg-violet-500 text-white shadow-md hover:bg-grape-deep"
          aria-label="ส่ง"
        >
          <Send className="w-4 h-4"/>
        </button>
      </div>
      <p className="text-[10px] mt-1.5 px-1 text-ink-mute">
        🔒 ทุกข้อความถูกเข้ารหัสและตรวจ bypass อัตโนมัติ · กด Enter เพื่อส่ง
      </p>
    </div>
  );
}
