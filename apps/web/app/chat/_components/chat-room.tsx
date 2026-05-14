"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type ChatMessage,
  type ChatThread,
  detectBypassAttempt,
  sendMessageSchema,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Lock, Send, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createApiClient } from "@/lib/api-client";

import { PostponePanel } from "./postpone-panel";

const composerSchema = sendMessageSchema.pick({ body: true });
type ComposerValues = z.infer<typeof composerSchema>;

interface Props {
  thread: ChatThread;
  initialMessages: ChatMessage[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
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

export function ChatRoom({ thread, initialMessages }: Props) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { counterparty } = thread;

  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", thread.id],
    queryFn: () => createApiClient().chat.messages(thread.id),
    initialData: initialMessages,
    refetchInterval: 5000,
  });
  const messages = messagesQuery.data ?? initialMessages;

  // FR-TH-12: fetch the linked booking (with active postpone) so the panel
  // can render the negotiation state above the messages.
  const bookingQuery = useQuery({
    queryKey: ["bookings", "byId", thread.bookingId],
    queryFn: () => createApiClient().bookings.byId(thread.bookingId!),
    enabled: !!thread.bookingId,
    refetchInterval: 5000,
  });
  const booking = bookingQuery.data;
  const negotiating =
    booking?.postponeRequest?.status === "negotiating"
      ? booking.postponeRequest
      : null;
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
    <div className="max-w-3xl mx-auto bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[80vh]">
      <header className="px-6 py-5 border-b border-slate-100 flex items-center gap-4">
        {counterparty.avatarUrl ? (
          <img
            src={counterparty.avatarUrl}
            alt={counterparty.displayName}
            className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 object-cover"
          />
        ) : (
          <span className="w-12 h-12 rounded-2xl bg-indigo-600 text-white text-sm font-black flex items-center justify-center">
            {initialsOf(counterparty.displayName)}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 truncate">
            {counterparty.displayName}
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
            {counterparty.role === "tutor" ? "Tutor" : "Student"}
          </p>
          {counterparty.subtitle && (
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {counterparty.subtitle}
            </p>
          )}
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">
          <ShieldCheck size={12} />
          Filtered chat
        </span>
      </header>

      {booking && negotiating && (
        <PostponePanel booking={booking} request={negotiating} />
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-3 bg-slate-50/30"
      >
        {messages.length === 0 ? (
          <p className="text-center text-xs text-slate-400 font-medium pt-8">
            ยังไม่มีข้อความ ส่งข้อความแรกเพื่อเริ่มต้นการสนทนา
          </p>
        ) : (
          messages.map((m) => {
            if (m.kind === "system") {
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <div className="max-w-[85%] text-center bg-amber-50/60 border border-amber-100 rounded-2xl px-4 py-2 text-[11px] font-medium text-amber-800 whitespace-pre-wrap">
                    {m.body}
                  </div>
                </motion.div>
              );
            }
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  isMine(m) ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                    isMine(m)
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-white border border-slate-100 text-slate-700 rounded-bl-md",
                  )}
                >
                  {m.redacted && (
                    <p
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1",
                        isMine(m) ? "text-indigo-200" : "text-rose-500",
                      )}
                    >
                      <AlertTriangle size={10} />
                      Filtered
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1 font-medium",
                      isMine(m) ? "text-indigo-200" : "text-slate-400",
                    )}
                  >
                    {formatTime(m.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {closed ? (
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-5 flex items-center gap-3">
          <Lock size={16} className="text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500 font-medium">
            คลาสนี้ได้รับการเลื่อนแล้ว / ยกเลิกแล้ว — แชทปิดการสนทนา
          </p>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit((values) => send.mutate(values))}
          className="border-t border-slate-100 bg-white p-4 space-y-2"
        >
          {bypassWarning && (
            <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                ข้อความของคุณดูเหมือนจะมีช่องทางติดต่อนอกแพลตฟอร์ม (เช่น Line / เบอร์โทร)
                ระบบจะกรองอัตโนมัติเพื่อรักษาความปลอดภัยของ Escrow
              </span>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <textarea
              placeholder="พิมพ์ข้อความ..."
              rows={1}
              className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none min-h-[44px] max-h-32"
              {...form.register("body")}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!form.formState.isValid || send.isPending}
              className="shrink-0 w-12 h-12"
            >
              <Send size={18} />
            </Button>
          </div>
          {send.error && (
            <p className="text-[11px] text-rose-600 font-medium">
              {send.error.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
