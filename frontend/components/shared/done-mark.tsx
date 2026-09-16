"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/components/shared/runner-motion";
import { cn } from "@/lib/utils";

/**
 * The finish mark: a ring draws itself, then the tick. The one flourish on
 * the candidate's journey, saved for the moment a test is handed in.
 */
export function DoneMark({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const draw = (delay: number) =>
    reduceMotion
      ? { initial: false as const }
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 0.55, delay, ease: EASE_OUT },
        };

  return (
    <motion.svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("size-16", className)}
      initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <circle cx="32" cy="32" r="30" className="fill-success-soft" />
      <motion.circle
        cx="32"
        cy="32"
        r="29"
        fill="none"
        strokeWidth="2.5"
        className="stroke-success"
        {...draw(0.05)}
      />
      <motion.path
        d="M20 33.5l8 8 16-17"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-success"
        {...draw(0.35)}
      />
    </motion.svg>
  );
}
