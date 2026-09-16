"use client";

import {
  ArrowRightIcon,
  HeadphonesIcon,
  ListChecksIcon,
  LockIcon,
  TimerIcon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { useCountdown } from "@/hooks/use-countdown";
import type { TakeSettings } from "@/lib/api/take";
import { formatClock, plural } from "@/lib/format";

/** The screen before a test starts: how long, how many questions, and the rules. */
export function RunnerIntro({
  name,
  tagline,
  instructions,
  durationMinutes,
  questionCount,
  settings,
  hasAudio,
  resumeDeadline,
  clockOffsetMs = 0,
  starting,
  onStart,
  onBack,
  backLabel = "Back",
  error,
  brand,
  notice,
}: {
  name: string;
  tagline: string | null;
  instructions: string | null;
  durationMinutes: number;
  questionCount: number;
  settings: TakeSettings;
  hasAudio: boolean;
  /** The deadline of a test already started, so the screen can say how long is left. */
  resumeDeadline?: string | null;
  clockOffsetMs?: number;
  starting: boolean;
  onStart: () => void;
  onBack?: () => void;
  backLabel?: string;
  error?: string;
  brand?: React.ReactNode;
  notice?: React.ReactNode;
}) {
  const left = useCountdown(resumeDeadline, clockOffsetMs);
  const resuming = left !== null;
  const scale = settings.scoringMethod === "ALIGNMENT";
  const replays = settings.audioReplays;

  const rules: { icon: LucideIcon; text: string }[] = [
    {
      icon: TimerIcon,
      text: resuming
        ? `${formatClock(left)} left. The timer kept running while you were away.`
        : `${durationMinutes} minutes. The timer starts when you press Start, and keeps running if you close the page.`,
    },
    {
      icon: ListChecksIcon,
      text: `${plural(questionCount, "question")}, one at a time. Your answers are saved as you go.`,
    },
    settings.allowBackNavigation
      ? { icon: Undo2Icon, text: "You can go back and change an answer until you submit." }
      : { icon: LockIcon, text: "Once you move on from a question, you can’t go back to it." },
  ];
  if (hasAudio) {
    rules.push({
      icon: HeadphonesIcon,
      text: `Some questions play a short audio clip, so turn your sound on. ${
        replays === 0
          ? "Each clip plays once."
          : `You can replay each clip ${replays === 1 ? "once" : `${replays} times`}.`
      }`,
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-8 px-4 py-12">
      {brand}
      {notice}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground md:text-3xl">
          {name}
        </h1>
        {tagline ? <p className="text-md text-muted-foreground">{tagline}</p> : null}
      </div>

      <ul className="flex flex-col gap-3.5">
        {rules.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-3 text-[15px] leading-relaxed text-foreground">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="pt-1">{text}</span>
          </li>
        ))}
      </ul>

      {instructions ? (
        <p className="max-w-[65ch] text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">
          {instructions}
        </p>
      ) : null}

      <FormError message={error} />

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={onStart} disabled={starting}>
          {starting ? <Spinner data-icon="inline-start" /> : null}
          {resuming ? "Continue" : "Start"}
          {starting ? null : <ArrowRightIcon data-icon="inline-end" />}
        </Button>
        {onBack ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            {backLabel}
          </Button>
        ) : null}
      </div>

      <p className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
        Keyboard: press <Kbd>{scale ? "1" : "A"}</Kbd>–<Kbd>{scale ? "5" : "D"}</Kbd> to answer and{" "}
        <Kbd>Enter</Kbd> to go on.
      </p>
    </div>
  );
}
