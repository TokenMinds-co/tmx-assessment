"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AssessmentRunner, type SaveStatus, type SubmitReason } from "@/components/shared/assessment-runner";
import { CandidateBrand } from "@/components/shared/candidate-brand";
import { RunnerIntro } from "@/components/shared/runner-intro";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnline } from "@/hooks/use-online";
import { ApiError, errorMessage } from "@/lib/api/client";
import {
  getTakeOverview,
  isExpiredLink,
  isInvalidLink,
  isTimeUp,
  saveAnswer,
  startAttempt,
  submitAttempt,
  type TakeAttempt,
} from "@/lib/api/take";
import { takeKeys } from "@/lib/query-keys";
import { CandidateMessage, LinkProblem } from "./candidate-message";
import { TakeDone } from "./take-done";
import { TakeOverviewScreen } from "./take-overview";

type Screen =
  | { kind: "overview" }
  | { kind: "intro"; attemptId: string }
  | { kind: "running"; attempt: TakeAttempt; clockOffsetMs: number }
  | { kind: "done"; attemptId: string; name: string; timedOut: boolean };

/**
 * Everything a candidate does through their link: the list of tests, the
 * intro to each, the runner and the finish screen. Answers are saved one at a
 * time as the candidate goes; the server keeps the clock.
 */
