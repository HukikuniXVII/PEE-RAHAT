"use client";

/**
 * ProfileOverlay — display-only mini-profile modal.
 *
 * Opens when the user clicks an author avatar/name in the community feed.
 * Two body variants based on `mode`:
 *   - 'student' — lightweight: 3-stat strip + goal + interests + recent posts
 *   - 'tutor'   — rich: 4-stat strip + ranking + subjects + bio + reviews
 *                 + past-students + top-sheet
 *
 * NO action buttons (จองเรียน / ติดตาม / ส่งข้อความ are deliberately not
 * present — the overlay is information-only).
 *
 * Wraps the existing Dialog primitive from @peerahat/ui for focus trap + Esc.
 */

import { Dialog, DialogContent, Avatar, cn } from "@peerahat/ui";
import { BadgeCheck, X, Sparkles } from "lucide-react";

export type ProfileMode = "student" | "tutor";

interface ProfileOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ProfileMode;
  subject: {
    name: string;
    handle: string;
    verified: boolean;
    avatarUrl?: string;
    /** ม.6 · เป้า: ... (student) or มหิดล คณะแพทย์ ปี 4 (tutor) */
    subtitle: string;
  };
  studentStats?: StudentStats;
  tutorStats?: TutorStats;
}

export function ProfileOverlay(props: ProfileOverlayProps) {
  const { open, onOpenChange, mode, subject } = props;
  const isTutor = mode === "tutor";
  const width = isTutor ? 520 : 440;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-2xl p-0 overflow-hidden flex flex-col"
        style={{ width, maxHeight: "90vh" }}
        aria-label={`โปรไฟล์ของ ${subject.name}`}
      >
        {/* Decorative gradient band (no text label inside) */}
        <div
          className="relative"
          style={{
            background: isTutor
              ? "linear-gradient(135deg, var(--color-violet-500) 0%, var(--color-rosy-taupe) 130%)"
              : "linear-gradient(135deg, var(--color-rosy-taupe) 0%, var(--color-violet-500) 130%)",
            padding: "20px 22px 60px",
          }}
        >
          <button
            onClick={() => onOpenChange(false)}
            aria-label="ปิดโปรไฟล์"
            className="absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
          >
            <X className="w-4 h-4"/>
          </button>
          <Sparkles className="absolute pointer-events-none w-8 h-8 text-white/20" style={{ top: 10, right: 60 }}/>
        </div>

        {/* Avatar + identity (overlaps gradient by -42px) */}
        <div className="px-6 -mt-[42px]">
          <div className="flex items-end gap-3">
            <div className="rounded-full bg-white p-1 ring-4 ring-white inline-block">
              <Avatar name={subject.name} size={76} verified={subject.verified} src={subject.avatarUrl}/>
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <h2 className="text-[18px] font-bold text-ink inline-flex items-center gap-1.5 leading-tight tracking-tight">
                {subject.name}
                {subject.verified && <BadgeCheck className="w-4 h-4 text-violet-500"/>}
              </h2>
              <p className="text-[12px] text-ink-soft">
                {subject.handle} <span className="text-ink-mute">·</span> {subject.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Body — scrolls if overflow */}
        <div className="px-6 pt-4 pb-6 overflow-y-auto">
          {isTutor
            ? <TutorBody stats={props.tutorStats!}/>
            : <StudentBody stats={props.studentStats!}/>}
        </div>

        {/* NO footer with action buttons — the overlay is display-only by design. */}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// STUDENT VARIANT
// ============================================================

export interface StudentStats {
  posts: number;
  comments: number;
  bookmarks: number;
  goal: { faculty: string; uni: string; subLine: string; emoji?: string };
  interestedSubjects: string[];
  recentPosts: { tag: string; body: string; when: string }[];
  joinedAgo: string;
}

function StudentBody({ stats }: { stats: StudentStats }) {
  return (
    <>
      <StatGrid cols={3}>
        <MiniStat label="โพสต์" value={stats.posts}/>
        <MiniStat label="ความเห็น" value={stats.comments}/>
        <MiniStat label="ที่บันทึก" value={stats.bookmarks}/>
      </StatGrid>

      <Section label="เป้าหมาย">
        <div className="flex items-center gap-3 rounded-xl p-3 bg-grape-soft">
          <span className="text-[22px]">{stats.goal.emoji ?? "🎯"}</span>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-grape-deep">{stats.goal.faculty} · {stats.goal.uni}</p>
            <p className="text-[11px] mt-0.5 text-ink-soft">{stats.goal.subLine}</p>
          </div>
        </div>
      </Section>

      <Section label="วิชาที่สนใจ">
        <ChipCluster items={stats.interestedSubjects}/>
      </Section>

      <Section label="โพสต์ล่าสุด">
        <ul className="space-y-2">
          {stats.recentPosts.map((p, i) => (
            <li key={i} className="rounded-lg p-2.5 flex items-start gap-2 bg-neutral-50 border border-grape-soft/40">
              <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-[var(--color-soft-periwinkle)]/15 text-violet-500">
                {p.tag}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] leading-snug text-ink">{p.body}</p>
                <p className="text-[10px] mt-0.5 text-ink-mute">{p.when}ที่แล้ว</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-[10.5px] mt-3 text-center text-ink-mute">
        🌸 เข้าร่วมเมื่อ <strong className="text-ink tabular-nums">{stats.joinedAgo}</strong> ก่อน · สุภาพ ไม่ละเมิดกฎ
      </p>
    </>
  );
}

// ============================================================
// TUTOR VARIANT
// ============================================================

export interface TutorStats {
  rating: number;
  totalReviews: number;
  hoursTaught: number;
  studentsTaught: number;
  responseTime: string;          // "<1"
  weeklyRank?: { rank: number; tag: string };
  subjectsTaught: string[];
  hourlyRate: number;
  bio: string;
  reviews: { name: string; when: string; stars: number; body: string }[];
  pastStudentInitials: string[]; // top 5
  otherStudentsCount: number;
  placedUniSummary: string;
  topSheet?: {
    title: string;
    rating: number;
    reviewCount: number;
    soldCount: number;
    price: number;
  };
  joinedYearsAgo: number;
}

function TutorBody({ stats }: { stats: TutorStats }) {
  return (
    <>
      <StatGrid cols={4}>
        <MiniStat label="rating" value={stats.rating.toFixed(2)} icon="★" tone="accent"/>
        <MiniStat label="ชั่วโมงสอน" value={stats.hoursTaught} sub="ชม."/>
        <MiniStat label="นักเรียน" value={stats.studentsTaught} sub="คน"/>
        <MiniStat label="ตอบใน" value={stats.responseTime} sub="ชม."/>
      </StatGrid>

      {stats.weeklyRank && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl border border-accent-500/60 bg-gradient-to-r from-accent-500/20 to-soft-periwinkle/15">
          <span className="text-[18px]">🏆</span>
          <p className="text-[12px] flex-1 text-grape-deep">
            <strong>อันดับ #{stats.weeklyRank.rank}</strong> ในกลุ่ม <span className="text-violet-500">{stats.weeklyRank.tag}</span> สัปดาห์นี้
          </p>
        </div>
      )}

      <Section label="วิชาที่สอน">
        <ChipCluster items={stats.subjectsTaught} variant="solid"/>
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-dashed border-grape-soft">
          <p className="text-[11px] text-ink-mute">อัตราค่าเรียน</p>
          <p className="tabular-nums text-[18px] font-bold text-grape-deep">
            ฿{stats.hourlyRate} <span className="font-normal text-[11px] text-ink-mute">/ ชั่วโมง</span>
          </p>
        </div>
      </Section>

      <Section label="เกี่ยวกับพี่">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">{stats.bio}</p>
      </Section>

      <Section label={`รีวิวจากนักเรียน · ${stats.totalReviews} รีวิว`}>
        <ul className="space-y-2">
          {stats.reviews.map((r, i) => (
            <li key={i} className="rounded-xl p-3 bg-neutral-50 border border-grape-soft/40">
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar name={r.name} size={26}/>
                <p className="text-[12px] font-bold flex-1 text-ink">{r.name}</p>
                <span className="text-[10.5px] text-accent-600">{"★".repeat(r.stars)}</span>
                <span className="text-[10px] text-ink-mute">{r.when}ก่อน</span>
              </div>
              <p className="text-[12px] leading-relaxed text-ink-soft">"{r.body}"</p>
            </li>
          ))}
        </ul>
        <button className="w-full text-[11.5px] font-semibold py-1.5 rounded-lg text-violet-500 mt-2 hover:underline">
          ดูรีวิวทั้งหมด {stats.totalReviews} รีวิว →
        </button>
      </Section>

      <Section label="นักเรียนที่สอนผ่านมา">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {stats.pastStudentInitials.map((n, i) => (
              <span
                key={i}
                className="rounded-full grid place-items-center text-white font-bold text-[11px] ring-2 ring-white"
                style={{
                  width: 28, height: 28,
                  background: ["#55418B","#BBA0A0","#7D80DA","#2F9B6E","#ECBE42"][i % 5]
                }}
              >{n}</span>
            ))}
          </div>
          <p className="text-[11.5px] ml-1 text-ink-soft">
            และอีก <strong className="tabular-nums text-grape-deep">{stats.otherStudentsCount}</strong> คน · ส่วนใหญ่ติด <strong className="text-violet-500">{stats.placedUniSummary}</strong>
          </p>
        </div>
      </Section>

      {stats.topSheet && (
        <Section label="ชีทขายดีของพี่">
          <div className="rounded-xl p-3 flex items-center gap-3 bg-neutral-50 border border-grape-soft/40">
            <SheetThumbnail/>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-ink leading-tight">{stats.topSheet.title}</p>
              <p className="text-[10.5px] mt-0.5 text-ink-mute">
                ★ {stats.topSheet.rating} · {stats.topSheet.reviewCount} รีวิว · ขายได้ <strong className="tabular-nums">{stats.topSheet.soldCount}</strong> เล่ม
              </p>
            </div>
            <span className="tabular-nums text-[14px] font-bold text-grape-deep">฿{stats.topSheet.price}</span>
          </div>
        </Section>
      )}

      <p className="text-[10.5px] mt-3 text-center text-ink-mute">
        🛡️ ผ่าน KYC + ทรานสคริปต์ · เข้าร่วม Pee Rahat เมื่อ <strong className="tabular-nums text-ink">{stats.joinedYearsAgo} ปี</strong> ก่อน
      </p>
    </>
  );
}

// ---------- Small building blocks ----------

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <p className="text-[10.5px] font-bold uppercase tracking-wider mb-2 text-ink-mute">{label}</p>
      {children}
    </section>
  );
}

