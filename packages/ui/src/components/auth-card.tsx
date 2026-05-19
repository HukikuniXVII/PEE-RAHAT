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
        "w-full max-w-[1800px] overflow-hidden rounded-xl bg-white shadow-lg",
        "grid min-h-[920px] grid-cols-1 md:grid-cols-2",
        className,
      )}
    >
      <div className="flex items-stretch justify-stretch bg-white p-[20px]">
        {mascot}
      </div>
      <div className="flex flex-col justify-center gap-4 p-8 md:px-12 md:py-14">
        {children}
      </div>
    </div>
  );
}