export function TakeFlow({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const online = useOnline();
  const [screen, setScreen] = useState<Screen>({ kind: "overview" });
  const [linkProblem, setLinkProblem] = useState<"invalid" | "expired" | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  // One chain of saves per question, so a quick change of mind can't arrive
  // before the answer it replaces.
  const chains = useRef(new Map<string, Promise<void>>());
  // Answers that couldn't be saved; tried again when the connection returns
  // and before submitting.
  const unsaved = useRef(new Map<string, string>());

  const overview = useQuery({
    queryKey: takeKeys.overview(token),
    queryFn: async () => {
      const data = await getTakeOverview(token);
      // The server's clock minus this device's, so countdowns ignore a wrong device clock.
      return { ...data, clockOffsetMs: Date.parse(data.serverNow) - Date.now() };
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  function noteLinkError(error: unknown) {
    if (isInvalidLink(error)) setLinkProblem("invalid");
    else if (isExpiredLink(error)) setLinkProblem("expired");
  }

  function finish(attemptId: string, name: string, timedOut: boolean) {
    setScreen({ kind: "done", attemptId, name, timedOut });
    void queryClient.invalidateQueries({ queryKey: takeKeys.overview(token) });
  }

  const start = useMutation({
    mutationFn: (attemptId: string) => startAttempt(token, attemptId),
    onSuccess: (attempt) => {
      chains.current.clear();
      unsaved.current.clear();
      setSaveFailed(false);
      setSavedOnce(false);
      setScreen({
        kind: "running",
        attempt,
        clockOffsetMs: Date.parse(attempt.serverNow) - Date.now(),
      });
    },
    onError: noteLinkError,
  });

  const submit = useMutation({
    mutationFn: ({ attempt }: { attempt: TakeAttempt; timedOut: boolean }) => submitAttempt(token, attempt.id),
    // The runner hands in at zero, inside the server's grace period, so the
    // server says SUBMITTED; the candidate still ran out of time.
    onSuccess: (result, { attempt, timedOut }) =>
      finish(attempt.id, attempt.name, timedOut || result.status === "EXPIRED"),
    onError: noteLinkError,
  });

  function persist(attempt: TakeAttempt, questionId: string, optionId: string) {
    unsaved.current.delete(questionId);
    setInFlight((count) => count + 1);
    const previous = chains.current.get(questionId) ?? Promise.resolve();
    const chain = previous
      .then(() => saveWithRetry(token, attempt.id, questionId, optionId))
      .then(() => {
        setSaveFailed(false);
        setSavedOnce(true);
      })
      .catch((error: unknown) => {
        if (isTimeUp(error)) finish(attempt.id, attempt.name, true);
        else if (isInvalidLink(error) || isExpiredLink(error)) noteLinkError(error);
        else {
          unsaved.current.set(questionId, optionId);
          setSaveFailed(true);
        }
      })
      .finally(() => setInFlight((count) => count - 1));
    chains.current.set(questionId, chain);
  }

  function retryUnsaved(attempt: TakeAttempt) {
    const pending = [...unsaved.current.entries()];
    unsaved.current.clear();
    for (const [questionId, optionId] of pending) persist(attempt, questionId, optionId);
  }

  async function handleSubmit(attempt: TakeAttempt, reason: SubmitReason) {
    retryUnsaved(attempt);
    await Promise.allSettled([...chains.current.values()]);
    submit.mutate({ attempt, timedOut: reason === "timed-out" });
  }

  // Back online: save what couldn't be saved.
  const onOnline = useEffectEvent(() => {
    if (screen.kind === "running") retryUnsaved(screen.attempt);
  });
  useEffect(() => {
    const listener = () => onOnline();
    window.addEventListener("online", listener);
    return () => window.removeEventListener("online", listener);
  }, []);

  const saveStatus: SaveStatus =
    !online && (inFlight > 0 || saveFailed)
      ? "offline"
      : saveFailed
        ? "error"
        : inFlight > 0
          ? "saving"
          : savedOnce
            ? "saved"
            : "idle";

  if (linkProblem || isInvalidLink(overview.error) || isExpiredLink(overview.error)) {
    return <LinkProblem expired={linkProblem ? linkProblem === "expired" : isExpiredLink(overview.error)} />;
  }
  if (overview.isPending) return <TakeSkeleton />;
  if (overview.isError) {
    return (
      <CandidateMessage
        title="We couldn’t load your tests"
        action={<Button onClick={() => void overview.refetch()}>Try again</Button>}
      >
        {errorMessage(overview.error)}
      </CandidateMessage>
    );
  }

  const data = overview.data;

  if (screen.kind === "running") {
    const attempt = screen.attempt;
    return (
      <AssessmentRunner
        key={attempt.id}
        name={attempt.name}
        questions={attempt.questions}
        settings={attempt.settings}
        initialAnswers={Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.optionId]))}
        deadlineAt={attempt.deadlineAt}
        clockOffsetMs={screen.clockOffsetMs}
        onAnswer={(questionId, optionId) => persist(attempt, questionId, optionId)}
        onSubmit={(_answers, reason) => void handleSubmit(attempt, reason)}
        submitting={submit.isPending}
        saveStatus={saveStatus}
        brand={<CandidateBrand className="hidden sm:block" />}
      />
    );
  }

  if (screen.kind === "intro") {
    const attempt = data.attempts.find((a) => a.id === screen.attemptId);
    if (attempt && (attempt.status === "NOT_STARTED" || attempt.status === "IN_PROGRESS")) {
      const startError =
        start.error && !isInvalidLink(start.error) && !isExpiredLink(start.error)
          ? errorMessage(start.error)
          : undefined;
      return (
        <RunnerIntro
          name={attempt.name}
          tagline={attempt.tagline}
          instructions={attempt.instructions}
          durationMinutes={attempt.durationMinutes}
          questionCount={attempt.questionCount}
          settings={attempt.settings}
          hasAudio={attempt.hasAudio}
          resumeDeadline={attempt.status === "IN_PROGRESS" ? attempt.deadlineAt : null}
          clockOffsetMs={data.clockOffsetMs}
          starting={start.isPending}
          onStart={() => start.mutate(attempt.id)}
          error={startError}
          onBack={() => setScreen({ kind: "overview" })}
          backLabel="Back to your tests"
          brand={<CandidateBrand />}
        />
      );
    }
  }

  if (screen.kind === "done") {
    return (
      <TakeDone
        name={screen.name}
        timedOut={screen.timedOut}
        finishedId={screen.attemptId}
        overview={data}
        onNext={(attemptId) => setScreen({ kind: "intro", attemptId })}
        onBack={() => setScreen({ kind: "overview" })}
      />
    );
  }

  return (
    <TakeOverviewScreen
      overview={data}
      onOpen={(attemptId) => setScreen({ kind: "intro", attemptId })}
    />
  );
}

/**
 * Saves one answer, trying again after a dropped connection or a server
 * error. A refusal (4xx) is final: time's up, or the link has gone.
 */
async function saveWithRetry(
  token: string,
  attemptId: string,
  questionId: string,
  optionId: string,
  tries = 4,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await saveAnswer(token, attemptId, questionId, optionId);
      return;
    } catch (error) {
      const retryable =
        !(error instanceof ApiError) || error.status === 0 || error.status === 429 || error.status >= 500;
      if (!retryable || attempt >= tries) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(1000 * 2 ** (attempt - 1), 8000)));
    }
  }
}

function TakeSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your tests"
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-10 md:py-16"
    >
      <Skeleton className="h-5 w-24" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}
