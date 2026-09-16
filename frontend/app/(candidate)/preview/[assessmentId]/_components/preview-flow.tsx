"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeftIcon, EyeIcon, FileQuestionIcon, ShuffleIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssessmentRunner, type RunnerAnswers } from "@/components/shared/assessment-runner";
import { CandidateBrand } from "@/components/shared/candidate-brand";
import { DoneMark } from "@/components/shared/done-mark";
import { FormError } from "@/components/shared/form-error";
import { RunnerIntro } from "@/components/shared/runner-intro";
import { ScoreSummary } from "@/components/shared/score-summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { type AssessmentPreview, scorePreview } from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { plural } from "@/lib/format";

type Phase = "intro" | "running" | "result";

/** The runner in preview mode: a banner with the answer key, and a score at the end. */
export function PreviewFlow({ preview }: { preview: AssessmentPreview }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [run, setRun] = useState(0);
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const score = useMutation({
    mutationFn: (answers: RunnerAnswers) =>
      scorePreview(
        preview.assessmentId,
        Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId })),
      ),
  });

  const highlights = showKey
    ? new Map(
        preview.answerKey.map((entry) => [
          entry.questionId,
          { optionId: entry.optionId, label: entry.kind === "CORRECT" ? "Correct" : "Role profile" },
        ]),
      )
    : undefined;

  function begin() {
    setDeadlineAt(new Date(Date.now() + preview.durationMinutes * 60_000).toISOString());
    setRun((count) => count + 1);
    score.reset();
    setPhase("running");
  }

  const banner = (
    <PreviewBanner
      preview={preview}
      showKey={showKey}
      onShowKeyChange={setShowKey}
      onReshuffle={() => {
        setPhase("intro");
        router.refresh();
      }}
    />
  );

  if (preview.questions.length === 0) {
    return (
      <>
        {banner}
        <div className="mx-auto w-full max-w-xl px-4 py-16">
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileQuestionIcon />
              </EmptyMedia>
              <EmptyTitle>No questions yet</EmptyTitle>
              <EmptyDescription>Add questions in the editor, then preview the test here.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href={`/assessments/${preview.assessmentId}`}>Open the editor</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </>
    );
  }

  if (phase === "running") {
    return (
      <AssessmentRunner
        key={run}
        name={preview.name}
        questions={preview.questions}
        settings={preview.settings}
        deadlineAt={deadlineAt}
        onSubmit={(answers) => {
          setPhase("result");
          score.mutate(answers);
        }}
        highlights={highlights}
        banner={banner}
        brand={<CandidateBrand className="hidden sm:block" />}
      />
    );
  }

  if (phase === "result") {
    return (
      <>
        {banner}
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <DoneMark />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Preview finished</h1>
            <p className="max-w-[50ch] text-muted-foreground">
              Candidates only see a thank-you screen. This is what staff see on the results page.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>What these answers score</CardTitle>
              <CardDescription>Scored the same way as a real attempt. Nothing was saved.</CardDescription>
            </CardHeader>
            <CardContent>
              {score.isPending ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : score.isError ? (
                <FormError message={errorMessage(score.error)} />
              ) : score.data ? (
                <ScoreSummary result={score.data} scoringMethod={preview.settings.scoringMethod} />
              ) : null}
            </CardContent>
          </Card>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={begin}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href={`/assessments/${preview.assessmentId}`}>Back to the editor</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {banner}
      <RunnerIntro
        name={preview.name}
        tagline={preview.tagline}
        instructions={preview.instructions}
        durationMinutes={preview.durationMinutes}
        questionCount={preview.questions.length}
        settings={preview.settings}
        hasAudio={preview.questions.some((question) => question.media !== null)}
        starting={false}
        onStart={begin}
        brand={<CandidateBrand />}
        notice={
          preview.problems.length > 0 ? (
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertTitle>Not ready to send yet</AlertTitle>
              <AlertDescription>
                {plural(preview.problems.length, "thing")} to fix first. The editor lists them.
              </AlertDescription>
            </Alert>
          ) : null
        }
      />
    </>
  );
}

function PreviewBanner({
  preview,
  showKey,
  onShowKeyChange,
  onReshuffle,
}: {
  preview: AssessmentPreview;
  showKey: boolean;
  onShowKeyChange: (show: boolean) => void;
  onReshuffle: () => void;
}) {
  return (
    <div className="border-b border-primary/20 bg-primary-soft">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
        <p className="flex items-center gap-2 font-medium text-brand-ink">
          <EyeIcon aria-hidden="true" className="size-4" />
          Preview. Nothing is saved.
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Field orientation="horizontal" className="w-auto">
            <Switch id="answer-key" checked={showKey} onCheckedChange={onShowKeyChange} />
            <FieldLabel htmlFor="answer-key">Answer key</FieldLabel>
          </Field>
          <Button variant="ghost" size="sm" onClick={onReshuffle}>
            <ShuffleIcon data-icon="inline-start" />
            Shuffle again
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/assessments/${preview.assessmentId}`}>
              <ArrowLeftIcon data-icon="inline-start" />
              Editor
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
