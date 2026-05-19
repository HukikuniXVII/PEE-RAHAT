import { type ReactNode } from "react";

import { cn } from "../lib/utils";

export interface FeatureCardProps {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white px-5 py-7 text-center shadow-card",
        className,
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 text-neutral-50">
        {icon}
      </span>
      <h3 className="text-base font-semibold text-violet-700">{title}</h3>
      <p className="text-xs leading-[1.5] text-neutral-500">{description}</p>
    </div>
  );
}
