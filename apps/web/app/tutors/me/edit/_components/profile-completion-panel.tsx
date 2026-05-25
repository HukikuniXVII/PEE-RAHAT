"use client";

import type { Tutor } from "@peerahat/types";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  PartyPopper,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";

interface Props {
  tutor: Tutor;
}

type MilestoneState = "done" | "pending_review" | "action_needed";

interface Milestone {
  key: string;
  label: string;
  description: string;
  state: MilestoneState;
  // Either a Link href or an in-page action key. Action keys are
  // intercepted by the parent (scroll-to a section) but we keep the
  // panel agnostic for now and always render a Link.
  href?: Route;
  // Optional in-page action triggered instead of navigating; we render
  // a <button> when present.
  onAction?: () => void;
  actionLabel?: string;
}

/**
 * FR-TH-04 gamified onboarding-completion checklist on /tutors/me/edit.
 * Surfaces the five gates a tutor must clear to be searchable + bookable:
 *
 *   1. Profile bio          — implicit (this page only renders when the
 *                             tutor profile exists)
 *   2. KYC verification     — admin-approved Verified Badge
 *   3. Bank account         — required for payout, hides tutor in search
 *   4. Google Calendar      — required for FR-TH-17 Meet generation
 *   5. Intro video          — required for FR-TH-04 visibility
 *
 * Mirrors the visibility logic on the server (tutors.service.search WHERE
 * clause). When all five are done the panel collapses to a single
 * success chip so the dashboard isn't cluttered for verified tutors.
 */
export function ProfileCompletionPanel({ tutor }: Props) {
  // Bank status lives behind a separate endpoint; the existing
  // BankStatusBanner already fetches it under the same query key, so
  // useQuery here just reuses the cached result.
  const bank = useQuery({
    queryKey: ["tutors", "me", "bank"],
    queryFn: () => createApiClient().tutors.bank.get(),
  });
  const hasBank = !!bank.data;

  const milestones: Milestone[] = [
    {
      key: "profile",
      label: "ข้อมูลโปรไฟล์",
      description: "ชื่อ มหาวิทยาลัย วิชาที่สอน — ตั้งค่าแล้ว",
      state: "done",
    },
    {
      key: "kyc",
      label: "ยืนยันตัวตน (KYC)",
      description: tutor.isVerified
        ? "ผ่านการยืนยันแล้ว — Verified Badge"
        : "ทีมงานกำลังตรวจสอบเอกสารของคุณ (ภายใน 24 ชม.)",
      state: tutor.isVerified ? "done" : "pending_review",
    },
    {
      key: "bank",
      label: "บัญชีรับเงิน",
      description: hasBank
        ? "พร้อมรับค่าตอบแทน"
        : "ต้องมีเพื่อรับโอนค่าตอบแทนและเปิดการมองเห็น",
      state: hasBank ? "done" : "action_needed",
      href: "/tutors/me/bank" as Route,
      actionLabel: "เพิ่มบัญชี",
    },
    {
      key: "google",
      label: "เชื่อมต่อ Google Calendar",
      description: tutor.googleConnected
        ? "เชื่อมต่อแล้ว — สร้างลิงก์ Google Meet อัตโนมัติ"
        : "ต้องเชื่อมต่อเพื่อให้ระบบสร้าง Google Meet ตอนน้องจองคลาส",
      state: tutor.googleConnected ? "done" : "action_needed",
      onAction: () => {
        document
          .getElementById("google-calendar-section")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      actionLabel: "เชื่อมต่อ",
    },
    {
      key: "video",
      label: "คลิปแนะนำตัว",
      description: tutor.introVideoUrl
        ? "อัปโหลดแล้ว — แสดงบนหน้าโปรไฟล์"
        : "ต้องมีคลิป 1–3 นาที เพื่อเปิดการมองเห็นและการจอง",
      state: tutor.introVideoUrl ? "done" : "action_needed",
      onAction: () => {
        // Same affordance as VideoPendingBanner — drop a `?focus=video`
        // and let the form's effect handle the scroll/focus/flash.
        const url = new URL(window.location.href);
        url.searchParams.set("focus", "video");
        window.history.replaceState(null, "", url.toString());
        const el = document.getElementById("intro-video-input");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      actionLabel: "อัปโหลด",
    },
  ];

  const doneCount = milestones.filter((m) => m.state === "done").length;
  const total = milestones.length;
  const allDone = doneCount === total;

  if (allDone) {
    return (
      <section className="rounded-[40px] border border-emerald-200 bg-emerald-50/70 shadow-sm p-5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-700 inline-flex items-center justify-center shrink-0">
          <PartyPopper size={20} />
        </span>
        <div className="min-w-0">
          <p className="thai text-sm font-bold text-emerald-800">
            ✓ โปรไฟล์ของคุณพร้อมรับงานแล้ว!
          </p>
          <p className="thai text-[11.5px] text-emerald-700/80">
            ครบทั้ง {total}/{total} ขั้นตอน — น้องๆ ค้นเจอคุณได้แล้ว
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[40px] border border-violet-100 bg-white shadow-sm p-6 md:p-8 space-y-5">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-dusty-grape">
              Profile Completion
            </p>
            <h2 className="thai text-xl font-black text-grape-deep">
              เปิดการมองเห็นโปรไฟล์ของคุณ
            </h2>
          </div>
          <span className="tabular-nums text-[12px] font-bold px-3 py-1.5 rounded-full bg-grape-soft text-grape-deep whitespace-nowrap">
            {doneCount} / {total} ขั้นตอน
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-grape-soft overflow-hidden">
          <div
            className="h-full bg-dusty-grape transition-all duration-500"
            style={{ width: `${(doneCount / total) * 100}%` }}
          />
        </div>
      </header>

      <ul className="space-y-2">
        {milestones.map((m) => (
          <MilestoneRow key={m.key} milestone={m} />
        ))}
      </ul>
    </section>
  );
}

function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const { state, label, description, href, onAction, actionLabel } = milestone;

  const Icon =
    state === "done"
      ? CheckCircle2
      : state === "pending_review"
        ? Clock
        : Lock;

  const iconClass =
    state === "done"
      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
      : state === "pending_review"
        ? "bg-amber-50 text-amber-600 border-amber-200"
        : "bg-rose-50 text-rose-500 border-rose-200";

  const showAction = state === "action_needed" && (href || onAction);

  const Body = (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-violet-100 bg-white hover:border-violet-200 transition-colors">
      <span
        className={`w-9 h-9 rounded-xl border inline-flex items-center justify-center shrink-0 ${iconClass}`}
      >
        <Icon size={16} strokeWidth={state === "done" ? 2.4 : 2} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="thai text-[13.5px] font-bold text-grape-deep">{label}</p>
        <p className="thai text-[11.5px] text-ink-mute leading-snug">
          {description}
        </p>
      </div>
      {showAction && (
        <span className="thai text-[11.5px] font-bold text-dusty-grape inline-flex items-center gap-0.5 shrink-0">
          {actionLabel}
          <ChevronRight size={13} />
        </span>
      )}
    </div>
  );

  if (state === "action_needed" && href) {
    return (
      <li>
        <Link href={href}>{Body}</Link>
      </li>
    );
  }
  if (state === "action_needed" && onAction) {
    return (
      <li>
        <button
          type="button"
          onClick={onAction}
          className="block w-full text-left"
        >
          {Body}
        </button>
      </li>
    );
  }
  return <li>{Body}</li>;
}
