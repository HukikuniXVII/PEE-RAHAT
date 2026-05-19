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
        // Card: reasonable max width, auto height to fit content, large radius + shadow
        "w-full max-w-[960px] overflow-hidden rounded-2xl bg-white shadow-xl",
        "grid grid-cols-1 md:grid-cols-[1fr_400px]",
        className,
      )}
    >
      {/* Mascot panel — 20px from top, left, bottom, right */}
      <div className="relative flex items-end justify-center min-h-[560px] p-5 bg-white">
        {mascot}
      </div>

      {/* Form panel — no divider */}
      <div className="flex flex-col justify-center gap-4 px-10 py-12">
        {children}
      </div>
    </div>
  );
}
