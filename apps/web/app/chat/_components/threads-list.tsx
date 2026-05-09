"use client";

import type { ChatThread } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, ShieldCheck, User } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initialThreads: ChatThread[];
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

export function ThreadsList({ initialThreads }: Props) {
  const { data } = useQuery({
    queryKey: ["chat", "threads"],
    queryFn: () => createApiClient().chat.threads(),
    initialData: initialThreads,
    refetchInterval: 30_000,
  });
  const threads = data ?? initialThreads;

  if (threads.length === 0) {
    return (
      <div className="bg-white p-12 rounded-[32px] border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
          <MessagesSquare size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">
          ยังไม่มีบทสนทนา
        </h3>
        <p className="text-sm text-slate-500">
          เริ่มสนทนาด้วยการเข้าไปที่โปรไฟล์พี่ติว แล้วกดปุ่ม Chat
        </p>
        <Link
          href="/tutors"
          className="inline-block px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all"
        >
          เริ่มต้นที่ Tutor Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => {
        const isStudentSide = thread.counterparty.role === "tutor";
        return (
          <Link
            key={thread.id}
            href={`/chat/thread/${thread.id}` as Route}
            className="block"
          >
            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all shadow-sm">
              {thread.counterparty.avatarUrl ? (
                <img
                  src={thread.counterparty.avatarUrl}
                  alt={thread.counterparty.displayName}
                  className="w-12 h-12 rounded-2xl object-cover bg-slate-50"
                />
              ) : (
                <span className="w-12 h-12 rounded-2xl bg-indigo-600 text-white text-sm font-black flex items-center justify-center">
                  {initialsOf(thread.counterparty.displayName)}
                </span>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {thread.counterparty.displayName}
                  </h3>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0">
                    {formatRelative(thread.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                      isStudentSide
                        ? "bg-indigo-50 text-indigo-600"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {isStudentSide ? "Tutor" : "Student"}
                  </span>
                  <p className="text-xs text-slate-500 truncate flex-1">
                    {thread.lastMessagePreview || "ยังไม่มีข้อความ"}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      <p className="pt-4 text-[10px] text-slate-400 text-center font-medium flex items-center justify-center gap-1.5">
        <ShieldCheck size={12} className="text-emerald-500" />
        ทุกข้อความถูกกรองช่องทางติดต่อนอกแพลตฟอร์มอัตโนมัติ (FR-PM-08)
      </p>
    </div>
  );
}
