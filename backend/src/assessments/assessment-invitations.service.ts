import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/auth.types';
import { CandidatesService } from '../candidates/candidates.service';
import { FRONTEND_ROUTES, frontendPathLink } from '../common/frontend-links';
import { generateToken, hashToken } from '../common/tokens';
import { EnvironmentVariables } from '../config/env.validation';
import { Prisma } from '../generated/prisma/client';
import { AssessmentStatus, AttemptStatus } from '../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_EXPIRY_DAYS } from './assessments.constants';
import { AssessmentsService } from './assessments.service';
import { AttemptsService } from './attempts.service';
import { publishProblems } from './canonical/canonical.mapper';
import { buildSnapshot, readSnapshot, toJson } from './canonical/snapshot';
import type {
  CreateAssessmentInvitationDto,
  InvitationDetailDto,
  InvitationListDto,
  ListInvitationsQueryDto,
  ResendInvitationDto,
  SentInvitationDto,
} from './dto/invitation.dto';
import {
  attemptResult,
  attemptSummary,
  invitationStatus,
  isFinished,
} from './invitation.mapper';

const INVITATION_NOT_FOUND = 'That invitation doesn’t exist.';
const DAY_MS = 86_400_000;

const summaryInclude = {
  candidate: { select: { id: true, name: true, email: true } },
  sentBy: { select: { id: true, name: true } },
  attempts: {
    orderBy: { order: 'asc' },
    select: {
      id: true,
      assessmentId: true,
      status: true,
      score: true,
      bandLabel: true,
      startedAt: true,
      finishedAt: true,
      assessment: { select: { name: true } },
    },
  },
} satisfies Prisma.AssessmentInvitationInclude;

const detailInclude = {
  candidate: { select: { id: true, name: true, email: true } },
  sentBy: { select: { id: true, name: true } },
  attempts: {
    orderBy: { order: 'asc' },
    include: { answers: { select: { questionId: true, optionId: true } } },
  },
} satisfies Prisma.AssessmentInvitationInclude;

const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS);

/**
 * Sending tests to candidates: one link per send, emailed, with each test
 * frozen as it was when sent. Staff read results here. See docs/assessments.md.
 */
