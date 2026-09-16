import type {
  AssessmentAttempt,
  AssessmentInvitation,
} from '../generated/prisma/client';
import { AttemptStatus } from '../generated/prisma/enums';
import { isScale } from './canonical/question-rules';
import type { AlignmentFlag, SectionScore } from './canonical/scoring';
import { readSnapshot, type SnapshotQuestion } from './canonical/snapshot';
import type {
  AnswerReviewDto,
  AttemptResultDto,
  AttemptSummaryDto,
  InvitationStatus,
} from './dto/invitation.dto';

export function isFinished(attempt: { status: AttemptStatus }): boolean {
  return (
    attempt.status === AttemptStatus.SUBMITTED ||
    attempt.status === AttemptStatus.EXPIRED
  );
}

/** One status for a whole link, from its tests. */
export function invitationStatus(
  invitation: Pick<AssessmentInvitation, 'revokedAt' | 'expiresAt'>,
  attempts: readonly { status: AttemptStatus }[],
  now = Date.now(),
): InvitationStatus {
  if (invitation.revokedAt) return 'REVOKED';
  if (attempts.length > 0 && attempts.every(isFinished)) return 'COMPLETED';
  const running = attempts.some((a) => a.status === AttemptStatus.IN_PROGRESS);
  if (invitation.expiresAt.getTime() <= now && !running) return 'EXPIRED';
  return attempts.some((a) => a.status !== AttemptStatus.NOT_STARTED)
    ? 'IN_PROGRESS'
    : 'NOT_STARTED';
}

type SummaryAttempt = Pick<
  AssessmentAttempt,
  | 'id'
  | 'assessmentId'
  | 'status'
  | 'score'
  | 'bandLabel'
  | 'startedAt'
  | 'finishedAt'
>;

export function attemptSummary(
  attempt: SummaryAttempt,
  name: string,
): AttemptSummaryDto {
  return {
    id: attempt.id,
    assessmentId: attempt.assessmentId,
    name,
    status: attempt.status,
    score: attempt.score,
    bandLabel: attempt.bandLabel,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
  };
}

/** A test's result, read from its snapshot. Answers are shown once it's finished. */
export function attemptResult(
  attempt: AssessmentAttempt & {
    answers: { questionId: string; optionId: string }[];
  },
): AttemptResultDto {
  const snapshot = readSnapshot(attempt.snapshot);
  const finished = isFinished(attempt);
  const chosen = new Map(
    attempt.answers.map((a) => [a.questionId, a.optionId]),
  );
  const sections = new Map(snapshot.sections.map((s) => [s.id, s.name]));
  const band = attempt.bandLabel
    ? (snapshot.bands.find((b) => b.label === attempt.bandLabel) ?? null)
    : null;

  return {
    ...attemptSummary(attempt, snapshot.name),
    tagline: snapshot.tagline,
    scoringMethod: snapshot.scoringMethod,
    durationMinutes: snapshot.durationMinutes,
    questionCount: snapshot.questions.length,
    answeredCount: attempt.answers.length,
    deadlineAt: attempt.deadlineAt,
    timeTakenSeconds: attempt.timeTakenSeconds,
    correctCount: attempt.correctCount,
    band,
    sections: finished
      ? ((attempt.sectionScores as unknown as SectionScore[] | null) ?? [])
      : [],
    flags: finished
      ? ((attempt.flags as unknown as AlignmentFlag[] | null) ?? [])
      : [],
    answers: finished
      ? snapshot.questions.map((question, index) =>
          review(question, index, chosen.get(question.id), sections),
        )
      : [],
  };
}

function review(
  question: SnapshotQuestion,
  index: number,
  chosenId: string | undefined,
  sections: Map<string, string>,
): AnswerReviewDto {
  const scale = isScale(question.type);
  const option = question.options.find((o) => o.id === chosenId) ?? null;
  const expected = scale
    ? question.options.find((o) => o.value === question.employerValue)
    : question.options.find((o) => o.isCorrect);

  return {
    questionId: question.id,
    number: index + 1,
    ref: question.ref,
    section: question.sectionId
      ? (sections.get(question.sectionId) ?? null)
      : null,
    type: question.type,
    stem: question.stem,
    chosen: option
      ? { label: option.label, text: option.text || option.label }
      : null,
    expected: expected
      ? {
          label: expected.label,
          text:
            (scale ? expected.employerText || expected.text : expected.text) ||
            expected.label,
        }
      : null,
    isCorrect: scale ? null : Boolean(option?.isCorrect),
    candidateValue: scale ? (option?.value ?? null) : null,
    employerValue: scale ? question.employerValue : null,
  };
}
