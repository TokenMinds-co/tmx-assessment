"use client";

import { ArrowDownIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, CloudIcon, CloudOffIcon, SendIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ADVANCE_DELAY_MS,
  ADVANCE_DELAY_REDUCED_MS,
  type Direction,
  questionVariants,
} from "@/components/shared/runner-motion";
import { OPTION_KEYS, type OptionHighlight } from "@/components/shared/runner-options";
import { RunnerQuestion } from "@/components/shared/runner-question";
import { RunnerTimer } from "@/components/shared/runner-timer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { useCountdown } from "@/hooks/use-countdown";
import type { TakeOption, TakeQuestion, TakeSettings } from "@/lib/api/take";
import { cn } from "@/lib/utils";

/** Question id to chosen option id. */
export type RunnerAnswers = Record<string, string>;
export type SubmitReason = "submitted" | "timed-out";
export type SaveStatus = "idle" | "saving" | "saved" | "offline" | "error";

export interface AssessmentRunnerProps {
  name: string;
  questions: TakeQuestion[];
  settings: TakeSettings;
  /** Answers already saved, such as when a candidate comes back. */
  initialAnswers?: RunnerAnswers;
  /** When time runs out, as an ISO date. Without it there's no timer. */
  deadlineAt?: string | null;
  /** The server's clock minus this device's. */
  clockOffsetMs?: number;
  /** Every choice. The runner shows it straight away; saving is the caller's job. */
  onAnswer?: (questionId: string, optionId: string) => void;
  /** After the candidate confirms, or when time runs out. */
  onSubmit: (answers: RunnerAnswers, reason: SubmitReason) => void;
  submitting?: boolean;
  saveStatus?: SaveStatus;
  /** Staff preview: the option to mark on each question. */
  highlights?: ReadonlyMap<string, OptionHighlight>;
  brand?: React.ReactNode;
  /** Shown above the runner's own header, such as the preview controls. */
  banner?: React.ReactNode;
}

/**
 * Takes a test one question at a time, Typeform style: each question fills
 * the screen, a choice blinks and the next question rises into place, and the
 * keyboard does everything (letters or numbers to answer, Enter to go on).
 * Used by candidates (/take) and by staff previews.
 */
