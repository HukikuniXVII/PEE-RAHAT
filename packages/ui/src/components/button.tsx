import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../lib/utils";

// Canonical button styling matches the landing CTAs:
//   - .brand-btn-primary  (Hero filled grape CTA)
//   - .brand-btn-soft     (Hero outline white-on-grape CTA)
// Rounded-lg (14px), font-semibold, soft grape drop-shadow, and a
// 1px hover lift so every CTA in the product feels like the landing
// hero. Focus state uses the gold shadow-focus ring defined in the
// preset (no separate focus-ring outline).
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-focus active:scale-[0.98]",
  {
    variants: {
      variant: {
        // ---- Canonical landing-aligned variants ----
        primary:
          "bg-violet-500 text-white shadow-[0_6px_14px_-6px_rgba(85,65,139,0.5)] hover:bg-grape-deep hover:-translate-y-px disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none",
        "outline-brand":
          "bg-white text-violet-500 border border-[rgba(85,65,139,0.18)] hover:bg-grape-soft hover:-translate-y-px",
        "ghost-brand":
          "bg-transparent text-violet-700 hover:bg-grape-soft",

        // ---- Legacy aliases ----
        // `default` and `outline` redirect to the brand look so existing
        // admin / list callers pick up the landing aesthetic without
        // edits. Remove these once all call sites are migrated.
        default:
          "bg-violet-500 text-white shadow-[0_6px_14px_-6px_rgba(85,65,139,0.5)] hover:bg-grape-deep hover:-translate-y-px disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none",
        outline:
          "bg-white text-violet-500 border border-[rgba(85,65,139,0.18)] hover:bg-grape-soft hover:-translate-y-px",

        // ---- Semantic variants ----
        secondary: "bg-neutral-800 text-white hover:bg-neutral-700",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        muted: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
        ghost: "text-neutral-700 hover:bg-neutral-100",
        destructive: "bg-rose-600 text-white hover:bg-rose-700",
        link: "text-violet-500 hover:text-grape-deep underline-offset-4 hover:underline shadow-none active:scale-100",
      },
      size: {
        default: "px-5 py-3 text-sm",
        sm: "px-4 py-2 text-xs",
        // Matches Hero CTA — `px-8 py-4 text-base font-bold rounded-[16px]`.
        lg: "px-8 py-4 text-base rounded-[16px]",
        compact: "px-3 py-2 text-[10px] gap-1 rounded-md",
        icon: "w-10 h-10",
        // ---- Fixed-height brand sizes (use for dense forms / toolbars) ----
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
