"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type ChatBookingProposal,
  type ChatMessage,
  type ChatThread,
  detectBypassAttempt,
  sendMessageSchema,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  ChevronLeft,
  Flag,
  Image as ImageIcon,
  Loader2,
  Lock,
  Paperclip,
  Send,
  Smile,
  Video,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { ReportDialog } from "@/app/_components/report-dialog";
import { createApiClient } from "@/lib/api-client";
import { useMutationWithToast } from "@/lib/hooks/use-mutation-with-toast";

import { ProposeSlotDialog } from "./propose-slot-dialog";

const composerSchema = sendMessageSchema.pick({ body: true });
type ComposerValues = z.infer<typeof composerSchema>;

interface Props {
  thread: ChatThread;
  initialMessages: ChatMessage[];
  /** Mobile-only back button in the header invokes this callback so the
   *  list view comes back into view on small screens. */
  onBack?: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Mirrors apps/web/app/community/_components/avatar.tsx so the same user
// renders with the same chip letter (and therefore the same hash-derived
// color) across chat + community. trim() handles "น้อง Pim" / "พี่ กิ๊ฟ"
// where a space follows the honorific.
function initialsOf(name: string): string {
  const stripped = name.replace(/^พี่/, "").replace(/^น้อง/, "").trim();
  return (stripped.slice(0, 1) || "?").toUpperCase();
}

// FR-TH-17: pulls the first https URL out of a system message body so we
// can render the meet-link system message with a join-class button. Plain
// postpone breadcrumbs (no URL) fall through to the compact chip style.
const URL_RE = /(https?:\/\/[^\s]+)/;
function extractUrl(body: string): string | null {
  const m = URL_RE.exec(body);
  return m ? m[1] ?? null : null;
}
function stripUrlLine(body: string): string {
  return body
    .split("\n")
    .filter((line) => !URL_RE.test(line))
    .join("\n")
    .trim();
}

// Day divider boundary: local-day buckets keyed by YYYY-MM-DD in Asia/
// Bangkok-ish (uses the runtime locale). Returns the divider label for
// the FIRST message of each day; null otherwise.
function dayDividerFor(
  current: ChatMessage,
  prev: ChatMessage | null,
): string | null {
  const day = new Date(current.createdAt).toLocaleDateString("th-TH");
  if (!prev) return formatDayLabel(current.createdAt);
  const prevDay = new Date(prev.createdAt).toLocaleDateString("th-TH");
  if (day === prevDay) return null;
  return formatDayLabel(current.createdAt);
}

function formatDayLabel(iso: string): string {
  const ts = new Date(iso);
  const now = new Date();
  const sameDay = ts.toDateString() === now.toDateString();
  if (sameDay) return "วันนี้";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (ts.toDateString() === yest.toDateString()) return "วานนี้";
  return ts.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ChatRoom({ thread, initialMessages, onBack }: Props) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { counterparty } = thread;
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(
    null,
  );
  const [showProposeDialog, setShowProposeDialog] = useState(false);

  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", thread.id],
    queryFn: () => createApiClient().chat.messages(thread.id),
    initialData: initialMessages,
    refetchInterval: 5000,
  });
  const messages = messagesQuery.data ?? initialMessages;

  // V2 chat redesign: inline booking-proposal card data, synthesized
  // from the thread's active PostponeRequest. Null when no active
  // proposal → card suppressed. Gate on bookingId so threads without
  // an attached booking (open-with-tutor before any booking exists) don't
  // poll the endpoint every 5s for guaranteed-null responses.
  const proposalQuery = useQuery({
    queryKey: ["chat", "proposal", thread.id],
    queryFn: () => createApiClient().chat.proposal(thread.id),
    enabled: !!thread.bookingId,
    refetchInterval: 5000,
  });
  const proposal = proposalQuery.data ?? null;

  // Bookings stay queried for the closed-state and the propose-time
  // dialog payload (which needs the bookingId).
  const bookingQuery = useQuery({
    queryKey: ["bookings", "byId", thread.bookingId],
    queryFn: () => createApiClient().bookings.byId(thread.bookingId!),
    enabled: !!thread.bookingId,
    refetchInterval: 5000,
  });
  const booking = bookingQuery.data;
  const closed = !!thread.closedAt;

  const markRead = useMutation({
    mutationFn: () => createApiClient().chat.markRead(thread.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
    },
  });
  // Mark-read on mount + each time a new message arrives. Backend takes
  // the max(now, lastReadAt), so the call is idempotent.
  useEffect(() => {
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id, messages.length]);

  const form = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: { body: "" },
    mode: "onChange",
  });
  const body = form.watch("body");
  const bypassWarning = detectBypassAttempt(body);

  const send = useMutation({
    mutationFn: (values: ComposerValues) =>
      createApiClient().chat.send({ threadId: thread.id, body: values.body }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({
        queryKey: ["chat", "messages", thread.id],
      });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const isMine = (m: ChatMessage) => m.authorId === thread.viewerUserId;

  return (
    <section className="cozy-card overflow-hidden flex flex-col min-h-0 h-[calc(100dvh-160px)] md:h-auto md:min-h-[calc(100dvh-160px)]">
      {/* Sticky counterparty header — one action only: "เสนอเวลาเรียนใหม่" */}
      <header className="px-4 md:px-5 py-3 flex items-center gap-3 shrink-0 bg-white/95 backdrop-blur-md border-b border-[rgba(85,65,139,0.08)]">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="กลับไปยังรายการบทสนทนา"
            className="md:hidden -ml-1 inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-grape-soft/60 text-violet-500 transition"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>
        )}
        {counterparty.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={counterparty.avatarUrl}
            alt={counterparty.displayName}
            className="w-11 h-11 rounded-full object-cover bg-grape-soft"
          />
        ) : (
          <span className="w-11 h-11 rounded-full bg-violet-500 text-white text-sm font-bold flex items-center justify-center">
            {initialsOf(counterparty.displayName)}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="thai text-[15px] font-bold text-ink inline-flex items-center gap-1.5">
            <span className="truncate">{counterparty.displayName}</span>
            {counterparty.verified && (
              <BadgeCheck
                size={14}
                className="text-violet-500 shrink-0"
                strokeWidth={2.4}
              />
            )}
          </p>
          {counterparty.subtitle && (
            <p className="thai text-[11px] text-ink-soft truncate">
              {counterparty.subtitle}
            </p>
          )}
        </div>
        {thread.bookingId && !closed && (
          <button
            type="button"
            onClick={() => setShowProposeDialog(true)}
            className="thai text-[12px] font-semibold inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-grape-soft text-grape-deep hover:bg-[rgba(85,65,139,0.12)] transition shrink-0"
          >
            <Calendar size={14} strokeWidth={2} />
            <span className="hidden sm:inline">เสนอเวลาเรียนใหม่</span>
            <span className="sm:hidden">เลื่อน</span>
          </button>
        )}
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-3"
        style={{ background: "var(--color-surface-cream, #FAF6F5)" }}
      >
        {/* Inline booking-proposal card — rendered above message stream
            when a negotiating PostponeRequest exists. Same data the
            old PostponePanel used to show, restyled per handoff. */}
        {proposal && proposal.status === "negotiating" && thread.bookingId && (
          <BookingProposalCard
            proposal={proposal}
            bookingId={thread.bookingId}
            viewerUserId={thread.viewerUserId}
            onProposeAnother={() => setShowProposeDialog(true)}
          />
        )}

        {messages.length === 0 ? (
          <p className="thai text-center text-[12px] text-ink-mute font-medium pt-8">
            ยังไม่มีข้อความ ส่งข้อความแรกเพื่อเริ่มต้นการสนทนา
          </p>
        ) : (
          messages.map((m, i) => {
            const divider = dayDividerFor(m, i > 0 ? messages[i - 1]! : null);
            return (
              <div key={m.id}>
                {divider && <DayDivider label={divider} />}
                {m.kind === "system" ? (
                  <SystemMessage message={m} />
                ) : (
                  <Bubble
                    m={m}
                    mine={isMine(m)}
                    counterpartyName={counterparty.displayName}
                    counterpartyAvatarUrl={counterparty.avatarUrl}
                    onReport={() => setReportingMessageId(m.id)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Composer / closed banner */}
      {closed ? (
        <div className="border-t border-[rgba(85,65,139,0.08)] bg-grape-soft/30 px-5 py-4 flex items-center gap-3 shrink-0">
          <Lock size={16} className="text-ink-mute shrink-0" />
          <p className="thai text-[12px] text-ink-soft font-medium">
            คลาสนี้ได้รับการเลื่อน/ยกเลิก — แชทปิดการสนทนา
          </p>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit((values) => send.mutate(values))}
          className="border-t border-[rgba(85,65,139,0.08)] bg-white px-4 py-3 shrink-0 space-y-2"
        >
          {bypassWarning && (
            <div className="flex items-start gap-2 text-[11px] text-accent-800 bg-accent-500/15 border border-accent-500/30 rounded-2xl px-3 py-2">
              <AlertTriangle size={14} className="text-accent-700 mt-0.5 shrink-0" />
              <span className="thai">
                ข้อความของคุณดูเหมือนจะมีช่องทางติดต่อนอกแพลตฟอร์ม (เช่น Line / เบอร์โทร)
                ระบบจะกรองอัตโนมัติเพื่อรักษาความปลอดภัยของเงินที่พักไว้
              </span>
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-0.5">
              {[
                { Ic: Paperclip, label: "แนบไฟล์" },
                { Ic: ImageIcon, label: "แนบรูป" },
                { Ic: Smile, label: "อิโมจิ" },
              ].map(({ Ic, label }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  aria-label={label}
                  title={`${label} (เร็ว ๆ นี้)`}
                  className="grid place-items-center w-9 h-9 rounded-lg text-ink-mute hover:bg-grape-soft/60 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Ic className="w-4 h-4" />
                </button>
              ))}
            </div>
            <div className="flex-1 rounded-2xl px-3.5 py-2.5 bg-grape-soft/40 border border-[rgba(85,65,139,0.08)]">
              <textarea
                rows={1}
                placeholder="พิมพ์ข้อความ… (ห้ามแลกเบอร์/Line — ระบบจะซ่อนให้อัตโนมัติ)"
                className="thai w-full text-[13.5px] outline-none resize-none bg-transparent leading-relaxed text-ink placeholder:text-ink-mute max-h-32"
                {...form.register("body")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (form.formState.isValid && !send.isPending) {
                      form.handleSubmit((v) => send.mutate(v))();
                    }
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!form.formState.isValid || send.isPending}
              aria-label="ส่งข้อความ"
              className="grid place-items-center w-10 h-10 rounded-xl bg-violet-500 text-white shadow-md shadow-violet-500/20 hover:bg-violet-600 disabled:bg-grape-soft disabled:text-ink-mute disabled:cursor-not-allowed transition"
            >
              {send.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <p className="thai text-[10px] px-1 text-ink-mute">
            🔒 ทุกข้อความถูกเข้ารหัสและตรวจ bypass อัตโนมัติ · กด Enter เพื่อส่ง
          </p>
          {send.error && (
            <p className="thai text-[11px] text-rose-600 font-medium">
              {send.error.message}
            </p>
          )}
        </form>
      )}

      {reportingMessageId && (
        <ReportDialog
          targetType="chat_message"
          targetId={reportingMessageId}
          onClose={() => setReportingMessageId(null)}
        />
      )}

      {showProposeDialog && booking && (
        <ProposeSlotDialog
          bookingId={booking.id}
          tutorId={booking.tutorId}
          onClose={() => setShowProposeDialog(false)}
          onProposed={() => {
            setShowProposeDialog(false);
            queryClient.invalidateQueries({
              queryKey: ["chat", "proposal", thread.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["bookings", "byId", thread.bookingId],
            });
          }}
        />
      )}
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Sub-components (inlined to keep the file count down; tightly coupled to
// the conversation pane's data flow).
// ───────────────────────────────────────────────────────────────────────

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2" role="separator">
      <div className="flex-1 h-px bg-[rgba(85,65,139,0.12)]" />
      <span className="thai text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-grape-soft text-grape-deep">
        {label}
      </span>
      <div className="flex-1 h-px bg-[rgba(85,65,139,0.12)]" />
    </div>
  );
}

function Bubble({
  m,
  mine,
  counterpartyName,
  counterpartyAvatarUrl,
  onReport,
}: {
  m: ChatMessage;
  mine: boolean;
  counterpartyName: string;
  counterpartyAvatarUrl?: string;
  onReport: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex items-end gap-2",
        mine ? "justify-end" : "justify-start",
      )}
    >
      {!mine && (
        <span className="shrink-0">
          {counterpartyAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={counterpartyAvatarUrl}
              alt={counterpartyName}
              className="w-7 h-7 rounded-full object-cover bg-grape-soft"
            />
          ) : (
            <span className="w-7 h-7 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center">
              {initialsOf(counterpartyName)}
            </span>
          )}
        </span>
      )}
      <div className={cn("flex flex-col max-w-[70%]", mine ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-3.5 py-2.5 text-[13.5px] leading-relaxed",
            mine
              ? "bg-violet-500 text-white rounded-[18px] rounded-br-[4px]"
              : "bg-white text-ink border border-[rgba(85,65,139,0.1)] rounded-[18px] rounded-bl-[4px]",
          )}
        >
          {m.redacted ? (
            <span className="inline-flex items-center gap-1 thai">
              <span className="thai">{m.body}</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-taupe-soft text-taupe-deep border border-dashed border-rosy-taupe">
                🔒 ถูกซ่อน
              </span>
            </span>
          ) : (
            <p className="thai whitespace-pre-wrap break-words">{m.body}</p>
          )}
        </div>
        <p
          className={cn(
            "thai text-[10px] mt-1 px-1",
            mine ? "text-ink-mute" : "text-ink-mute",
          )}
        >
          <span className="num">{formatTime(m.createdAt)}</span>
          {mine && <span className="ml-1 text-violet-500">· ส่งแล้ว</span>}
        </p>
      </div>
      {!mine && (
        <button
          type="button"
          onClick={onReport}
          aria-label="รายงานข้อความนี้"
          className="shrink-0 text-ink-mute/40 hover:text-rose-600 transition opacity-0 group-hover:opacity-100"
        >
          <Flag size={14} />
        </button>
      )}
    </motion.div>
  );
}

function SystemMessage({ message }: { message: ChatMessage }) {
  const url = extractUrl(message.body);
  if (url) {
    // FR-TH-17: Meet-link card. Centered, brand-tinted, prominent CTA.
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        <div className="w-full max-w-md bg-violet-500/8 border border-violet-300/30 rounded-2xl px-5 py-4 space-y-3">
          <p className="thai text-[13px] font-medium text-grape-deep whitespace-pre-wrap leading-relaxed">
            {stripUrlLine(message.body)}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="thai inline-flex w-full items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-[13px] font-bold px-4 py-2.5 rounded-xl transition"
          >
            <Video size={16} strokeWidth={2.2} />
            เข้าห้องเรียน
          </a>
          <p className="thai text-[10px] text-ink-mute text-center font-medium num">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </motion.div>
    );
  }
  // Plain system breadcrumb (postpone resolutions etc.). Single neutral
  // tone per V1 scope — tone variants (success/info/warn) require a new
  // schema column and were deliberately deferred.
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center"
    >
      <div className="max-w-[85%] text-center bg-grape-soft/70 border border-[rgba(85,65,139,0.12)] rounded-2xl px-4 py-2 thai text-[11px] font-medium text-grape-deep whitespace-pre-wrap">
        {message.body}
      </div>
    </motion.div>
  );
}

function BookingProposalCard({
  proposal,
  bookingId,
  viewerUserId,
  onProposeAnother,
}: {
  proposal: ChatBookingProposal;
  bookingId: string;
  viewerUserId: string;
  onProposeAnother: () => void;
}) {
  const viewerIsInitiator = proposal.fromUserId === viewerUserId;
  const hasProposal = !!proposal.proposedAt;

  // Invalidate every cache that reflects negotiation state so the card
  // disappears (or reflects new state) immediately after accept/reject.
  const invalidateKeys = [
    ["bookings", "byId", bookingId],
    ["chat", "proposal"],
    ["chat", "threads"],
    ["chat", "messages"],
  ] as const;

  const confirm = useMutationWithToast({
    mutationFn: () => createApiClient().bookings.postpone.confirm(bookingId),
    successMessage: "ยอมรับเวลาใหม่แล้ว — สร้างการจองใหม่เรียบร้อย",
    invalidateKeys,
  });

  const cancel = useMutationWithToast({
    mutationFn: () => createApiClient().bookings.postpone.cancel(bookingId),
    successMessage: "ปิดการเจรจาแล้ว",
    invalidateKeys,
  });

  const dateLabel = proposal.proposedAt
    ? new Date(proposal.proposedAt).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "รอเสนอเวลา";
  const timeLabel = proposal.proposedAt
    ? formatTime(proposal.proposedAt)
    : "—";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center my-2"
    >
      <div className="rounded-2xl p-4 max-w-[440px] w-full bg-gradient-to-br from-[rgba(125,128,218,0.18)] to-white border border-violet-300/30 shadow-md">
        <header className="flex items-center gap-2 mb-3">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-violet-500 text-white shrink-0">
            <Calendar size={16} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="thai text-[10.5px] font-bold uppercase tracking-wider text-violet-500">
              เสนอเวลาเรียน
            </p>
            <p className="thai text-[11px] text-ink-mute truncate">
              โดย {proposal.fromDisplayName}
            </p>
          </div>
          <span className="thai text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-500/25 text-accent-700 shrink-0">
            ● รอตอบรับ
          </span>
        </header>

        <div className="rounded-xl p-3 mb-3 bg-grape-soft">
          <p className="thai text-[14px] font-bold text-grape-deep">
            {dateLabel}
          </p>
          <p className="thai text-[12.5px] mt-0.5 text-ink-soft num">
            {timeLabel} · {proposal.durationMinutes} นาที
          </p>
        </div>

        <p className="thai text-[12.5px] font-bold mb-1 text-ink">
          📚 {proposal.subject}
        </p>
        {proposal.note && (
          <p className="thai text-[11.5px] leading-relaxed mb-3 text-ink-soft whitespace-pre-wrap">
            {proposal.note}
          </p>
        )}

        {/* Action row. Mirrors the original PostponePanel state machine:
            initiator can re-propose; non-initiator with a concrete
            proposal can accept; both sides can reject. */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-[rgba(85,65,139,0.16)]">
          <button
            type="button"
            onClick={onProposeAnother}
            disabled={!viewerIsInitiator && hasProposal}
            className={cn(
              "thai text-[12px] font-semibold px-3 py-2 rounded-lg border border-grape-soft transition",
              !viewerIsInitiator && hasProposal
                ? "text-ink-mute/50 cursor-not-allowed"
                : "text-ink-soft hover:bg-grape-soft/40",
            )}
          >
            เสนอเวลาอื่น
          </button>
          <button
            type="button"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
            className="thai text-[12px] font-semibold px-3 py-2 rounded-lg text-taupe-deep hover:bg-taupe-soft/60 disabled:opacity-60 transition"
          >
            {cancel.isPending ? "กำลังปิด…" : "ปฏิเสธ"}
          </button>
          <span className="flex-1" />
          {!viewerIsInitiator && hasProposal && (
            <button
              type="button"
              onClick={() => confirm.mutate()}
              disabled={confirm.isPending}
              className="thai text-[13px] font-bold px-5 py-2 rounded-lg bg-violet-500 text-white shadow-md hover:bg-violet-600 disabled:opacity-60 transition"
            >
              {confirm.isPending ? "กำลังยืนยัน…" : "ตอบรับ"}
            </button>
          )}
        </div>
        {(confirm.error || cancel.error) && (
          <p className="thai text-[11px] text-rose-600 font-medium mt-2">
            {(confirm.error ?? cancel.error)?.message}
          </p>
        )}
      </div>
    </motion.div>
  );
}
