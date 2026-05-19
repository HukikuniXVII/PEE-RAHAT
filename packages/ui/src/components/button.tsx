import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-bold transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
  {
    variants: {
      variant: {
        // ---- design-system.md §8 ----
        primary:
          "bg-violet-500 text-neutral-50 rounded-md font-medium hover:bg-accent-500 hover:text-neutral-800 active:bg-violet-700 active:text-neutral-50 active:scale-[0.98] focus-visible:ring-0 focus-visible:shadow-focus disabled:bg-neutral-200 disabled:text-neutral-400",
        "outline-brand":
          "bg-transparent rounded-md font-medium border-[1.5px] border-violet-500 text-violet-700 hover:bg-violet-50 active:bg-violet-100 focus-visible:ring-0 focus-visible:shadow-focus",
        "ghost-brand":
          "bg-transparent rounded-md font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:ring-0 focus-visible:shadow-focus",
        // ---- legacy variants (kept for admin + existing consumers) ----
        default: "bg-indigo-600 text-white hover:bg-indigo-700",
        secondary: "bg-slate-900 text-white hover:bg-black",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        muted: "bg-slate-100 text-slate-600 hover:bg-slate-200",
        outline:
          "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-50",
        destructive: "bg-rose-600 text-white hover:bg-rose-700",
        link: "text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "px-5 py-3 text-sm",
        sm: "px-4 py-2 text-xs",
        lg: "px-6 py-4 text-base",
        compact: "px-3 py-2 text-[10px] gap-1 rounded-xl",
        icon: "w-10 h-10",
        // ---- design-system.md §8 sizes (use with primary/outline-brand/ghost-brand) ----
        "brand-sm": "h-8 px-3 text-xs",
        "brand-md": "h-9 px-4 text-[13px]",
        "brand-lg": "h-11 px-6 text-sm",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "default", size: "default", fullWidth: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, fullWidth, type = "button", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
