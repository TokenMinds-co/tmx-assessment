import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  AssessmentStatus,
  AttemptStatus,
  QuestionOrder,
  ScoringMethod,
} from '../generated/prisma/enums';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  isUniqueViolation,
} from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentImportService } from './assessment-import.service';
import { TEXT_LIMITS } from './assessments.constants';
import {
  publishProblems,
  slugify,
  toCanonicalAssessment,
} from './canonical/canonical.mapper';
import type { CanonicalAssessment } from './canonical/canonical.types';
import { buildLayout } from './canonical/layout';
import {
  QUESTION_TYPE_LABELS,
  questionTypesFor,
} from './canonical/question-rules';
import { scoreAttempt } from './canonical/scoring';
import {
  assessmentContentInclude,
  type AssessmentWithContent,
  buildSnapshot,
} from './canonical/snapshot';
import type {
  CreateAssessmentDto,
  UpdateAssessmentDto,
} from './dto/assessment-input.dto';
import {
  AssessmentDetailDto,
  type AssessmentStats,
  type AssessmentSummaryDto,
  NO_STATS,
} from './dto/assessment-response.dto';
import type {
  AnswerInputDto,
  AssessmentPreviewDto,
  ScoreResultDto,
} from './dto/take-response.dto';
import { answerKey, takeQuestions, takeSettings } from './take-view';

export const ASSESSMENT_NOT_FOUND = 'That test doesn’t exist.';
const SENT_CANNOT_DELETE =
  'This test has been sent to candidates, so it can’t be deleted. Archive it instead.';
const FINISHED: readonly AttemptStatus[] = [
  AttemptStatus.SUBMITTED,
  AttemptStatus.EXPIRED,
];

/** Starting bands for a new test. Staff adjust them on the Scoring tab. */
const DEFAULT_BANDS: Record<ScoringMethod, [number, string][]> = {
  CORRECT_ANSWER: [
    [0.85, 'Strong'],
    [0.65, 'Competent'],
    [0.45, 'Developing'],
    [0, 'Needs development'],
  ],
  ALIGNMENT: [
    [0.85, 'Strong fit'],
    [0.7, 'Good fit'],
    [0.55, 'Partial fit'],
    [0, 'Low fit'],
  ],
};

const METHOD_LABELS: Record<ScoringMethod, string> = {
  CORRECT_ANSWER: 'correct answers',
  ALIGNMENT: 'alignment',
};

const slugTaken = (slug: string) =>
  `Another test already uses the slug "${slug}". Choose a different one.`;

