import { Injectable } from '@nestjs/common';
import { AttemptStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { DEADLINE_GRACE_MS } from './assessments.constants';
import { scoreAttempt } from './canonical/scoring';
import { readSnapshot, toJson } from './canonical/snapshot';

export type FinishedStatus =
  typeof AttemptStatus.SUBMITTED | typeof AttemptStatus.EXPIRED;

/** Closing and scoring attempts, for candidates and for staff views. */
@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Past the deadline plus the grace period. */
  isOverdue(attempt: { deadlineAt: Date | null }, now = Date.now()): boolean {
    return (
      attempt.deadlineAt !== null &&
      now > attempt.deadlineAt.getTime() + DEADLINE_GRACE_MS
    );
  }

  /**
   * Closes attempts whose time ran out, scoring what was answered by then.
   * Runs before anything reads attempts, so no one sees a stale "in progress".
   */
  async finalizeOverdue(invitationId?: string): Promise<void> {
    const overdue = await this.prisma.assessmentAttempt.findMany({
      where: {
        status: AttemptStatus.IN_PROGRESS,
        deadlineAt: { lt: new Date(Date.now() - DEADLINE_GRACE_MS) },
        ...(invitationId ? { invitationId } : {}),
      },
      select: { id: true },
    });
    for (const { id } of overdue) await this.finish(id, AttemptStatus.EXPIRED);
  }

  /**
   * Scores an attempt from its snapshot and closes it. The update only
   * applies while the attempt is still in progress, so a submit racing the
   * deadline scores it once.
   */
  async finish(attemptId: string, status: FinishedStatus): Promise<void> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: { select: { questionId: true, optionId: true } } },
    });
    if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) return;

    const result = scoreAttempt(
      readSnapshot(attempt.snapshot),
      new Map(
        attempt.answers.map((answer) => [answer.questionId, answer.optionId]),
      ),
    );
    const now = new Date();
    const end =
      attempt.deadlineAt && attempt.deadlineAt < now ? attempt.deadlineAt : now;

    await this.prisma.assessmentAttempt.updateMany({
      where: { id: attemptId, status: AttemptStatus.IN_PROGRESS },
      data: {
        status,
        finishedAt: now,
        score: result.score,
        bandLabel: result.bandLabel,
        correctCount: result.correctCount,
        questionCount: result.questionCount,
        sectionScores: toJson(result.sections),
        flags: toJson(result.flags),
        timeTakenSeconds: attempt.startedAt
          ? Math.max(
              0,
              Math.round((end.getTime() - attempt.startedAt.getTime()) / 1000),
            )
          : null,
      },
    });
  }
}
