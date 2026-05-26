import { type ReactNode } from "react";

import { cn } from "../lib/utils";

export interface AuthCardProps {
  mascot: ReactNode;
  children: ReactNode;
  className?: string;
}

// Frosted brand surface sitting on top of <PageBackground />.
// Matches the .frosted-card visual language: large 32px radius, soft
// white-on-warm body, grape drop shadow, hairline border. The mascot
// frame uses a soft violet tint so it reads as part of the warm
// backdrop rather than a separate panel.
export function AuthCard({ mascot, children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        // Mobile: full-width card with stacked layout; min-h instead of
        // a vh lock so the form can grow when the keyboard appears.
        // Desktop (≥md): brand split-pane at 81vw / 79vh.
        "w-full max-w-md md:max-w-none md:w-[81vw] md:h-[79vh] overflow-hidden",
        "rounded-[32px] bg-white/95 backdrop-blur-md border border-white/80",
        "shadow-[0_30px_60px_-30px_rgba(85,65,139,0.45)]",
        "grid grid-cols-1 md:grid-cols-[54.5%_45.5%]",
        className,
      )}
    >
      {/* Mascot — hidden on mobile to keep the form above the fold;
          flex-col on desktop so flex-1 respects the p-5 padding. */}
      <div className="hidden md:flex h-full p-5 flex-col">
        <div className="flex-1 rounded-2xl overflow-hidden flex items-end justify-center bg-white">
          {mascot}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center gap-5 px-6 py-8 md:px-14 md:py-10 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
