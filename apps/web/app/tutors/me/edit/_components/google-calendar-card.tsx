"use client";

import type { Tutor } from "@peerahat/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Link2,
  Unlink2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

interface Props {
  tutor: Tutor;
}

/**
 * FR-TH-17 rev3: tutor's Google connection panel on /tutors/me/edit.
 * Shows the connected Gmail (or a connect CTA), kicks off the OAuth
 * dance, and surfaces the callback-redirect status via URL params.
 *
 * Required for search visibility — TutorsService.search filters out
 * tutors with no refresh_token — so the panel doubles as the unblock
 * message when a tutor wonders why they're not appearing in /tutors.
 */
export function GoogleCalendarCard({ tutor }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Live status query so disconnect + reconnect flip the UI without
  // a full page reload.
  const statusQuery = useQuery({
    queryKey: ["auth", "google", "status"],
    queryFn: () => createApiClient().auth.googleStatus(),
    // tutor.googleConnected is the SSR hint; status() carries the email.
    initialData: tutor.googleConnected
      ? { connected: true }
      : { connected: false },
  });

  // Read the callback-redirect query params once on mount and clear
  // them so a refresh doesn't re-toast.
  useEffect(() => {
    const status = searchParams.get("google");
    if (!status) return;
    if (status === "connected") {
      const email = searchParams.get("email");
      toast.success(
        email ? `เชื่อมต่อ Google เรียบร้อย (${email})` : "เชื่อมต่อ Google เรียบร้อย",
      );
      queryClient.invalidateQueries({ queryKey: ["auth", "google", "status"] });
    } else if (status === "denied") {
      toast.error("ผู้ใช้ปฏิเสธการเชื่อมต่อ Google");
    } else if (status === "failed") {
      toast.error(
        `เชื่อมต่อ Google ไม่สำเร็จ: ${searchParams.get("reason") ?? "unknown"}`,
      );
    }
    const clean = new URLSearchParams(searchParams.toString());
    clean.delete("google");
    clean.delete("email");
    clean.delete("reason");
    router.replace(
      clean.toString() ? `?${clean.toString()}` : "/tutors/me/edit",
      { scroll: false },
    );
  }, [searchParams, router, queryClient]);

  const connect = useMutation({
    mutationFn: () => createApiClient().auth.googleConnect(),
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
    onError: (e) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => createApiClient().auth.googleDisconnect(),
    onSuccess: () => {
      toast.success("ยกเลิกการเชื่อมต่อแล้ว");
      queryClient.invalidateQueries({ queryKey: ["auth", "google", "status"] });
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const connected = statusQuery.data?.connected ?? false;
  const email = statusQuery.data?.email;

  return (
    <section className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">
            Google Calendar
          </p>
          <h2 className="text-xl font-black text-slate-900">
            เชื่อมต่อ Google Calendar
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md">
            ระบบจะสร้างลิงก์ Google Meet อัตโนมัติบนปฏิทินของพี่ทุกครั้งที่น้องชำระเงินเรียบร้อย
          </p>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full whitespace-nowrap">
            <CheckCircle2 size={12} />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded-full whitespace-nowrap">
            <AlertTriangle size={12} />
            Required
          </span>
        )}
      </header>

      {connected ? (
        <div className="space-y-4">
          {email && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Connected account
              </p>
              <p className="text-sm font-bold text-slate-800 break-all">{email}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-all"
            >
              {connect.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Link2 size={14} />
              )}
              เปลี่ยนบัญชี
            </button>
            <button
              type="button"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-all"
            >
              {disconnect.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Unlink2 size={14} />
              )}
              ยกเลิกการเชื่อมต่อ
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle
              size={16}
              className="text-amber-500 shrink-0 mt-0.5"
            />
            <p className="text-xs text-amber-700 leading-relaxed">
              โปรไฟล์ของพี่จะ <strong>ไม่ปรากฏในผลค้นหา</strong> จนกว่าจะเชื่อมต่อ Google Calendar
              เพื่อให้ระบบสามารถสร้างลิงก์ห้องเรียนได้
            </p>
          </div>
          <button
            type="button"
            onClick={() => connect.mutate()}
            disabled={connect.isPending}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {connect.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Link2 size={14} />
            )}
            เชื่อมต่อ Google Calendar
          </button>
        </div>
      )}
    </section>
  );
}