@Injectable()
export class AssessmentInvitationsService {
  private readonly logger = new Logger(AssessmentInvitationsService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly assessments: AssessmentsService,
    private readonly candidates: CandidatesService,
    private readonly attempts: AttemptsService,
    private readonly mail: MailService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true });
  }

  async create(
    dto: CreateAssessmentInvitationDto,
    sender: AuthUser,
  ): Promise<SentInvitationDto> {
    if (Boolean(dto.candidateId) === Boolean(dto.candidate)) {
      throw new BadRequestException(
        'Choose an existing candidate, or enter a new one’s name and email.',
      );
    }

    const ids = [...new Set(dto.assessmentIds)];
    const contents = await Promise.all(
      ids.map((id) => this.assessments.content(id)),
    );
    const problems = contents.flatMap((content) =>
      content.status !== AssessmentStatus.PUBLISHED
        ? [
            `${content.name} is ${content.status === AssessmentStatus.DRAFT ? 'a draft' : 'archived'}. Publish it before sending.`,
          ]
        : publishProblems(content).map(
            (problem) => `${content.name}: ${problem}`,
          ),
    );
    if (problems.length > 0) throw new BadRequestException(problems);

    const candidate = dto.candidateId
      ? await this.candidates.get(dto.candidateId)
      : await this.candidates.upsert(
          dto.candidate as { name: string; email: string },
        );

    const open = await this.prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId: { in: ids },
        status: { in: [AttemptStatus.NOT_STARTED, AttemptStatus.IN_PROGRESS] },
        invitation: {
          candidateId: candidate.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      },
      select: { assessment: { select: { name: true } } },
    });
    if (open) {
      throw new ConflictException(
        `${candidate.name} already has ${open.assessment.name} in a link that’s still open. Resend that link from the Sent tab instead.`,
      );
    }

    const token = generateToken();
    const invitation = await this.prisma.assessmentInvitation.create({
      data: {
        candidateId: candidate.id,
        tokenHash: hashToken(token),
        expiresAt: daysFromNow(dto.expiresInDays ?? DEFAULT_EXPIRY_DAYS),
        sentById: sender.id,
        message: dto.message ?? null,
        attempts: {
          create: contents.map((content, order) => ({
            assessmentId: content.id,
            order,
            snapshot: toJson(buildSnapshot(content)),
          })),
        },
      },
    });

    const link = this.link(token);
    const emailSent = await this.sendEmail(invitation.id, link);
    return { invitation: await this.detail(invitation.id), link, emailSent };
  }

  async list(query: ListInvitationsQueryDto): Promise<InvitationListDto> {
    await this.attempts.finalizeOverdue();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const insensitive = Prisma.QueryMode.insensitive;
    const where: Prisma.AssessmentInvitationWhereInput = {
      ...(query.candidateId ? { candidateId: query.candidateId } : {}),
      ...(query.assessmentId
        ? { attempts: { some: { assessmentId: query.assessmentId } } }
        : {}),
      ...(query.search
        ? {
            candidate: {
              OR: [
                { name: { contains: query.search, mode: insensitive } },
                { email: { contains: query.search, mode: insensitive } },
              ],
            },
          }
        : {}),
    };

    const [total, invitations] = await this.prisma.$transaction([
      this.prisma.assessmentInvitation.count({ where }),
      this.prisma.assessmentInvitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: summaryInclude,
      }),
    ]);

    return {
      items: invitations.map((invitation) => ({
        id: invitation.id,
        candidate: invitation.candidate,
        sentBy: invitation.sentBy,
        status: invitationStatus(invitation, invitation.attempts),
        createdAt: invitation.createdAt,
        sentAt: invitation.sentAt,
        expiresAt: invitation.expiresAt,
        revokedAt: invitation.revokedAt,
        lastOpenedAt: invitation.lastOpenedAt,
        attempts: invitation.attempts.map((attempt) =>
          attemptSummary(attempt, attempt.assessment.name),
        ),
      })),
      total,
      page,
      pageSize,
    };
  }

  async detail(id: string): Promise<InvitationDetailDto> {
    await this.attempts.finalizeOverdue(id);
    const invitation = await this.prisma.assessmentInvitation.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!invitation) throw new NotFoundException(INVITATION_NOT_FOUND);

    return {
      id: invitation.id,
      candidate: invitation.candidate,
      sentBy: invitation.sentBy,
      status: invitationStatus(invitation, invitation.attempts),
      message: invitation.message,
      createdAt: invitation.createdAt,
      sentAt: invitation.sentAt,
      expiresAt: invitation.expiresAt,
      revokedAt: invitation.revokedAt,
      lastOpenedAt: invitation.lastOpenedAt,
      attempts: invitation.attempts.map(attemptResult),
    };
  }

  /**
   * Emails a fresh link; the old one stops working. An expired link gets a
   * new expiry, so this is also how staff give a candidate more time.
   */
  async resend(
    id: string,
    dto: ResendInvitationDto,
  ): Promise<SentInvitationDto> {
    await this.attempts.finalizeOverdue(id);
    const invitation = await this.prisma.assessmentInvitation.findUnique({
      where: { id },
      include: { attempts: { select: { status: true } } },
    });
    if (!invitation) throw new NotFoundException(INVITATION_NOT_FOUND);
    if (invitation.revokedAt) {
      throw new ConflictException(
        'This link was revoked. Send the tests again instead.',
      );
    }
    if (invitation.attempts.every(isFinished)) {
      throw new ConflictException(
        'The candidate has finished every test in this link.',
      );
    }

    const expiresAt = dto.expiresInDays
      ? daysFromNow(dto.expiresInDays)
      : invitation.expiresAt.getTime() > Date.now()
        ? invitation.expiresAt
        : daysFromNow(DEFAULT_EXPIRY_DAYS);
    const token = generateToken();
    await this.prisma.assessmentInvitation.update({
      where: { id },
      data: { tokenHash: hashToken(token), expiresAt },
    });

    const link = this.link(token);
    const emailSent = await this.sendEmail(id, link);
    return { invitation: await this.detail(id), link, emailSent };
  }

  /** The link stops working at once, including for a test in progress. */
  async revoke(id: string): Promise<void> {
    const { count } = await this.prisma.assessmentInvitation.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      const exists = await this.prisma.assessmentInvitation.count({
        where: { id },
      });
      if (!exists) throw new NotFoundException(INVITATION_NOT_FOUND);
    }
  }

  private link(token: string): string {
    return frontendPathLink(
      this.frontendUrl,
      FRONTEND_ROUTES.takeAssessment,
      token,
    );
  }

  /** Emails the link with the tests still to do. False when the email fails. */
  private async sendEmail(
    invitationId: string,
    link: string,
  ): Promise<boolean> {
    const invitation = await this.prisma.assessmentInvitation.findUniqueOrThrow(
      {
        where: { id: invitationId },
        include: {
          candidate: true,
          sentBy: { select: { name: true } },
          attempts: { orderBy: { order: 'asc' } },
        },
      },
    );
    const tests = invitation.attempts
      .filter((attempt) => !isFinished(attempt))
      .map((attempt) => {
        const snapshot = readSnapshot(attempt.snapshot);
        return {
          name: snapshot.name,
          durationMinutes: snapshot.durationMinutes,
        };
      });

    try {
      await this.mail.sendAssessmentInvitation(invitation.candidate.email, {
        name: invitation.candidate.name,
        tests,
        startUrl: link,
        expiresAt: invitation.expiresAt,
        message: invitation.message,
        sentByName: invitation.sentBy?.name ?? null,
      });
    } catch (error) {
      this.logger.error(
        `The assessment email for invitation ${invitationId} failed`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
    await this.prisma.assessmentInvitation.update({
      where: { id: invitationId },
      data: { sentAt: new Date() },
    });
    return true;
  }
}
