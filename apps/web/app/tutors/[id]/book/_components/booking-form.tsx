"use client";

import {
  type Booking,
  type CreateBookingDto,
  type Subject,
  type Tutor,
  createBookingSchema,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { createApiClient } from "@/lib/api-client";

interface Props {
  tutor: Tutor;
  /** Provided when rendered inside a dialog — receipt CTAs close the overlay. */
  onClose?: () => void;
}

const DURATION_PRESETS = [60, 90, 120] as const;
type DurationMinutes = (typeof DURATION_PRESETS)[number];

const SUBJECT_LABEL: Record<Subject, string> = {
  Math: "คณิตศาสตร์",
  Physics: "ฟิสิกส์",
  Chemistry: "เคมี",
  Biology: "ชีววิทยา",
  English: "อังกฤษ",
  Social: "สังคม",
  Thai: "ภาษาไทย",
};

// Slots start every hour from 09:00 to 20:00 (last slot ends 21:00).
const SLOT_HOURS = Array.from({ length: 12 }, (_, i) => 9 + i);

const STEP_LABELS = [
  "วิชาและความยาว",
  "วันและเวลา",
  "ยืนยัน",
  "ใบเสร็จ",
] as const;

type Step = 1 | 2 | 3 | 4;

function clampStep(requested: Step, max: Step): Step {
  return (Math.min(requested, max) as Step);
}

function buildDayChips(): { iso: string; weekday: string; day: string; month: string }[] {
  const out: { iso: string; weekday: string; day: string; month: string }[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let offset = 1; offset <= 7; offset++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    out.push({
      iso: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString("th-TH", { weekday: "short" }),
      day: d.toLocaleDateString("th-TH", { day: "numeric" }),
      month: d.toLocaleDateString("th-TH", { month: "short" }),
    });
  }
  return out;
}

function combineDateAndHour(dateIso: string, hour: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const local = new Date(y!, (m ?? 1) - 1, d ?? 1, hour, 0, 0, 0);
  return local.toISOString();
}

function formatScheduledAt(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingForm({ tutor, onClose }: Props) {
  const [subject, setSubject] = useState<Subject>(
    (tutor.subjects[0] ?? "Math") as Subject,
  );
  const [duration, setDuration] = useState<DurationMinutes>(60);
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [requestedStep, setRequestedStep] = useState<Step>(1);

  const dayChips = useMemo(buildDayChips, []);

  const scheduledAt = dateIso !== null && hour !== null
    ? combineDateAndHour(dateIso, hour)
    : null;

  const estimatedAmount = Math.round((tutor.hourlyRate * duration) / 60);

  const maxReachable: Step = !subject || !duration
    ? 1
    : !scheduledAt
      ? 2
      : !booking
        ? 3
        : 4;
  const step = clampStep(requestedStep, maxReachable);

  const goTo = useCallback((next: Step) => {
    setRequestedStep(next);
  }, []);

  const create = useMutation({
    mutationFn: (dto: CreateBookingDto) =>
      createApiClient().bookings.create(dto),
    onSuccess: (b) => {
      setBooking(b);
      setRequestedStep(4);
    },
  });

  const submit = () => {
    if (!scheduledAt) return;
    const dto: CreateBookingDto = {
      tutorId: tutor.id,
      subject,
      scheduledAt,
      durationMinutes: duration,
    };
    const parsed = createBookingSchema.safeParse(dto);
    if (!parsed.success) return;
    create.mutate(parsed.data);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <TutorHeader tutor={tutor} />
      <StepIndicator step={step} />

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 sm:p-10 min-h-[420px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="space-y-10"
            >
              <StepOne
                tutor={tutor}
                subject={subject}
                onSubject={setSubject}
                duration={duration}
                onDuration={setDuration}
              />
              <StepFooter
                onNext={() => goTo(2)}
                nextDisabled={!tutor.subjects.includes(subject)}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="space-y-10"
            >
              <StepTwo
                days={dayChips}
                dateIso={dateIso}
                onDate={(iso) => {
                  setDateIso(iso);
                  setHour(null);
                }}
                hour={hour}
                onHour={setHour}
              />
              <StepFooter
                onBack={() => goTo(1)}
                onNext={() => goTo(3)}
                nextDisabled={!dateIso || hour === null}
              />
            </motion.div>
          )}

          {step === 3 && scheduledAt !== null && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="space-y-10"
            >
              <StepThree
                tutor={tutor}
                subject={subject}
                scheduledAt={scheduledAt}
                duration={duration}
                amount={estimatedAmount}
                consent={consent}
                onConsent={setConsent}
                error={create.error?.message ?? null}
              />
              <StepFooter
                onBack={() => goTo(2)}
                onNext={submit}
                nextLabel={
                  create.isPending ? "กำลังส่งคำขอ..." : "ยืนยันการจอง"
                }
                nextDisabled={!consent || create.isPending}
                busy={create.isPending}
              />
            </motion.div>
          )}

          {step === 4 && booking && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <StepFour tutor={tutor} booking={booking} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TutorHeader({ tutor }: { tutor: Tutor }) {
  return (
    <header className="flex items-center gap-4">
      <img
        src={tutor.avatarUrl}
        alt={tutor.displayName}
        className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 object-cover"
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
          จองคลาสกับ
        </p>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
          {tutor.displayName}
        </h1>
        <p className="text-xs text-slate-500 truncate">
          {tutor.faculty} • ฿{tutor.hourlyRate.toLocaleString()}/ชม.
        </p>
      </div>
    </header>
  );
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex-1 flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border transition-all",
                done && "bg-emerald-500 border-emerald-500 text-white",
                active && "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100",
                !active && !done && "bg-white border-slate-200 text-slate-400",
              )}
            >
              {done ? <CheckCircle2 size={16} /> : n}
            </div>
            <span
              className={cn(
                "text-[11px] font-bold uppercase tracking-wider hidden sm:inline truncate",
                active ? "text-slate-900" : "text-slate-400",
              )}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1",
                  done ? "bg-emerald-500" : "bg-slate-100",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface StepFooterProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
}

function StepFooter({
  onBack,
  onNext,
  nextLabel = "ถัดไป",
  nextDisabled,
  busy,
}: StepFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onBack}
          disabled={busy}
        >
          <ArrowLeft size={16} />
          ย้อนกลับ
        </Button>
      ) : (
        <span />
      )}
      <Button
        type="button"
        size="lg"
        onClick={onNext}
        disabled={nextDisabled}
        className="min-w-[160px]"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {nextLabel}
        {!busy && <ArrowRight size={16} />}
      </Button>
    </div>
  );
}

