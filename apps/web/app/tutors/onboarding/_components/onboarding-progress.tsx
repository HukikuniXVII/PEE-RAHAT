"use client";

import { cn } from "@peerahat/ui";
import { Check } from "lucide-react";

// Single-page tutor signup uses anchor links to jump between sections;
// these ids must match the ones rendered in the section components.
export const STEP_IDS = ["identity", "bank", "pdpa", "profile"] as const;
export type StepId = (typeof STEP_IDS)[number];

export interface StepState {
  id: StepId;
  label: string;
  short: string;
  done: boolean;
}

interface Props {
  steps: StepState[];
}

/**
 * Sticky progress header for the single-page tutor onboarding flow.
 * 4 circles map 1:1 with the inline sections rendered below; each
 * outlines → fills violet → flips to a green check as the user fills
 * the corresponding section. Anchor-link clicks scroll the matching
 * <section id="..."> into view. The encouraging copy under the bar is
 * keyed by completion count so the user gets a small "เก่งมาก!" payoff
 * at each milestone without needing animation/confetti.
 */
export function OnboardingProgress({ steps }: Props) {
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const percent = Math.round((done / total) * 100);

  let cheer: string;
  if (done === 0) cheer = "เริ่มจากขั้นไหนก่อนก็ได้ ค่อยๆ ทำไปเรื่อยๆ นะ 🌱";
  else if (done < total) cheer = `เก่งมาก! เหลืออีก ${total - done} ขั้นตอน 💪`;
  else cheer = "ครบทุกขั้นแล้ว! กดส่งข้อมูลด้านล่างได้เลย 🎉";

  return (
    <div className="sticky top-4 z-30 mx-auto max-w-3xl">
      <div className="bg-white/90 backdrop-blur rounded-[28px] border border-violet-100 shadow-[0_8px_24px_-16px_rgba(85,65,139,0.25)] p-5 md:p-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-dusty-grape">
              Tutor Onboarding
            </p>
            <p className="thai text-sm font-bold text-grape-deep">
              สมัครเป็นติวเตอร์ (KYC)
            </p>
          </div>
          <span className="tabular-nums text-[12px] font-bold px-3 py-1.5 rounded-full bg-grape-soft text-grape-deep whitespace-nowrap shrink-0">
            {done} / {total} ขั้นตอน · {percent}%
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-grape-soft overflow-hidden">
          <div
            className="h-full bg-dusty-grape transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ol className="flex items-center justify-between gap-2 pt-1">
          {steps.map((s, i) => (
            <li key={s.id} className="flex-1 min-w-0">
              <a
                href={`#${s.id}`}
                className="group block text-center space-y-1.5"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(s.id);
                  if (el)
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span
                  className={cn(
                    "mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black border-2 transition-all",
                    s.done
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_10px_-4px_rgba(16,185,129,0.5)]"
                      : "bg-white border-violet-200 text-ink-mute group-hover:border-violet-400 group-hover:text-grape-deep",
                  )}
                >
                  {s.done ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "thai block text-[10.5px] font-bold truncate",
                    s.done
                      ? "text-emerald-700"
                      : "text-ink-soft group-hover:text-grape-deep",
                  )}
                >
                  {s.short}
                </span>
              </a>
            </li>
          ))}
        </ol>

        <p className="thai text-[11.5px] text-ink-mute text-center pt-1">
          {cheer}
        </p>
      </div>
    </div>
  );
}
