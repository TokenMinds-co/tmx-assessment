"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/components/shared/runner-motion";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Rises from the bottom of a form while it has unsaved changes. Its Save
 * button submits the form it sits in.
 */
export function SaveBar({
  show,
  saving,
  onDiscard,
  message = "You have unsaved changes.",
}: {
  show: boolean;
  saving: boolean;
  onDiscard: () => void;
  message?: string;
}) {
  const reduceMotion = useReducedMotion();
  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 };

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={hidden}
          animate={{ opacity: 1, y: 0 }}
          exit={hidden}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          role="region"
          aria-label="Unsaved changes"
          className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-strong bg-card px-4 py-3 shadow-lg"
        >
          <p className="text-sm font-medium text-foreground">{message}</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onDiscard} disabled={saving}>
              Discard
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              Save changes
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
