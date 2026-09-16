"use client";

import { ArrowRightIcon, CheckIcon, TimerOffIcon } from "lucide-react";
import { CandidateBrand } from "@/components/shared/candidate-brand";
import { DoneMark } from "@/components/shared/done-mark";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import type { TakeOverview, TakeOverviewAttempt } from "@/lib/api/take";
import { formatClock, formatLongDate, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

type Overview = TakeOverview & { clockOffsetMs: number };

const isOpen = (attempt: TakeOverviewAttempt) =>
  attempt.status === "NOT_STARTED" || attempt.status === "IN_PROGRESS";

/** The candidate's start page: a greeting, the sender's note, and the tests. */
export function TakeOverviewScreen({
  overview,
  onOpen,
}: {
  overview: Overview;
  onOpen: (attemptId: string) => void;
}) {
  const firstName = overview.candidateName.split(/\s+/)[0] ?? overview.candidateName;
  const open = overview.attempts.filter(isOpen);
  const minutes = open.reduce((sum, attempt) => sum + attempt.durationMinutes, 0);
  const sender = overview.sentByName ? `${overview.sentByName} from TokenMinds` : "TokenMinds";

  if (open.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <DoneMark />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">You’re all done, {firstName}</h1>
          <p className="text-md text-muted-foreground">
            Thank you. Your answers are in, and the team will be in touch about next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-10 md:py-16">
      <CandidateBrand />
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Hi {firstName}</h1>
        <p className="max-w-[60ch] text-md leading-relaxed text-muted-foreground">
          {sender} sent you {plural(overview.attempts.length, "short test")}.{" "}
          {open.length < overview.attempts.length
            ? `${plural(open.length, "test")} to go, about ${minutes} minutes.`
            : `They take about ${minutes} minutes in total.`}
        </p>
      </div>

      {overview.message ? (
        <figure className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-card">
          <blockquote className="text-[15px] leading-relaxed whitespace-pre-line text-foreground">
            {overview.message}
          </blockquote>
          <figcaption className="text-sm text-muted-foreground">{overview.sentByName ?? "The team"}</figcaption>
        </figure>
      ) : null}

      <ol className="flex flex-col gap-3">
        {overview.attempts.map((attempt, index) => (
          <TestRow
            key={attempt.id}
            attempt={attempt}
            number={index + 1}
            primary={attempt.id === open[0]?.id}
            clockOffsetMs={overview.clockOffsetMs}
            onOpen={() => onOpen(attempt.id)}
          />
        ))}
      </ol>

      <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
        Take them in any order, whenever suits you before {formatLongDate(overview.expiresAt)}. Each
        test has its own timer, which starts when you open it, so start when you can finish it in one go.
      </p>
    </div>
  );
}

function TestRow({
  attempt,
  number,
  primary,
  clockOffsetMs,
  onOpen,
}: {
  attempt: TakeOverviewAttempt;
  number: number;
  primary: boolean;
  clockOffsetMs: number;
  onOpen: () => void;
}) {
  const running = attempt.status === "IN_PROGRESS";
  const left = useCountdown(running ? attempt.deadlineAt : null, clockOffsetMs);
  const done = !isOpen(attempt);

  const detail =
    attempt.status === "SUBMITTED"
      ? "Done. Thank you!"
      : attempt.status === "EXPIRED"
        ? "Time ran out. Your answers were submitted."
        : running
          ? `In progress · ${left === null ? "" : `${formatClock(left)} left`}`
          : `${attempt.durationMinutes} min · ${plural(attempt.questionCount, "question")}`;

  return (
    <li
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center",
        done && "shadow-none",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
            attempt.status === "EXPIRED"
              ? "bg-warning-soft text-warning"
              : done
                ? "bg-success-soft text-success"
                : "bg-primary-soft text-primary",
          )}
        >
          {attempt.status === "EXPIRED" ? (
            <TimerOffIcon aria-hidden="true" className="size-4" />
          ) : done ? (
            <CheckIcon aria-hidden="true" className="size-4" />
          ) : (
            number
          )}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{attempt.name}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{detail}</p>
        </div>
      </div>
      {done ? null : (
        <Button variant={primary ? "default" : "outline"} onClick={onOpen} className="w-full sm:w-auto">
          {running ? "Continue" : "Start"}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      )}
    </li>
  );
}
