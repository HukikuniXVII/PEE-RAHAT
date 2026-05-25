"use client";

import type { InviteSummaryDto } from "@peerahat/types";
import { Button } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  summary: InviteSummaryDto;
  isAuthed: boolean;
}

export function InviteLanding({ summary, isAuthed }: Props) {
  const router = useRouter();
  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);

  const accept = useMutation({
    mutationFn: () => createApiClient().invites.accept(summary.inviteCode),
    onSuccess: () => {
      // Typed routes require a known literal; the bookings-by-id path
      // isn't enumerated yet so a string cast keeps this navigation honest
      // without disabling the rest of the typed-routes guarantees.
      router.push(`/bookings/${summary.bookingId}` as never);
    },
  });

  const decline = useMutation({
    mutationFn: () =>
      createApiClient().invites.decline(summary.inviteCode, {
        reason: declineReason.trim() || undefined,
      }),
    onSuccess: () => router.push("/"),
  });

  const errorMessage =
    (accept.error as Error | null)?.message ??
    (decline.error as Error | null)?.message ??
    null;
  const scheduledDate = new Date(summary.scheduledAt);
  const expiresDate = new Date(summary.inviteExpiresAt);
  const expired = expiresDate < new Date();
  const seatsLeft = summary.capacity - summary.acceptedCount;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-500">
          คุณได้รับเชิญเข้าร่วม
        </p>
        <h1 className="text-3xl font-bold text-violet-700 thai">
          คลาสกลุ่ม {summary.subject}
        </h1>
        <p className="text-sm text-neutral-500 thai">
          จัดโดย {summary.host.displayName}
        </p>
      </header>

      <section className="bg-white rounded-[32px] border border-violet-100 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-4">
          {summary.tutor.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={summary.tutor.avatarUrl}
              alt={summary.tutor.displayName}
              className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-xl font-black text-slate-400">
              {summary.tutor.displayName.slice(0, 1)}
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-mute">
              ติวเตอร์
            </p>
            <Link
              href={`/tutors/${summary.tutor.tutorId}`}
              className="text-lg font-bold text-grape-deep hover:underline"
            >
              พี่ {summary.tutor.displayName}
            </Link>
            <p className="text-xs text-slate-500 thai">
              {summary.tutor.faculty} • {summary.tutor.university}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm thai">
          <Detail
            icon={<Calendar size={16} />}
            label="วันเวลา"
            value={format(scheduledDate, "d MMM yyyy HH:mm")}
          />
          <Detail
            icon={<Clock size={16} />}
            label="ระยะเวลา"
            value={`${summary.durationMinutes} นาที`}
          />
          <Detail
            icon={<Users size={16} />}
            label="ที่นั่ง"
            value={`${summary.acceptedCount}/${summary.capacity} คน (เหลือ ${seatsLeft})`}
          />
          <Detail
            icon={<GraduationCap size={16} />}
            label="ค่าเรียนต่อคน"
            value={`฿${summary.amountThb.toLocaleString()}`}
          />
        </div>

        {!expired && summary.groupStatus === "forming" ? (
          <p className="text-xs text-ink-mute text-center">
            คำเชิญหมดอายุ {format(expiresDate, "d MMM yyyy HH:mm")}
          </p>
        ) : null}

        <hr className="border-violet-100" />

        {summary.groupStatus !== "forming" ? (
          <Banner
            tone="info"
            title="คำเชิญนี้ปิดรับแล้ว"
            body="กลุ่มได้ผ่านขั้นตอนการตอบรับไปแล้ว — สถานะปัจจุบัน: tutor_review / confirmed / failed"
          />
        ) : expired ? (
          <Banner
            tone="warn"
            title="คำเชิญหมดอายุ"
            body="ติดต่อผู้เชิญเพื่อให้เปิดการเชิญใหม่ หรือสร้างคลาสกลุ่มของคุณเอง"
          />
        ) : !isAuthed ? (
          <div className="space-y-3">
            <Banner
              tone="info"
              title="กรุณาเข้าสู่ระบบเพื่อตอบรับ"
              body="ตอบรับ / ปฏิเสธคำเชิญต้องผ่านการยืนยันตัวตนก่อน"
            />
            <Link
              href={
                `/login?returnTo=${encodeURIComponent(
                  `/invite/${summary.inviteCode}`,
                )}` as never
              }
              className="inline-flex w-full items-center justify-center h-12 px-6 rounded-2xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors"
            >
              เข้าสู่ระบบ / สมัครสมาชิก
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={accept.isPending || decline.isPending}
                onClick={() => setShowDecline((v) => !v)}
              >
                ปฏิเสธ
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={accept.isPending || decline.isPending}
                onClick={() => accept.mutate()}
              >
                {accept.isPending ? "กำลังตอบรับ…" : "ตอบรับคำเชิญ"}
              </Button>
            </div>
            {showDecline && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-widest text-ink-mute">
                  เหตุผล (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="เช่น ติดธุระ ไม่ว่างวันนั้น"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="w-full"
                  disabled={decline.isPending}
                  onClick={() => decline.mutate()}
                >
                  {decline.isPending ? "กำลังส่ง…" : "ยืนยันปฏิเสธ"}
                </Button>
              </div>
            )}
            {accept.isSuccess && (
              <p className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 size={16} />
                ตอบรับเรียบร้อย — กำลังเปลี่ยนหน้า…
              </p>
            )}
            {errorMessage && (
              <p className="text-sm text-rose-600 font-medium text-center">
                {errorMessage}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-violet-50/40 border border-violet-100">
      <span className="text-violet-500 mt-0.5">{icon}</span>
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
          {label}
        </p>
        <p className="text-sm font-semibold text-grape-deep">{value}</p>
      </div>
    </div>
  );
}

function Banner({
  tone,
  title,
  body,
}: {
  tone: "info" | "warn";
  title: string;
  body: string;
}) {
  const styles =
    tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-indigo-50 border-indigo-100 text-indigo-900";
  return (
    <div className={`p-4 rounded-2xl border ${styles} space-y-1`}>
      <p className="text-sm font-bold thai">{title}</p>
      <p className="text-xs thai">{body}</p>
    </div>
  );
}
