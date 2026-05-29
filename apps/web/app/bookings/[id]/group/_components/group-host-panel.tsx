"use client";

import type {
  Booking,
  BookingParticipant,
} from "@peerahat/types";
import { Button } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Copy,
  Send,
  Users,
} from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  booking: Booking;
  participants: BookingParticipant[];
  shareBaseUrl: string;
}

const STATUS_COPY: Record<BookingParticipant["status"], string> = {
  invited: "รอตอบรับ",
  accepted: "ตอบรับแล้ว",
  declined: "ปฏิเสธ",
  paid: "ชำระแล้ว",
  expired: "หมดเขต",
};

const STATUS_TONE: Record<BookingParticipant["status"], string> = {
  invited: "bg-amber-50 text-amber-700",
  accepted: "bg-blue-50 text-blue-700",
  declined: "bg-rose-50 text-rose-700",
  paid: "bg-emerald-50 text-emerald-700",
  expired: "bg-slate-100 text-slate-500",
};

export function GroupHostPanel({
  booking,
  participants: initialParticipants,
  shareBaseUrl,
}: Props) {
  const queryClient = useQueryClient();
  const [emailsRaw, setEmailsRaw] = useState("");
  const [copied, setCopied] = useState(false);

  // FR-CM-08 rev2: backend fans out ["bookings"] on every roster change
  // (invite added, invitee accepted/declined, tutor approved). No 15s
  // poll needed — refetch fires on the SSE push.
  const participantsQuery = useQuery({
    queryKey: ["bookings", booking.id, "participants"],
    queryFn: () => createApiClient().bookings.participants(booking.id),
    initialData: initialParticipants,
  });

  const invite = useMutation({
    mutationFn: (emails: string[]) =>
      createApiClient().bookings.invite(booking.id, { emails }),
    onSuccess: (next) => {
      queryClient.setQueryData(
        ["bookings", booking.id, "participants"],
        next,
      );
      setEmailsRaw("");
    },
  });

  const extend = useMutation({
    mutationFn: () => createApiClient().bookings.extendInvite(booking.id),
  });

  const inviteUrl = booking.inviteCode
    ? `${shareBaseUrl || ""}/invite/${booking.inviteCode}`
    : "";
  const expiresAt = booking.inviteExpiresAt
    ? new Date(booking.inviteExpiresAt)
    : null;
  const seatsAccepted = participantsQuery.data.filter(
    (p) => p.status === "accepted" || p.status === "paid",
  ).length;
  const errorMessage =
    (invite.error as Error | null)?.message ??
    (extend.error as Error | null)?.message ??
    null;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-500">
          คลาสกลุ่ม
        </p>
        <h1 className="text-3xl font-bold text-violet-700 thai">
          {booking.subject}
        </h1>
        <p className="text-sm text-neutral-500 thai">
          {format(new Date(booking.scheduledAt), "d MMM yyyy HH:mm")} •{" "}
          {booking.durationMinutes} นาที • ที่นั่ง {seatsAccepted}/
          {booking.capacity} คน • รวม ฿
          {booking.amountThb.toLocaleString()} (คุณเป็นคนชำระ)
        </p>
      </header>

      <Section title="สถานะกลุ่ม">
        <GroupStatusBadge status={booking.groupStatus} />
        {expiresAt && booking.groupStatus === "forming" && (
          <p className="text-xs text-ink-mute thai">
            คำเชิญหมดอายุ {format(expiresAt, "d MMM yyyy HH:mm")}
            <button
              type="button"
              onClick={() => extend.mutate()}
              disabled={extend.isPending}
              className="ml-3 underline text-violet-600 disabled:opacity-50"
            >
              ขยายเวลา +24 ชม.
            </button>
          </p>
        )}
      </Section>

      {booking.inviteCode && booking.groupStatus === "forming" && (
        <Section title="ลิงก์เชิญ">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 min-w-0 px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-slate-50"
            />
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  // some browsers / contexts block clipboard
                }
              }}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={14} /> คัดลอกแล้ว
                </>
              ) : (
                <>
                  <Copy size={14} /> คัดลอก
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-ink-mute">
            แชร์ลิงก์นี้กับเพื่อนผ่าน LINE / Messenger / SMS
          </p>
        </Section>
      )}

      <Section
        title="ผู้เข้าร่วม"
        icon={<Users size={16} />}
      >
        <ul className="space-y-2">
          {participantsQuery.data.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100"
            >
              {p.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatarUrl}
                  alt={p.displayName}
                  className="w-10 h-10 rounded-xl object-cover bg-slate-50"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                  {p.displayName.slice(0, 1)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-grape-deep truncate">
                  {p.displayName}
                </p>
                {p.email && (
                  <p className="text-[11px] text-ink-mute truncate">
                    {p.email}
                  </p>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-violet-50 text-violet-700">
                {p.role === "host" ? "Host" : "Invited"}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${STATUS_TONE[p.status]}`}
              >
                {STATUS_COPY[p.status]}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {booking.groupStatus === "forming" &&
        seatsAccepted < booking.capacity && (
          <Section title="เชิญเพิ่ม">
            <textarea
              rows={2}
              placeholder="email1@example.com, email2@example.com"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={emailsRaw}
              onChange={(e) => setEmailsRaw(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={invite.isPending || !emailsRaw.trim()}
              onClick={() => {
                const emails = emailsRaw
                  .split(/[\s,;]+/)
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0);
                if (emails.length > 0) invite.mutate(emails);
              }}
            >
              <Send size={14} />
              {invite.isPending ? "กำลังเชิญ…" : "ส่งคำเชิญ"}
            </Button>
            {errorMessage && (
              <p className="text-sm text-rose-600 font-medium text-center">
                {errorMessage}
              </p>
            )}
          </Section>
        )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white p-6 rounded-[28px] border border-violet-100 shadow-sm space-y-3">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-500 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function GroupStatusBadge({
  status,
}: {
  status?: Booking["groupStatus"];
}) {
  if (!status) return null;
  const styles: Record<NonNullable<Booking["groupStatus"]>, string> = {
    forming: "bg-amber-50 text-amber-700",
    tutor_review: "bg-blue-50 text-blue-700",
    confirmed: "bg-emerald-50 text-emerald-700",
    failed: "bg-rose-50 text-rose-700",
  };
  const copy: Record<NonNullable<Booking["groupStatus"]>, string> = {
    forming: "กำลังรวมกลุ่ม",
    tutor_review: "รอติวเตอร์อนุมัติ",
    confirmed: "ยืนยันแล้ว",
    failed: "ไม่สำเร็จ",
  };
  return (
    <div className="flex items-center gap-2">
      <Calendar size={14} className="text-violet-500" />
      <span
        className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${styles[status]}`}
      >
        {copy[status]}
      </span>
    </div>
  );
}
