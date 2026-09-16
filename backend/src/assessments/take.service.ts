import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AssessmentAttempt } from '../generated/prisma/client';
import { AttemptStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALREADY_FINISHED,
  ATTEMPT_NOT_FOUND,
  NOT_STARTED_YET,
  TAKE_LINK_EXPIRED,
  TIME_UP,
} from './assessments.constants';
import { AttemptsService } from './attempts.service';
import { buildLayout, readLayout } from './canonical/layout';
import { readSnapshot, toJson } from './canonical/snapshot';
import type {
  TakeAttemptDto,
  TakeOverviewDto,
  TakeSubmitDto,
} from './dto/take-response.dto';
import { takeQuestions, takeSettings } from './take-view';
import type { TakeInvitation } from './take.types';

/**
 * What a candidate does through their link: see their tests, start one, save
 * answers and submit. The server owns the clock: the deadline is set at start
 * and late answers are refused. See docs/assessments.md.
 */
@Injectable()
export class TakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attempts: AttemptsService,
  ) {}

  async overview(invitation: TakeInvitation): Promise<TakeOverviewDto> {
    await this.attempts.finalizeOverdue(invitation.id);
    const [attempts] = await Promise.all([
      this.prisma.assessmentAttempt.findMany({
        where: { invitationId: invitation.id },
        orderBy: { order: 'asc' },
      }),
      this.prisma.assessmentInvitation.update({
        where: { id: invitation.id },
        data: { lastOpenedAt: new Date() },
      }),
    ]);

    return {
      candidateName: invitation.candidate.name,
      sentByName: invitation.sentBy?.name ?? null,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
      serverNow: new Date(),
      attempts: attempts.map((attempt) => {
        const snapshot = readSnapshot(attempt.snapshot);
        return {
          id: attempt.id,
          name: snapshot.name,
          tagline: snapshot.tagline,
          instructions: snapshot.instructions,
          durationMinutes: snapshot.durationMinutes,
          questionCount: snapshot.questions.length,
          hasAudio: snapshot.questions.some(
            (question) => question.media !== null,
          ),
          settings: takeSettings(snapshot),
          status: attempt.status,
          deadlineAt: attempt.deadlineAt,
        };
      }),
    };
  }

  /**
   * Starts the clock on first call: sets the deadline and draws this
   * attempt's question order. Later calls resume with the saved answers.
   */
  async start(
    invitation: TakeInvitation,
    attemptId: string,
  ): Promise<TakeAttemptDto> {
    await this.attempts.finalizeOverdue(invitation.id);
    let attempt = await this.findAttempt(invitation, attemptId);
    if (
      attempt.status === AttemptStatus.SUBMITTED ||
      attempt.status === AttemptStatus.EXPIRED
    ) {
      throw new ConflictException(ALREADY_FINISHED);
    }

    if (attempt.status === AttemptStatus.NOT_STARTED) {
      if (invitation.expiresAt.getTime() <= Date.now()) {
        throw new GoneException(TAKE_LINK_EXPIRED);
      }
      const snapshot = readSnapshot(attempt.snapshot);
      const now = new Date();
      // Conditional, so two tabs starting at once share one deadline and order.
      await this.prisma.assessmentAttempt.updateMany({
        where: { id: attempt.id, status: AttemptStatus.NOT_STARTED },
        data: {
          status: AttemptStatus.IN_PROGRESS,
          startedAt: now,
          deadlineAt: new Date(
            now.getTime() + snapshot.durationMinutes * 60_000,
          ),
          layout: toJson(buildLayout(snapshot)),
        },
      });
      attempt = await this.prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
    }

    const answers = await this.prisma.attemptAnswer.findMany({
      where: { attemptId: attempt.id },
      select: { questionId: true, optionId: true },
    });
    return view(attempt, answers);
  }

  /** Saves or changes one answer. */
  async answer(
    invitation: TakeInvitation,
    attemptId: string,
    questionId: string,
    optionId: string,
  ): Promise<void> {
    const attempt = await this.findAttempt(invitation, attemptId);
    await this.assertOpen(attempt);

    const question = readSnapshot(attempt.snapshot).questions.find(
      (q) => q.id === questionId,
    );
    if (!question?.options.some((option) => option.id === optionId)) {
      throw new BadRequestException(
        'That answer isn’t one of this question’s options.',
      );
    }
    await this.prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, optionId },
      update: { optionId },
    });
  }

  /** Scores and closes the attempt. Safe to repeat. */
  async submit(
    invitation: TakeInvitation,
    attemptId: string,
  ): Promise<TakeSubmitDto> {
    const attempt = await this.findAttempt(invitation, attemptId);
    if (attempt.status === AttemptStatus.NOT_STARTED) {
      throw new ConflictException(NOT_STARTED_YET);
    }
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      await this.attempts.finish(
        attempt.id,
        this.attempts.isOverdue(attempt)
          ? AttemptStatus.EXPIRED
          : AttemptStatus.SUBMITTED,
      );
    }
    const { status } = await this.prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      select: { status: true },
    });
    return { status };
  }

  private async findAttempt(
    invitation: TakeInvitation,
    attemptId: string,
  ): Promise<AssessmentAttempt> {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, invitationId: invitation.id },
    });
    if (!attempt) throw new NotFoundException(ATTEMPT_NOT_FOUND);
    return attempt;
  }

  /** Refuses answers before the start, after the finish, and after the deadline. */
  private async assertOpen(attempt: AssessmentAttempt): Promise<void> {
    if (attempt.status === AttemptStatus.NOT_STARTED) {
      throw new ConflictException(NOT_STARTED_YET);
    }
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ConflictException(ALREADY_FINISHED);
    }
    if (this.attempts.isOverdue(attempt)) {
      await this.attempts.finish(attempt.id, AttemptStatus.EXPIRED);
      throw new ConflictException(TIME_UP);
    }
  }
}

function view(
  attempt: AssessmentAttempt,
  answers: { questionId: string; optionId: string }[],
): TakeAttemptDto {
  const snapshot = readSnapshot(attempt.snapshot);
  const layout = readLayout(attempt.layout) ?? buildLayout(snapshot);
  return {
    id: attempt.id,
    status: attempt.status,
    name: snapshot.name,
    instructions: snapshot.instructions,
    durationMinutes: snapshot.durationMinutes,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    serverNow: new Date(),
    settings: takeSettings(snapshot),
    questions: takeQuestions(snapshot, layout),
    answers,
  };
}
