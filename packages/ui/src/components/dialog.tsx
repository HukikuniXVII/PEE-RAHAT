"use client";

import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "../lib/utils";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog subcomponents must be used inside <Dialog>");
  }
  return ctx;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Controlled modal. Caller owns `open` state; the dialog handles portal,
 * backdrop, ESC, and body scroll lock. No focus trap — Phase 1 baseline
 * matches the existing inline dialogs (see apps/web/components/payment-dialog).
 * A future swap to @radix-ui/react-dialog is a drop-in upgrade.
 */
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export const DialogContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, onOpenChange } = useDialog();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-xl bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
});
DialogContent.displayName = "DialogContent";

export const DialogHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-2 p-8", className)}
    {...props}
  />
));
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-2xl font-black text-slate-900", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-500 leading-relaxed", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export const DialogFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-end gap-3 p-8 pt-0", className)}
    {...props}
  />
));
DialogFooter.displayName = "DialogFooter";

interface DialogCloseProps extends HTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ className, onClick, children, ...props }, ref) => {
    const { onOpenChange } = useDialog();
    const handle = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (!e.defaultPrevented) onOpenChange(false);
      },
      [onClick, onOpenChange],
    );
    return (
      <button
        ref={ref}
        type="button"
        onClick={handle}
        className={cn("text-sm font-bold text-slate-500", className)}
        {...props}
      >
        {children ?? "ปิด"}
      </button>
    );
  },
);
DialogClose.displayName = "DialogClose";