/** Test templates: the library, settings, duplication, import, export and preview. */
@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importer: AssessmentImportService,
  ) {}

  async list(status?: AssessmentStatus): Promise<AssessmentSummaryDto[]> {
    const assessments = await this.prisma.assessment.findMany({
      where: status ? { status } : undefined,
      orderBy: { name: 'asc' },
      include: { _count: { select: { questions: true, sections: true } } },
    });
    const ids = assessments.map((assessment) => assessment.id);
    const [stats, missing] = await Promise.all([
      this.stats(ids),
      this.missingMedia(ids),
    ]);
    return assessments.map((assessment) => ({
      id: assessment.id,
      slug: assessment.slug,
      name: assessment.name,
      tagline: assessment.tagline,
      status: assessment.status,
      scoringMethod: assessment.scoringMethod,
      durationMinutes: assessment.durationMinutes,
      questionCount: assessment._count.questions,
      sectionCount: assessment._count.sections,
      missingMediaCount: missing.get(assessment.id) ?? 0,
      ...(stats.get(assessment.id) ?? NO_STATS),
      updatedAt: assessment.updatedAt,
    }));
  }

  /** A test with its sections, questions, options, media and bands. */
  async content(
    id: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<AssessmentWithContent> {
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: assessmentContentInclude,
    });
    if (!assessment) throw new NotFoundException(ASSESSMENT_NOT_FOUND);
    return assessment;
  }

  async assertExists(id: string): Promise<void> {
    const count = await this.prisma.assessment.count({ where: { id } });
    if (count === 0) throw new NotFoundException(ASSESSMENT_NOT_FOUND);
  }

  async detail(id: string): Promise<AssessmentDetailDto> {
    const content = await this.content(id);
    const stats = (await this.stats([id])).get(id) ?? NO_STATS;
    return AssessmentDetailDto.from(content, stats);
  }

  async create(
    dto: CreateAssessmentDto,
    createdById: string,
  ): Promise<AssessmentDetailDto> {
    const slug = dto.slug ?? (await this.uniqueSlug(slugify(dto.name, 'test')));
    try {
      const { id } = await this.prisma.assessment.create({
        data: {
          slug,
          name: dto.name,
          tagline: dto.tagline ?? null,
          scoringMethod: dto.scoringMethod,
          durationMinutes: dto.durationMinutes ?? 15,
          questionOrder: QuestionOrder.FIXED,
          shuffleOptions: dto.scoringMethod === ScoringMethod.CORRECT_ANSWER,
          createdById,
          bands: {
            create: DEFAULT_BANDS[dto.scoringMethod].map(
              ([minScore, label], order) => ({ minScore, label, order }),
            ),
          },
        },
      });
      return this.detail(id);
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException(slugTaken(slug));
      throw error;
    }
  }

  /**
   * Changes settings. Publishing checks the test first, and switching the
   * scoring method is refused while questions of the other kind remain.
   */
  async update(
    id: string,
    dto: UpdateAssessmentDto,
  ): Promise<AssessmentDetailDto> {
    const content = await this.content(id);
    const method = dto.scoringMethod ?? content.scoringMethod;

    if (method !== content.scoringMethod) {
      const allowed = questionTypesFor(method);
      const misfits = content.questions.filter(
        (q) => !allowed.includes(q.type),
      );
      if (misfits.length > 0) {
        const types = [
          ...new Set(
            misfits.map((q) => QUESTION_TYPE_LABELS[q.type].toLowerCase()),
          ),
        ].join(' and ');
        throw new BadRequestException(
          `This test has ${misfits.length} ${types} ${misfits.length === 1 ? 'question' : 'questions'}, which can’t be scored by ${METHOD_LABELS[method]}. Remove them first, or duplicate the test and change the copy.`,
        );
      }
    }

    if (
      dto.status === AssessmentStatus.PUBLISHED &&
      content.status !== AssessmentStatus.PUBLISHED
    ) {
      const problems = publishProblems(content);
      if (problems.length > 0) throw new BadRequestException(problems);
    }

    try {
      await this.prisma.assessment.update({ where: { id }, data: { ...dto } });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(slugTaken(dto.slug ?? content.slug));
      }
      throw error;
    }
    return this.detail(id);
  }

  /** Deletes a test that was never sent. Sent tests can only be archived. */
  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    const sent = await this.prisma.assessmentAttempt.count({
      where: { assessmentId: id },
    });
    if (sent > 0) throw new ConflictException(SENT_CANNOT_DELETE);
    try {
      await this.prisma.assessment.delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyViolation(error))
        throw new ConflictException(SENT_CANNOT_DELETE);
      if (isRecordNotFound(error))
        throw new NotFoundException(ASSESSMENT_NOT_FOUND);
      throw error;
    }
  }

  /** A draft copy with "(copy)" after the name. */
  async duplicate(
    id: string,
    createdById: string,
  ): Promise<AssessmentDetailDto> {
    const document = toCanonicalAssessment(await this.content(id));
    const copyId = await this.importer.create(
      {
        ...document,
        slug: await this.uniqueSlug(`${document.slug}-copy`),
        name: `${document.name} (copy)`.slice(0, TEXT_LIMITS.name),
      },
      { createdById, status: AssessmentStatus.DRAFT },
    );
    return this.detail(copyId);
  }

  async exportDocument(id: string): Promise<CanonicalAssessment> {
    return toCanonicalAssessment(await this.content(id));
  }

  async importDocument(
    document: CanonicalAssessment,
    createdById: string,
  ): Promise<AssessmentDetailDto> {
    const id = await this.importer.create(document, {
      createdById,
      status: AssessmentStatus.DRAFT,
    });
    return this.detail(id);
  }

  /**
   * The test as a candidate would see it, freshly shuffled, with the answer
   * key alongside. Works on drafts, which is the point.
   */
  async preview(id: string): Promise<AssessmentPreviewDto> {
    const content = await this.content(id);
    const snapshot = buildSnapshot(content);
    return {
      assessmentId: content.id,
      name: content.name,
      tagline: content.tagline,
      instructions: content.instructions,
      durationMinutes: content.durationMinutes,
      status: content.status,
      settings: takeSettings(snapshot),
      questions: takeQuestions(snapshot, buildLayout(snapshot)),
      answerKey: answerKey(snapshot),
      problems: publishProblems(content),
    };
  }

  /** What a set of answers would score, without saving anything. */
  async previewScore(
    id: string,
    answers: AnswerInputDto[],
  ): Promise<ScoreResultDto> {
    const snapshot = buildSnapshot(await this.content(id));
    return scoreAttempt(
      snapshot,
      new Map(answers.map((answer) => [answer.questionId, answer.optionId])),
    );
  }

  /** How often each test was sent and completed, and its mean score. */
  async stats(ids: readonly string[]): Promise<Map<string, AssessmentStats>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.assessmentAttempt.groupBy({
      by: ['assessmentId', 'status'],
      where: { assessmentId: { in: [...ids] } },
      _count: { _all: true },
      _avg: { score: true },
    });

    const totals = new Map<
      string,
      AssessmentStats & { sum: number; scored: number }
    >();
    for (const row of rows) {
      const total = totals.get(row.assessmentId) ?? {
        ...NO_STATS,
        sum: 0,
        scored: 0,
      };
      total.sentCount += row._count._all;
      if (FINISHED.includes(row.status)) {
        total.completedCount += row._count._all;
        if (row._avg.score !== null) {
          total.sum += row._avg.score * row._count._all;
          total.scored += row._count._all;
        }
      }
      totals.set(row.assessmentId, total);
    }
    return new Map(
      [...totals].map(([id, total]) => [
        id,
        {
          sentCount: total.sentCount,
          completedCount: total.completedCount,
          averageScore: total.scored > 0 ? total.sum / total.scored : null,
        },
      ]),
    );
  }

  /** The first free slug: `base`, then `base-2`, `base-3`… */
  async uniqueSlug(base: string): Promise<string> {
    const root =
      base.slice(0, TEXT_LIMITS.slug - 4).replace(/-+$/, '') || 'test';
    const taken = new Set(
      (
        await this.prisma.assessment.findMany({
          where: { slug: { startsWith: root } },
          select: { slug: true },
        })
      ).map((assessment) => assessment.slug),
    );
    if (!taken.has(root)) return root;
    for (let n = 2; ; n++) {
      const slug = `${root}-${n}`;
      if (!taken.has(slug)) return slug;
    }
  }

  private async missingMedia(
    ids: readonly string[],
  ): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.question.groupBy({
      by: ['assessmentId'],
      where: {
        assessmentId: { in: [...ids] },
        mediaId: null,
        mediaFileName: { not: null },
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.assessmentId, row._count._all]));
  }
}
