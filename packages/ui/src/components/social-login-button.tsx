import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/utils";

export interface SocialLoginButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export const SocialLoginButton = forwardRef<
  HTMLButtonElement,
  SocialLoginButtonProps
>(({ className, icon, label, type = "button", disabled, ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    aria-label={label}
    aria-disabled={disabled || undefined}
    disabled={disabled}
    className={cn(
      "inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors",
      "hover:bg-neutral-100 focus-visible:outline-none focus-visible:shadow-focus",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white",
      className,
    )}
    {...props}
  >
    <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
  </button>
));
SocialLoginButton.displayName = "SocialLoginButton";
