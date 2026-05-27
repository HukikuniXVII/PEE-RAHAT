"use client";

/**
 * MobileChat — V3 mobile iOS layout of the same chat.
 * Renders the conversation full-screen on phones. Top bar has back + tutor
 * mini-card ONLY — NO video, NO phone, NO more, NO "เสนอเวลาใหม่" button.
 *
 * Use this component below sm: breakpoint, or as a separate route on native.
 */

import { useState } from "react";
import { Avatar, cn } from "@peerahat/ui";
import { ChevronLeft, Plus, Smile, Send, BadgeCheck } from "lucide-react";
import type { RenderableMessage } from "./ChatPage";

interface Props {
  thread: {
    counterparty: { name: string; uni: string; verified: boolean; online: boolean };
  };
  messages: RenderableMessage[];
  onBack: () => void;
  onSend: (body: string) => void;
  isOtherTyping?: boolean;
}

export function MobileChat({ thread, messages, onBack, onSend, isOtherTyping }: Props) {
  return (
    <div className="flex flex-col h-screen bg-[var(--color-surface-cream)]">
      {/* Sticky header */}
      <header className="px-3 pt-3 pb-2 sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-grape-soft/40">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="grid place-items-center w-9 h-9 rounded-full -ml-1 text-violet-500" aria-label="กลับ">
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <div className="relative">
            <Avatar name={thread.counterparty.name} size={36} verified={thread.counterparty.verified}/>
            {thread.counterparty.online && (
              <span className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white"/>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold inline-flex items-center gap-1 text-ink leading-tight">
              {thread.counterparty.name}
              {thread.counterparty.verified && <BadgeCheck className="w-3 h-3 text-violet-500"/>}
            </p>
            <p className={cn("text-[10.5px]", thread.counterparty.online ? "text-emerald-600" : "text-ink-mute")}>
              {thread.counterparty.online ? "ออนไลน์ตอนนี้" : "ออฟไลน์"} · {thread.counterparty.uni}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map((m, i) => <MobileMessageRow key={i} m={m}/>)}
        {isOtherTyping && (
          <div className="flex items-end gap-2">
            <Avatar name={thread.counterparty.name} size={24} verified/>
            <div className="px-3 py-2 rounded-2xl bg-white border border-grape-soft/40 flex items-center gap-1">
              <Dot delay={0}/><Dot delay={200}/><Dot delay={400}/>
            </div>
          </div>
        )}
      </main>

      {/* Composer */}
      <Composer onSend={onSend}/>
    </div>
  );
}

function MobileMessageRow({ m }: { m: RenderableMessage }) {
  if (m.kind === "divider") return <DayChip label={m.label}/>;
  if (m.kind === "system") return (
    <div className="flex justify-center">
      <div className="rounded-full px-3 py-1.5 flex items-center gap-1.5 bg-emerald-50">
        <span className="text-sm">{m.icon}</span>
        <p className="text-[10.5px] font-bold text-emerald-700">{m.label}</p>
      </div>
    </div>
  );
  if (m.kind === "system-booking-proposal") return <BookingProposalMobile m={m}/>;
  return <Bubble m={m}/>;
}

function Bubble({ m }: { m: Extract<RenderableMessage, { kind: "them" | "me" }> }) {
  const isMe = m.kind === "me";
  return (
    <div className={cn("flex items-end gap-1.5", isMe && "justify-end")}>
      {!isMe && <Avatar name={(m as any).author} size={24} verified={(m as any).verified}/>}
      <div className={cn("flex flex-col max-w-[78%]", isMe ? "items-end" : "items-start")}>
        <div className={cn(
          "px-3 py-2 text-[13px] leading-relaxed",
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
        <p className="text-[9.5px] mt-0.5 px-1 text-ink-mute">
          {m.time}
          {isMe && <span className={cn("ml-1", (m as any).read ? "text-violet-500" : "text-ink-mute")}>
            · {(m as any).read ? "อ่านแล้ว ✓✓" : "ส่งแล้ว"}
          </span>}
        </p>
      </div>
    </div>
  );
}

function BookingProposalMobile(props: { m: Extract<RenderableMessage, { kind: "system-booking-proposal" }> }) {
  const { m } = props;
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-violet-300/30 shadow-md">
      <div className="px-3 py-2 flex items-center gap-2 bg-violet-500 text-white">
        <span className="text-xs">📅</span>
        <p className="text-[11px] font-bold flex-1">เสนอเวลาเรียน</p>
        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">รอตอบรับ</span>
      </div>
      <div className="p-3">
        <p className="text-[14px] font-bold text-grape-deep">{m.date}</p>
        <p className="text-[12px] text-ink-soft">{m.time} · {m.durationMin / 60} ชม.</p>
        <p className="text-[11.5px] font-bold mt-2 text-ink">📚 {m.subject}</p>
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <button className="text-[10.5px] font-semibold py-2 rounded-lg border border-grape-soft text-ink-soft">เสนอเวลาอื่น</button>
          <button className="text-[10.5px] font-semibold py-2 rounded-lg border border-rosy-taupe/60 text-taupe-deep">ปฏิเสธ</button>
          <button className="text-[11.5px] font-bold py-2 rounded-lg bg-violet-500 text-white">ตอบรับ</button>
        </div>
      </div>
    </div>
  );
}

function DayChip({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-2">
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-grape-soft text-grape-deep">
        {label}
      </span>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-ink-mute"
      style={{ animation: "chPulse 1.4s infinite", animationDelay: `${delay}ms` }}
    />
  );
}

function Composer({ onSend }: { onSend: (b: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="px-3 py-2.5 shrink-0 bg-white border-t border-grape-soft/40">
      <div className="flex items-end gap-1.5">
        <button className="grid place-items-center w-9 h-9 rounded-full bg-grape-soft text-violet-500" aria-label="แนบไฟล์">
          <Plus className="w-4 h-4"/>
        </button>
        <div className="flex-1 rounded-3xl px-3.5 py-2 flex items-center gap-2 bg-grape-soft/70 border border-grape-soft/40">
          <input
            value={text} onChange={e => setText(e.target.value)}
            className="flex-1 text-[13px] outline-none bg-transparent"
            placeholder="พิมพ์ข้อความ…"
          />
          <button className="text-ink-mute" aria-label="emoji"><Smile className="w-4 h-4"/></button>
        </div>
        <button
          onClick={() => { if (text) { onSend(text); setText(""); } }}
          className="grid place-items-center w-9 h-9 rounded-full bg-violet-500 text-white"
          aria-label="ส่ง"
        >
          <Send className="w-4 h-4"/>
        </button>
      </div>
      <p className="text-[9.5px] mt-1 px-2 text-center text-ink-mute">
        🔒 เบอร์/Line จะถูกซ่อนอัตโนมัติ
      </p>
    </div>
  );
}
