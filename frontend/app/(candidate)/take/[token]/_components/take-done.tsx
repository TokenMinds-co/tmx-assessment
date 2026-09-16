"use client";

import { ArrowRightIcon } from "lucide-react";
import { DoneMark } from "@/components/shared/done-mark";
import { Button } from "@/components/ui/button";
import type { TakeOverview } from "@/lib/api/take";

/** After a test: thanks, and the next test if there is one. */
export function TakeDone({
  name,
  timedOut,
  finishedId,
  overview,
  onNext,
  onBack,
}: {
  name: string;
  timedOut: boolean;
  finishedId: string;
  overview: TakeOverview;
  onNext: (attemptId: string) => void;
  onBack: () => void;
}) {
  // The overview may not have caught up yet, so skip the test just finished.
  const next = overview.attempts.find(
    (attempt) =>
      attempt.id !== finishedId && (attempt.status === "NOT_STARTED" || attempt.status === "IN_PROGRESS"),
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <DoneMark />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground">
          {timedOut ? "Time’s up" : `${name} is done`}
        </h1>
        <p className="text-md text-muted-foreground">
          {timedOut ? "Your answers so far were submitted." : "Thank you. Your answers are in."}
        </p>
      </div>
      {next ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Next up: {next.name}, about {next.durationMinutes} minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => onNext(next.id)}>
              Go to {next.name}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="ghost" onClick={onBack}>
              Take a break
            </Button>
          </div>
        </div>
      ) : (
        <p className="max-w-[45ch] text-[15px] leading-relaxed text-muted-foreground">
          That was the last one. The team will be in touch about next steps. You can close this page.
        </p>
      )}
    </div>
  );
}
