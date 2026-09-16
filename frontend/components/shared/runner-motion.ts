import type { Transition, Variants } from "motion/react";

/*
 * The runner's motion, in one place (docs/design-system.md#motion). Questions
 * move like Typeform's: the next one rises from below, going back drops the
 * previous one from above, and a choice blinks before the runner moves on.
 */

/** A confident arrival: fast start, long settle. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];

/** 1 moves on to the next question, -1 goes back. */
export type Direction = 1 | -1;

export function questionVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0.18 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    enter: (direction: Direction) => ({ opacity: 0, y: direction * 56, filter: "blur(6px)" }),
    center: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.42, ease: EASE_OUT, staggerChildren: 0.04, delayChildren: 0.05 },
    },
    exit: (direction: Direction) => ({
      opacity: 0,
      y: direction * -36,
      filter: "blur(4px)",
      transition: { duration: 0.18, ease: EASE_IN },
    }),
  };
}

/** Each part of a question arrives a beat after the one above it. */
export function itemVariants(reduceMotion: boolean): Variants {
  return reduceMotion
    ? { enter: { opacity: 1 }, center: { opacity: 1 } }
    : {
        enter: { opacity: 0, y: 14 },
        center: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT } },
      };
}

/** A list whose items arrive one after another. */
export function listVariants(reduceMotion: boolean): Variants {
  return reduceMotion
    ? { enter: {}, center: {} }
    : { enter: {}, center: { transition: { staggerChildren: 0.035 } } };
}

/** The chosen option blinks twice before the next question comes in. */
export const BLINK = { opacity: [1, 0.35, 1, 0.35, 1] };
export const BLINK_TRANSITION: Transition = {
  duration: 0.44,
  times: [0, 0.25, 0.5, 0.75, 1],
  ease: "linear",
};

/** How long after a choice the runner moves on. It covers the blink. */
export const ADVANCE_DELAY_MS = 520;
export const ADVANCE_DELAY_REDUCED_MS = 260;
