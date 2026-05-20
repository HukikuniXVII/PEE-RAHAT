import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/utils";

// Three card looks aligned with the landing visual language:
//   - default → solid white, neutral border, shadow-card (admin tables,
//               dashboards, anywhere the card sits on neutral surface).
//   - glass   → mirrors `.glass-card` in globals.css — small frosted
//               feature tile with a soft hover lift. Use on warm
//               surfaces (PageBackground, .brand-page).
//   - frosted → mirrors `.frosted-card` in globals.css — large section
//               shell with extra radius + softer shadow.
const cardVariants = cva("transition-shadow", {
  variants: {
    variant: {
      default: "bg-white rounded-lg border border-neutral-200 shadow-card",
      glass:
        "bg-white/[0.78] backdrop-blur-md rounded-[22px] border border-white/90 shadow-[0_12px_28px_-18px_rgba(85,65,139,0.35)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-18px_rgba(85,65,139,0.45)]",
      frosted:
        "bg-white/[0.85] backdrop-blur-sm rounded-[28px] border border-white shadow-[0_18px_40px_-22px_rgba(85,65,139,0.25)]",
    },
  },
  defaultVariants: { variant: "default" },
});

type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-2 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold text-neutral-800 text-lg", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neutral-500 leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-3 p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
