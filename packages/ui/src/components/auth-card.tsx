import { type ReactNode } from "react";

import { cn } from "../lib/utils";

export interface AuthCardProps {
  mascot: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AuthCard({ mascot, children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        // 10% smaller than 90/88 → 81vw / 79vh
        "w-[81vw] h-[79vh] overflow-hidden",
        "rounded-3xl bg-white shadow-2xl",
        "grid grid-cols-[54.5%_45.5%]",
        className,
      )}
    >
      {/* Mascot — flex-col so flex-1 child correctly respects the p-5 padding */}
      <div className="h-full p-5 bg-white flex flex-col">
        <div className="flex-1 rounded-2xl overflow-hidden flex items-end justify-center bg-violet-50/40">
          {mascot}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center gap-5 px-14 py-10 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