function StepOne({
  tutor,
  subject,
  onSubject,
  duration,
  onDuration,
}: {
  tutor: Tutor;
  subject: Subject;
  onSubject: (s: Subject) => void;
  duration: DurationMinutes;
  onDuration: (d: DurationMinutes) => void;
}) {
  return (
    <>
      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <GraduationCap size={14} />
          เลือกวิชา
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tutor.subjects.map((s) => {
            const active = s === subject;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSubject(s)}
                className={cn(
                  "py-3 px-3 rounded-2xl border text-sm font-bold transition-all text-left",
                  active
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                    : "bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-300",
                )}
              >
                {SUBJECT_LABEL[s] ?? s}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} />
          ความยาวคลาส
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {DURATION_PRESETS.map((mins) => {
            const active = mins === duration;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => onDuration(mins)}
                className={cn(
                  "py-4 rounded-2xl border text-sm font-bold transition-all",
                  active
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                    : "bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-300",
                )}
              >
                {mins} นาที
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400">
          ค่าตอบแทนโดยประมาณ ฿
          {Math.round((tutor.hourlyRate * duration) / 60).toLocaleString()}
        </p>
      </section>
    </>
  );
}

function StepTwo({
  days,
  dateIso,
  onDate,
  hour,
  onHour,
}: {
  days: ReturnType<typeof buildDayChips>;
  dateIso: string | null;
  onDate: (iso: string) => void;
  hour: number | null;
  onHour: (h: number) => void;
}) {
  return (
    <>
      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <CalendarClock size={14} />
          เลือกวัน
        </label>
        <p className="text-[11px] text-slate-500">
          จองล่วงหน้าอย่างน้อย 1 วัน
        </p>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-2 snap-x">
          {days.map((d) => {
            const active = d.iso === dateIso;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => onDate(d.iso)}
                className={cn(
                  "shrink-0 snap-start w-[68px] py-3 rounded-2xl border text-center transition-all",
                  active
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                    : "bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-300",
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                  {d.weekday}
                </p>
                <p className="text-xl font-black leading-tight">{d.day}</p>
                <p className="text-[10px] font-bold opacity-70">{d.month}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} />
          เลือกเวลา
        </label>
        {dateIso ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {SLOT_HOURS.map((h) => {
              const active = h === hour;
              // TODO: cross-check against tutor.availability + existing bookings.
              const disabled = false;
              return (
                <button
                  key={h}
                  type="button"
                  disabled={disabled}
                  onClick={() => onHour(h)}
                  className={cn(
                    "py-3 rounded-2xl border text-sm font-bold transition-all",
                    active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                      : "bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-300",
                    disabled && "opacity-40 cursor-not-allowed",
                  )}
                >
                  {String(h).padStart(2, "0")}:00
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 font-medium py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            เลือกวันก่อนเพื่อดูเวลาที่ว่าง
          </p>
        )}
      </section>
    </>
  );
}

function StepThree({
  tutor,
  subject,
  scheduledAt,
  duration,
  amount,
  consent,
  onConsent,
  error,
}: {
  tutor: Tutor;
  subject: Subject;
  scheduledAt: string;
  duration: DurationMinutes;
  amount: number;
  consent: boolean;
  onConsent: (v: boolean) => void;
  error: string | null;
}) {
  return (
    <>
      <section className="bg-slate-50 rounded-3xl border border-slate-100 p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          สรุปการจอง
        </h2>
        <dl className="space-y-3 text-sm">
          <SummaryRow label="พี่ติว" value={tutor.displayName} />
          <SummaryRow label="วิชา" value={SUBJECT_LABEL[subject] ?? subject} />
          <SummaryRow label="วันและเวลา" value={formatScheduledAt(scheduledAt)} />
          <SummaryRow label="ความยาว" value={`${duration} นาที`} />
        </dl>
        <div className="pt-4 border-t border-slate-200 flex items-end justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            ยอดประมาณการ
          </span>
          <span className="text-3xl font-black text-slate-900">
            ฿{amount.toLocaleString()}
          </span>
        </div>
      </section>

      <section className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-800 leading-relaxed">
          เงินของคุณจะถูกพักในระบบ Escrow จนกว่าคลาสจะเสร็จสิ้น
          คุณสามารถขอคืนเงินได้ภายใน 24 ชม. หากไม่พอใจ
        </p>
      </section>

      <label className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-indigo-600 shrink-0"
          checked={consent}
          onChange={(e) => onConsent(e.target.checked)}
        />
        <span>
          ฉันยอมรับนโยบายการเก็บข้อมูลส่วนบุคคลตาม PDPA
          และยินยอมให้ Pee Rahat ใช้ข้อมูลของฉันเพื่อดำเนินการจองคลาสนี้
        </span>
      </label>

      {error && (
        <p className="text-sm text-rose-600 font-medium text-center">
          {error}
        </p>
      )}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
        {label}
      </dt>
      <dd className="text-sm font-bold text-slate-800 text-right">{value}</dd>
    </div>
  );
}

function StepFour({ tutor, booking }: { tutor: Tutor; booking: Booking }) {
  return (
    <div className="space-y-8 text-center">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 size={44} />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          ส่งคำขอเรียบร้อย
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          คำขอจองของคุณถูกส่งให้พี่{tutor.displayName} แล้ว
        </p>
      </div>

      <section className="bg-slate-50 rounded-3xl border border-slate-100 p-6 text-left space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <ReceiptText size={14} />
          ใบเสร็จการจอง
        </div>
        <dl className="space-y-3 text-sm">
          <SummaryRow label="หมายเลขการจอง" value={booking.id} />
          <SummaryRow label="พี่ติว" value={tutor.displayName} />
          <SummaryRow
            label="วิชา"
            value={SUBJECT_LABEL[booking.subject] ?? booking.subject}
          />
          <SummaryRow
            label="วันและเวลา"
            value={formatScheduledAt(booking.scheduledAt)}
          />
          <SummaryRow
            label="ความยาว"
            value={`${booking.durationMinutes} นาที`}
          />
          <SummaryRow
            label="ยอดรวม"
            value={`฿${booking.amountThb.toLocaleString()}`}
          />
        </dl>
        <div className="pt-4 border-t border-slate-200 flex items-center gap-2">
          <CalendarCheck size={16} className="text-amber-600 shrink-0" />
          <p className="text-xs font-bold text-amber-700">
            สถานะ: รอพี่ติวรับงาน (ภายใน 24 ชม.)
          </p>
        </div>
      </section>

      <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex items-start gap-3 text-left">
        <ShieldCheck size={18} className="text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-800 leading-relaxed">
          เงินของคุณจะถูกพักไว้ในระบบ Escrow ปลอดภัย 100%
          จะโอนให้พี่ติวก็ต่อเมื่อคลาสเสร็จสิ้นเรียบร้อย
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/bookings"
          className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-center"
        >
          ดูในแดชบอร์ด
        </Link>
        <Link
          href="/tutors"
          className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all text-center"
        >
          กลับไปดูพี่ติวคนอื่น
        </Link>
      </div>
    </div>
  );
}
