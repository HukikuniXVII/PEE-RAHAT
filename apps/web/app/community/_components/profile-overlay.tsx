"use client";

import {
  type StudentMiniProfile,
  type TutorMiniProfile,
  type Subject,
  SUBJECT_LABELS,
} from "@peerahat/types";
import { Dialog, DialogContent } from "@peerahat/ui";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Loader2, Star, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";

import { Avatar } from "./avatar";

interface Props {
  userId: string | null;
  onClose: () => void;
  /**
   * Hint from the trigger so the overlay picks the correct width and
   * header-band gradient before data arrives — eliminates layout shift
   * AND keeps the student card at its narrower handoff spec (440px).
   * Optional: callers without context fall back to the tutor-width
   * variant, which fits both bodies without overflow.
   */
  expectedMode?: "tutor" | "student";
}

// Conservative ISO → relative-Thai formatter for the "joined N ago" line.
function relativeJoined(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 30) return `${Math.max(1, days)} วัน`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} เดือน`;
  return `${Math.floor(months / 12)} ปี`;
}

function relativeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins} นาที`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ชม.`;
  const days = Math.round(hours / 24);
  return `${days} วัน`;
}

function subjectLabel(code: string): string {
  return SUBJECT_LABELS[code as Subject] ?? code;
}

export function ProfileOverlay({ userId, onClose, expectedMode }: Props) {
  const open = !!userId;

  // Cache per-user so re-opens within the session are instant.
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["community", "profile", userId],
    queryFn: () => createApiClient().community.profile(userId!),
    enabled: open,
    staleTime: 60_000,
  });

  // Pick width + initial band variant from expectedMode when present, so
  // the card opens at the right size and the gradient direction matches
  // the eventual body. Falls back to tutor (520px) which fits both
  // variants without overflow.
  const mode = data?.mode ?? expectedMode ?? "tutor";
  const widthClass = mode === "student" ? "max-w-[440px]" : "max-w-[520px]";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={`${widthClass} max-h-[90vh] rounded-2xl border-[rgba(85,65,139,0.08)] shadow-[0_30px_60px_-30px_rgba(85,65,139,0.45)] overflow-hidden flex flex-col p-0`}
      >
        {isError ? (
          <OverlayError
            onClose={onClose}
            onRetry={() => refetch()}
            isRetrying={isFetching}
            variant={mode}
          />
        ) : isLoading || !data ? (
          <OverlaySkeleton onClose={onClose} variant={mode} />
        ) : data.mode === "tutor" ? (
          <TutorBody profile={data} onClose={onClose} />
        ) : (
          <StudentBody profile={data} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shared shell: gradient header band, avatar overlap, close button.
// ─────────────────────────────────────────────────────────────────────

function HeaderBand({
  variant,
  onClose,
}: {
  variant: "tutor" | "student";
  onClose: () => void;
}) {
  // Student band: taupe → violet. Tutor band: violet → taupe. Same
  // gradient stops the handoff specifies; mirrored direction per variant.
  const bg =
    variant === "student"
      ? "linear-gradient(135deg, #BBA0A0 0%, #55418B 130%)"
      : "linear-gradient(135deg, #55418B 0%, #BBA0A0 130%)";
  return (
    <div
      className="relative h-[88px] shrink-0"
      style={{ background: bg }}
    >
      <span
        className="absolute top-[10px] right-[60px] text-white/30 text-xl select-none"
        aria-hidden="true"
      >
        ✦
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิดโปรไฟล์"
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-white"
      >
        <X size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function IdentityBlock({
  name,
  verified,
  avatarUrl,
  subline,
}: {
  name: string;
  verified: boolean;
  avatarUrl: string | null;
  subline: string;
}) {
  return (
    <div className="px-6 pt-4 flex items-start gap-3 relative">
      {/* Avatar straddles the banner/card seam — its 84px outer box
          (76px avatar + 4px white ring) is centered on the bottom edge
          of the 88px header band, so ~half sits on the gradient and
          ~half hangs onto the white card surface. The spacer below
          reserves the horizontal column the absolute avatar occupies
          so the name/subline don't run under it. */}
      <div className="absolute left-6 -top-[42px] z-10">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="w-[76px] h-[76px] rounded-full border-4 border-white object-cover bg-white shadow-[0_8px_20px_-10px_rgba(85,65,139,0.45)]"
          />
        ) : (
          <div className="ring-4 ring-white rounded-full shadow-[0_8px_20px_-10px_rgba(85,65,139,0.45)]">
            <Avatar name={name} size={76} />
          </div>
        )}
      </div>
      {/* Spacer column for the absolutely-positioned avatar above. */}
      <div className="w-[76px] shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 pt-1">
        <h2 className="thai text-[18px] font-bold leading-tight text-grape-deep tracking-tight flex items-center gap-1.5">
          <span className="truncate">{name}</span>
          {verified && (
            <span
              className="text-violet-500 shrink-0"
              aria-label="ยืนยันแล้ว"
              title="ยืนยันแล้ว"
            >
              ✓
            </span>
          )}
        </h2>
        <p className="thai text-[12px] text-ink-soft leading-snug truncate">
          {subline}
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="thai text-[10.5px] font-bold uppercase tracking-wider text-ink-mute mb-2">
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Student variant
// ─────────────────────────────────────────────────────────────────────

function StudentBody({
  profile,
  onClose,
}: {
  profile: StudentMiniProfile;
  onClose: () => void;
}) {
  const { subject, stats, recentPosts, joinedAt } = profile;
  return (
    <>
      <HeaderBand variant="student" onClose={onClose} />
      <div className="flex-1 overflow-y-auto">
        <IdentityBlock
          name={subject.name}
          verified={false}
          avatarUrl={subject.avatarUrl}
          subline="น้องนักเรียน ม.ปลาย · กำลังเตรียม TCAS"
        />

        <div className="px-6 pt-4 pb-6 space-y-5">
          {/* 3-stat strip */}
          <div className="grid grid-cols-3 gap-2">
            <StatCell value={stats.posts} label="โพสต์" />
            <StatCell value={stats.comments} label="ความเห็น" />
            <StatCell value={stats.bookmarks} label="ที่บันทึก" />
          </div>

          {/* Recent posts */}
          {recentPosts.length > 0 && (
            <div>
              <SectionLabel>โพสต์ล่าสุด</SectionLabel>
              <div className="space-y-2">
                {recentPosts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg bg-grape-soft/40 border border-[rgba(85,65,139,0.06)]"
                  >
                    {p.tag && (
                      <span className="thai text-[10.5px] font-semibold text-violet-500">
                        {p.tag}
                      </span>
                    )}
                    <p
                      className="thai text-[12.5px] leading-snug text-ink mt-1"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.body}
                    </p>
                    <p className="thai text-[10.5px] text-ink-mute mt-1">
                      {relativeShort(p.createdAt)} ที่แล้ว
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="thai text-[10.5px] text-ink-mute text-center pt-2">
            🌸 เข้าร่วมเมื่อ {relativeJoined(joinedAt)} ก่อน
          </p>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Tutor variant
// ─────────────────────────────────────────────────────────────────────

function TutorBody({
  profile,
  onClose,
}: {
  profile: TutorMiniProfile;
  onClose: () => void;
}) {
  const {
    subject,
    uniLine,
    stats,
    hourlyRate,
    bio,
    subjectsTaught,
    reviews,
    pastStudentInitials,
    otherStudentsCount,
    topSheet,
    joinedAt,
  } = profile;

  return (
    <>
      <HeaderBand variant="tutor" onClose={onClose} />
      <div className="flex-1 overflow-y-auto">
        <IdentityBlock
          name={subject.name}
          verified={subject.verified}
          avatarUrl={subject.avatarUrl}
          subline={uniLine}
        />

        <div className="px-6 pt-4 pb-6 space-y-5">
          {/* 4-stat strip. responseTime + handle + year + leaderboard rank
              are visible in the V2 handoff but those fields don't exist
              in the DB yet — per scope decision the elements drop out
              rather than show fabricated values. Stat #4 (years on
              platform) is the fallback that's always derivable. */}
          <div className="grid grid-cols-4 gap-2">
            <StatCell
              value={stats.rating.toFixed(2)}
              label="คะแนน"
              accent
              icon={<Star size={11} fill="currentColor" />}
            />
            <StatCell value={stats.hoursTaught} label="ชั่วโมงสอน" />
            <StatCell value={stats.studentsTaught} label="นักเรียน" />
            <StatCell
              value={`${Math.max(1, Math.floor((Date.now() - new Date(joinedAt).getTime()) / (365 * 24 * 60 * 60 * 1000)))}+`}
              label="ปีที่อยู่กับเรา"
            />
          </div>

          {/* Subjects — separated from rate so the layout matches the
              handoff: chips row first, then "อัตราค่าเรียน" gets its own
              labeled section below. */}
          {subjectsTaught.length > 0 && (
            <div>
              <SectionLabel>วิชาที่สอน</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {subjectsTaught.map((s) => (
                  <span
                    key={s}
                    className="thai inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-grape-soft text-grape-deep"
                  >
                    {subjectLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hourly rate — own section with the price right-aligned. */}
          <div>
            <SectionLabel>อัตราค่าเรียน</SectionLabel>
            <div className="flex items-baseline justify-between">
              <span className="thai text-[12.5px] text-ink-soft">
                ค่าเรียนต่อชั่วโมง
              </span>
              <p className="thai text-[16px] text-grape-deep font-bold num">
                ฿{hourlyRate.toLocaleString()}{" "}
                <span className="text-[11.5px] text-ink-soft font-medium">
                  / ชั่วโมง
                </span>
              </p>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <div>
              <SectionLabel>เกี่ยวกับพี่</SectionLabel>
              <p className="thai text-[13px] text-ink leading-relaxed whitespace-pre-line">
                {bio}
              </p>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <SectionLabel>
                รีวิวจากนักเรียน · {stats.totalReviews} รีวิว
              </SectionLabel>
              <div className="space-y-2">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg bg-neutral-50 border border-[rgba(85,65,139,0.06)]"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={r.studentDisplayName} size={26} />
                      <p className="thai text-[11.5px] font-bold text-ink truncate">
                        {r.studentDisplayName}
                      </p>
                      <div className="flex items-center gap-0.5 text-accent-600 ml-auto shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            fill={i < r.rating ? "currentColor" : "none"}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="thai text-[12px] text-ink leading-relaxed mt-1.5 italic">
                      &ldquo;{r.text}&rdquo;
                    </p>
                    <p className="thai text-[10.5px] text-ink-mute mt-1">
                      {relativeShort(r.createdAt)} ที่แล้ว
                    </p>
                  </div>
                ))}
              </div>
              {/* "ดูรีวิวทั้งหมด" CTA. Only renders when the backend
                  populated subject.tutorId (always true for tutor mode);
                  routes to /tutors/[TutorProfile.id]. The full reviews
                  list on that page is the canonical surface. */}
              {subject.tutorId && (
                <Link
                  href={`/tutors/${subject.tutorId}` as Route}
                  className="thai text-[12px] font-semibold text-violet-500 hover:text-violet-600 inline-flex items-center gap-1 mt-3"
                >
                  ดูรีวิวทั้งหมด{" "}
                  <span className="num">{stats.totalReviews}</span> รีวิว
                  <ArrowRight size={12} strokeWidth={2.4} />
                </Link>
              )}
            </div>
          )}

          {/* Past students — initials only (server-side PII strip). The
              Avatar primitive consumes whatever single char we pass; the
              colored chip stays deterministic per initial. */}
          {pastStudentInitials.length > 0 && (
            <div>
              <SectionLabel>นักเรียนที่สอนผ่านมา</SectionLabel>
              <div className="flex items-center gap-3">
                <div className="flex">
                  {pastStudentInitials.map((initial, i) => (
                    <div
                      key={i}
                      className="ring-2 ring-white rounded-full"
                      style={{ marginLeft: i === 0 ? 0 : -8 }}
                    >
                      <Avatar name={initial} size={28} />
                    </div>
                  ))}
                </div>
                {otherStudentsCount > 0 && (
                  <p className="thai text-[11.5px] text-ink-soft">
                    และอีก{" "}
                    <span className="font-bold text-grape-deep">
                      {otherStudentsCount}
                    </span>{" "}
                    คน
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Top sheet — shows rating + reviewCount + soldCount + price,
              matching the screenshot's "★ 4.95 · 42 รีวิว · ขายได้ 186 เล่ม". */}
          {topSheet && (
            <div>
              <SectionLabel>ชีตขายดีของพี่</SectionLabel>
              <div className="p-3 rounded-lg bg-white border border-[rgba(85,65,139,0.08)] flex items-center gap-3">
                <div className="w-10 h-12 rounded bg-gradient-to-b from-accent-100 to-accent-500/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="thai text-[12px] font-bold text-ink truncate">
                    {topSheet.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-ink-mute mt-0.5">
                    <span className="flex items-center gap-0.5 text-accent-600">
                      <Star size={9} fill="currentColor" />
                      <span className="num">{topSheet.rating.toFixed(2)}</span>
                    </span>
                    <span>·</span>
                    <span className="num">
                      {topSheet.reviewCount.toLocaleString()} รีวิว
                    </span>
                    <span>·</span>
                    <span className="num">
                      ขายได้ {topSheet.soldCount.toLocaleString()} เล่ม
                    </span>
                  </div>
                </div>
                <p className="thai text-[13px] font-bold text-grape-deep shrink-0 num">
                  ฿{topSheet.priceThb.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="thai text-[10.5px] text-ink-mute text-center pt-2">
            🛡️ ผ่าน KYC + ทรานสคริปต์ · เข้าร่วมเมื่อ{" "}
            {relativeJoined(joinedAt)} ก่อน
          </p>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shared atoms
// ─────────────────────────────────────────────────────────────────────

function StatCell({
  value,
  label,
  accent,
  icon,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-2 rounded-lg bg-violet-500/5 text-center">
      <p
        className={`num text-[15px] font-bold leading-none flex items-center justify-center gap-1 ${
          accent ? "text-accent-600" : "text-grape-deep"
        }`}
      >
        {icon}
        {value}
      </p>
      <p className="thai text-[10px] text-ink-mute mt-1">{label}</p>
    </div>
  );
}

function OverlaySkeleton({
  onClose,
  variant,
}: {
  onClose: () => void;
  variant: "tutor" | "student";
}) {
  return (
    <>
      <HeaderBand variant={variant} onClose={onClose} />
      <div className="flex-1 flex items-center justify-center py-16">
        <Loader2
          size={24}
          className="animate-spin text-ink-mute"
          aria-label="กำลังโหลดโปรไฟล์"
        />
      </div>
    </>
  );
}

function OverlayError({
  onClose,
  onRetry,
  isRetrying,
  variant,
}: {
  onClose: () => void;
  onRetry: () => void;
  isRetrying: boolean;
  variant: "tutor" | "student";
}) {
  return (
    <>
      <HeaderBand variant={variant} onClose={onClose} />
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
        <AlertCircle size={32} className="text-rose-600" strokeWidth={1.8} />
        <p className="thai text-[14px] font-bold text-grape-deep">
          ดูโปรไฟล์ไม่สำเร็จ
        </p>
        <p className="thai text-[12px] text-ink-soft leading-relaxed max-w-[280px]">
          อาจเป็นเพราะการเชื่อมต่อ หรือผู้ใช้นี้ไม่มีในระบบแล้ว
        </p>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="thai text-[13px] font-bold px-4 py-1.5 rounded-full bg-violet-500 text-white hover:bg-violet-600 disabled:bg-grape-soft disabled:text-ink-mute disabled:cursor-not-allowed transition inline-flex items-center gap-1.5"
          >
            {isRetrying && (
              <Loader2 size={12} className="animate-spin" />
            )}
            ลองอีกครั้ง
          </button>
          <button
            type="button"
            onClick={onClose}
            className="thai text-[13px] font-semibold px-4 py-1.5 rounded-full text-ink-soft hover:bg-grape-soft transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </>
  );
}