function StatGrid({ cols, children }: { cols: 3 | 4; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-2 mb-4", cols === 4 ? "grid-cols-4" : "grid-cols-3")}>
      {children}
    </div>
  );
}

function MiniStat({ label, value, sub, icon, tone }: { label: string; value: string | number; sub?: string; icon?: string; tone?: "accent" }) {
  return (
    <div className="rounded-lg px-2.5 py-2 text-center bg-violet-500/5">
      <p className={cn(
        "tabular-nums text-[15px] font-bold leading-none inline-flex items-baseline justify-center gap-0.5",
        tone === "accent" ? "text-accent-600" : "text-grape-deep"
      )}>
        {icon && <span className="text-[11px]">{icon}</span>}
        {value}
        {sub && <span className="font-normal text-[10px] text-ink-mute">{sub}</span>}
      </p>
      <p className="text-[10px] mt-1 text-ink-mute">{label}</p>
    </div>
  );
}

function ChipCluster({ items, variant = "outline" }: { items: string[]; variant?: "outline" | "solid" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(s => (
        <span
          key={s}
          className={cn(
            "text-[11.5px] font-semibold px-2.5 py-1 rounded-full",
            variant === "solid"
              ? "bg-grape-soft text-grape-deep"
              : "bg-neutral-50 text-ink border border-grape-soft/40"
          )}
        >{s}</span>
      ))}
    </div>
  );
}

function SheetThumbnail() {
  return (
    <div className="w-10 h-12 rounded shadow-sm flex-shrink-0 bg-white border border-violet-500/15 relative overflow-hidden">
      <div
        className="absolute inset-1.5"
        style={{ background: "repeating-linear-gradient(180deg, var(--color-violet-100) 0 1.5px, transparent 1.5px 6px)" }}
      />
    </div>
  );
}
