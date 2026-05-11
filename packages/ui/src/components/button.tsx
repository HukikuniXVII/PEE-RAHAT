import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-bold transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white hover:bg-indigo-700",
        secondary: "bg-slate-900 text-white hover:bg-black",
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
        icon: "w-10 h-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
