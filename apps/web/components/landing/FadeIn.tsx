"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Delay in seconds before the animation starts. */
  delay?: number;
  className?: string;
  /** "mount" animates on first paint; "view" animates when scrolled into view. */
  trigger?: "mount" | "view";
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function FadeIn({
  children,
  delay = 0,
  className,
  trigger = "mount",
}: Props) {
  const reduce = useReducedMotion();
  const initial = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };
  const target = { opacity: 1, y: 0 };
  const transition = { duration: 0.45, delay, ease: EASE };

  if (trigger === "view") {
    return (
      <motion.div
        className={className}
        initial={initial}
        whileInView={target}
        viewport={{ once: true, amount: 0.2 }}
        transition={transition}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={initial}
      animate={target}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
