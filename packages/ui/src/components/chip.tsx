import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/utils";

export const chipVariants = cva(
  "inline-flex items-center h-6 px-3 rounded-full text-[11px] font-medium gap-1.5",
  {
    variants: {
      variant: {
        default: "bg-violet-50 text-violet-700",
        accent: "bg-accent-100 text-neutral-800",
        brand: "bg-violet-500 text-neutral-50",
        premium: "bg-neutral-800 text-accent-500",
        ghost: "bg-transparent border border-neutral-200 text-neutral-500",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface ChipProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(chipVariants({ variant }), className)}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";
