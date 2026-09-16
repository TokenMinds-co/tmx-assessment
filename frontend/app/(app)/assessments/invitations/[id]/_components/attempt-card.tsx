import { ScoreSummary } from "@/components/shared/score-summary";
import { AttemptStatusBadge } from "@/components/shared/status-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttemptResult } from "@/lib/api/invitations";
import { formatDateTime, formatDuration, plural } from "@/lib/format";
import { AnswerReview } from "./answer-review";

/** One test in a link: where the candidate is with it, then the score and answers. */
export function AttemptCard({ attempt }: { attempt: AttemptResult }) {
  const finished = attempt.status === "SUBMITTED" || attempt.status === "EXPIRED";

  const meta = finished
    ? `Finished ${attempt.finishedAt ? formatDateTime(attempt.finishedAt) : ""} · took ${formatDuration(attempt.timeTakenSeconds)} of ${attempt.durationMinutes} min`
    : attempt.status === "IN_PROGRESS"
      ? `Started ${attempt.startedAt ? formatDateTime(attempt.startedAt) : ""} · ${attempt.answeredCount} of ${attempt.questionCount} answered so far`
      : `Not started · ${attempt.durationMinutes} min, ${plural(attempt.questionCount, "question")}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {attempt.name}
          <AttemptStatusBadge status={attempt.status} />
        </CardTitle>
        <CardDescription className="tabular-nums">{meta}</CardDescription>
      </CardHeader>
      <CardContent className="gap-6">
        {finished ? (
          <>
            <ScoreSummary
              result={{
                score: attempt.score,
                bandLabel: attempt.bandLabel,
                correctCount: attempt.correctCount,
                questionCount: attempt.questionCount,
                answeredCount: attempt.answeredCount,
                sections: attempt.sections,
                flags: attempt.flags,
              }}
              scoringMethod={attempt.scoringMethod}
              band={attempt.band}
            />
            {attempt.answers.length > 0 ? (
              <AnswerReview answers={attempt.answers} scoringMethod={attempt.scoringMethod} />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {attempt.status === "IN_PROGRESS"
              ? "The score appears when the candidate submits, or when the time runs out."
              : "The score appears once the candidate takes this test."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