export function AssessmentRunner({
  name,
  questions,
  settings,
  initialAnswers,
  deadlineAt,
  clockOffsetMs = 0,
  onAnswer,
  onSubmit,
  submitting = false,
  saveStatus = "idle",
  highlights,
  brand,
  banner,
}: AssessmentRunnerProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [answers, setAnswers] = useState<RunnerAnswers>(() => ({ ...initialAnswers }));
  const [index, setIndex] = useState(() =>
    resumeAt(questions, initialAnswers ?? {}, settings.allowBackNavigation),
  );
  const [direction, setDirection] = useState<Direction>(1);
  const [blinking, setBlinking] = useState<string | null>(null);
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const advanceTimer = useRef<number | undefined>(undefined);
  const timedOut = useRef(false);

  const remaining = useCountdown(deadlineAt, clockOffsetMs);
  const question = questions[index];
  const lastIndex = questions.length - 1;
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const unanswered = questions.flatMap((q, i) => (answers[q.id] ? [] : [i]));
  const chosen = question ? answers[question.id] : undefined;

  // Each new question's heading takes focus when it arrives, so screen
  // readers announce it. Stable, so it runs once per question.
  const focusHeading = useCallback((node: HTMLHeadingElement | null) => {
    node?.focus({ preventScroll: true });
  }, []);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  // Out of time: hand in what there is, once.
  useEffect(() => {
    if (remaining !== 0 || timedOut.current) return;
    timedOut.current = true;
    window.clearTimeout(advanceTimer.current);
    onSubmit(answers, "timed-out");
  }, [remaining, answers, onSubmit]);

  function go(target: number) {
    window.clearTimeout(advanceTimer.current);
    setBlinking(null);
    if (target < 0 || target > lastIndex || target === index) return;
    if (target < index && !settings.allowBackNavigation) return;
    setDirection(target > index ? 1 : -1);
    setIndex(target);
  }

  function next() {
    if (index === lastIndex) setReviewOpen(true);
    else go(index + 1);
  }

  function choose(optionId: string, confirmed: boolean) {
    if (!question || submitting) return;
    window.clearTimeout(advanceTimer.current);
    setAnswers((current) => ({ ...current, [question.id]: optionId }));
    onAnswer?.(question.id, optionId);

    if (!confirmed || index === lastIndex) {
      setBlinking(null);
      return;
    }
    if (!reduceMotion) setBlinking(optionId);
    const target = index + 1;
    advanceTimer.current = window.setTimeout(
      () => go(target),
      reduceMotion ? ADVANCE_DELAY_REDUCED_MS : ADVANCE_DELAY_MS,
    );
  }

  // Letters (or numbers on a scale) answer; Enter moves on.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (reviewOpen || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='alertdialog']")) {
        return;
      }
      if (event.key === "Enter") {
        // Buttons and links handle their own Enter; an option doesn't.
        if (target?.closest("a, button:not([role='radio'])")) return;
        event.preventDefault();
        next();
        return;
      }
      const option = optionForKey(event.key, question);
      if (option) {
        event.preventDefault();
        choose(option.id, true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const warning =
    remaining === null
      ? ""
      : remaining <= 60_000
        ? "Less than a minute left."
        : remaining <= 300_000
          ? "Five minutes or less left."
          : "";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {banner}
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
          {brand}
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</p>
          {remaining !== null ? <RunnerTimer remainingMs={remaining} /> : null}
        </div>
        <ProgressLine
          value={questions.length > 0 ? answeredCount / questions.length : 0}
          reduceMotion={reduceMotion}
        />
      </header>

      <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 pt-8 pb-32 md:pt-12">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {question ? (
              <motion.section
                key={question.id}
                custom={direction}
                variants={questionVariants(reduceMotion)}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <RunnerQuestion
                  question={question}
                  total={questions.length}
                  value={chosen}
                  blinking={blinking}
                  highlight={highlights?.get(question.id)}
                  reduceMotion={reduceMotion}
                  audioReplays={settings.audioReplays}
                  plays={plays[question.id] ?? 0}
                  onPlay={() =>
                    setPlays((current) => ({
                      ...current,
                      [question.id]: (current[question.id] ?? 0) + 1,
                    }))
                  }
                  onChoose={choose}
                  onConfirm={next}
                  headingRef={focusHeading}
                />
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {index === lastIndex ? (
                    <Button size="lg" onClick={() => setReviewOpen(true)} disabled={submitting}>
                      {submitting ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                      {submitting ? "Submitting…" : "Submit"}
                    </Button>
                  ) : (
                    <Button size="lg" variant={chosen ? "default" : "outline"} onClick={next}>
                      {chosen ? "OK" : "Skip"}
                      {chosen ? <CheckIcon data-icon="inline-end" /> : <ArrowDownIcon data-icon="inline-end" />}
                    </Button>
                  )}
                  <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:inline-flex">
                    press <Kbd>Enter ↵</Kbd>
                  </span>
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
          <SaveIndicator status={saveStatus} />
          <p className="text-sm text-muted-foreground tabular-nums">
            {index + 1} of {questions.length}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => go(index - 1)}
              disabled={!settings.allowBackNavigation || index === 0}
              aria-label="Previous question"
            >
              <ChevronUpIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={next}
              disabled={submitting}
              aria-label={index === lastIndex ? "Review and submit" : "Next question"}
            >
              <ChevronDownIcon />
            </Button>
          </div>
        </div>
      </footer>

      <p className="sr-only" aria-live="polite">
        {warning}
      </p>

      <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {unanswered.length === 0
                ? `You answered all ${questions.length} questions.`
                : `You answered ${answeredCount} of ${questions.length} questions. Questions left blank score nothing.`}{" "}
              You can’t change your answers after you submit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {unanswered.length > 0 && settings.allowBackNavigation ? (
            <div className="flex flex-wrap gap-1.5">
              {unanswered.slice(0, 12).map((i) => (
                <Button
                  key={questions[i]?.id ?? i}
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setReviewOpen(false);
                    go(i);
                  }}
                >
                  Question {i + 1}
                </Button>
              ))}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => onSubmit(answers, "submitted")}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** A thin bar under the header that fills as questions are answered. */
function ProgressLine({ value, reduceMotion }: { value: number; reduceMotion: boolean }) {
  return (
    <div
      role="progressbar"
      aria-label="Questions answered"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="h-1 w-full bg-primary/10"
    >
      <motion.div
        className="h-full origin-left bg-primary"
        initial={false}
        animate={{ scaleX: value }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 26 }}
      />
    </div>
  );
}

const SAVE_TEXT: Record<Exclude<SaveStatus, "idle">, string> = {
  saving: "Saving…",
  saved: "Saved",
  offline: "Offline. Your answers will save when you’re back.",
  error: "Couldn’t save. Trying again…",
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const trouble = status === "offline" || status === "error";
  return (
    <p
      role="status"
      className={cn("flex items-center gap-1.5 text-xs", trouble ? "text-warning" : "text-muted-foreground")}
    >
      {status === "saving" ? (
        <Spinner className="size-3.5" />
      ) : trouble ? (
        <CloudOffIcon aria-hidden="true" className="size-3.5" />
      ) : (
        <CloudIcon aria-hidden="true" className="size-3.5" />
      )}
      <span className={trouble ? undefined : "hidden sm:inline"}>{SAVE_TEXT[status]}</span>
    </p>
  );
}

/**
 * Where a returning candidate picks up: the first unanswered question, or,
 * when going back isn't allowed, the one after the last answer.
 */
function resumeAt(questions: TakeQuestion[], answers: RunnerAnswers, canGoBack: boolean): number {
  if (questions.length === 0) return 0;
  if (!canGoBack) {
    const lastAnswered = questions.findLastIndex((q) => answers[q.id]);
    return Math.min(lastAnswered + 1, questions.length - 1);
  }
  const open = questions.findIndex((q) => !answers[q.id]);
  return open === -1 ? questions.length - 1 : open;
}

function optionForKey(key: string, question: TakeQuestion | undefined): TakeOption | undefined {
  if (!question) return undefined;
  if (question.type === "RATING_SCALE") {
    return /^[1-9]$/.test(key) ? question.options[Number(key) - 1] : undefined;
  }
  const position = OPTION_KEYS.indexOf(key.toUpperCase());
  return position === -1 ? undefined : question.options[position];
}
