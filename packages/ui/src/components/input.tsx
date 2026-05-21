import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

// Focus state pairs a violet-500 border with the gold shadow-focus ring
// (defined in packages/config/tailwind/preset.ts as
// `boxShadow.focus = 0 0 0 3px rgba(240,203,103,0.4)`). That's the same
// violet × butter combination the landing CTAs use on hover — keep it
// in sync if the brand palette ever moves.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-md border bg-white px-4 text-sm text-neutral-800 placeholder:text-neutral-400 transition-shadow",
        "hover:border-violet-200",
        "focus:outline-none focus:border-[1.5px] focus:border-violet-500 focus:shadow-focus",
        "disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed",
        invalid
          ? "border-[1.5px] border-rose-600 focus:border-rose-600 focus:shadow-[0_0_0_3px_rgba(220,38,38,0.2)]"
          : "border-neutral-200",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
