import { Injectable } from '@nestjs/common';
import { FINISHED_STATUSES } from '../assessments/assessments.constants';
import { AssessmentsService } from '../assessments/assessments.service';
import { AttemptsService } from '../assessments/attempts.service';
import { NO_STATS } from '../assessments/dto/assessment-response.dto';
import { invitationStatus } from '../assessments/invitation.mapper';
import { AttemptStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardDto,
  DashboardTestDto,
  LinkProgressDto,
  RecentResultDto,
} from './dto/dashboard-response.dto';

/** How many finished candidates the home page lists. */
const RECENT_RESULTS = 5;

/** The little of a sent link that the counts need. */
export interface LinkRow {
  revokedAt: Date | null;
  expiresAt: Date;
  attempts: readonly { status: AttemptStatus }[];
}

export interface LinkCounts {
  progress: LinkProgressDto;
  expiredInvitations: number;
}

/**
 * Sorts sent links into the home page's four numbers. It asks
 * `invitationStatus()` for each link's status, the same function the Sent tab
 * shows, so the dashboard can't drift from the list behind it. Revoked links
 * are counted nowhere.
 */
export function countLinks(rows: readonly LinkRow[], now: number): LinkCounts {
  const progress: LinkProgressDto = {
    notStarted: 0,
    inProgress: 0,
    completed: 0,
  };
  let expiredInvitations = 0;

  for (const row of rows) {
    switch (invitationStatus(row, row.attempts, now)) {
      case 'NOT_STARTED':
        progress.notStarted += 1;
        break;
      case 'IN_PROGRESS':
        progress.inProgress += 1;
        break;
      case 'COMPLETED':
        progress.completed += 1;
        break;
      case 'EXPIRED':
        expiredInvitations += 1;
        break;
      case 'REVOKED':
        break;
    }
  }

  return { progress, expiredInvitations };
}

/** The numbers on the staff home page. See docs/dashboard.md. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessments: AssessmentsService,
    private readonly attempts: AttemptsService,
  ) {}

  async read(): Promise<DashboardDto> {
    // The Sent list closes overdue attempts before it reads them; so does
    // this, or a candidate whose time ran out would still count as busy.
    await this.attempts.finalizeOverdue();

    const [links, tests, recentResults] = await Promise.all([
      this.links(),
      this.tests(),
      this.recentResults(),
    ]);
    return { ...links, tests, recentResults };
  }

  /** Every link that hasn't been revoked, folded into the four counts. */
  private async links(): Promise<LinkCounts> {
    const rows = await this.prisma.assessmentInvitation.findMany({
      where: { revokedAt: null },
      select: {
        revokedAt: true,
        expiresAt: true,
        attempts: { select: { status: true } },
      },
    });
    return countLinks(rows, Date.now());
  }

  /**
   * The tests that have been sent, with the library's own figures. A test
   * nobody has been sent would only pad the table with zeroes.
   */
  private async tests(): Promise<DashboardTestDto[]> {
    const assessments = await this.prisma.assessment.findMany({
      where: { attempts: { some: {} } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, durationMinutes: true },
    });
    const stats = await this.assessments.stats(
      assessments.map((assessment) => assessment.id),
    );

    return assessments.map((assessment) => {
      const { completedCount, averageScore } =
        stats.get(assessment.id) ?? NO_STATS;
      return {
        id: assessment.id,
        name: assessment.name,
        durationMinutes: assessment.durationMinutes,
        completed: completedCount,
        averageScore,
      };
    });
  }

  /**
   * The last few candidates to finish something: one row per link with at
   * least one finished test, newest first. Grouping by link gives the counts
   * and the mean in one query, and the names come in a second, so a busy
   * week is still two queries rather than one per candidate.
   */
  private async recentResults(): Promise<RecentResultDto[]> {
    const finished = await this.prisma.assessmentAttempt.groupBy({
      by: ['invitationId'],
      where: {
        status: { in: [...FINISHED_STATUSES] },
        invitation: { revokedAt: null },
      },
      _max: { finishedAt: true },
      _avg: { score: true },
      _count: { _all: true },
      orderBy: { _max: { finishedAt: 'desc' } },
      take: RECENT_RESULTS,
    });
    if (finished.length === 0) return [];

    const invitations = await this.prisma.assessmentInvitation.findMany({
      where: { id: { in: finished.map((row) => row.invitationId) } },
      select: {
        id: true,
        candidate: { select: { id: true, name: true } },
        _count: { select: { attempts: true } },
      },
    });
    const byId = new Map(
      invitations.map((invitation) => [invitation.id, invitation]),
    );

    // Keep the order the group-by gave, which is the order staff want.
    return finished.flatMap((row) => {
      const invitation = byId.get(row.invitationId);
      const finishedAt = row._max.finishedAt;
      if (!invitation || !finishedAt) return [];
      return [
        {
          invitationId: row.invitationId,
          candidate: invitation.candidate,
          testsFinished: row._count._all,
          testsTotal: invitation._count.attempts,
          averageScore: row._avg.score,
          finishedAt,
        },
      ];
    });
  }
}
