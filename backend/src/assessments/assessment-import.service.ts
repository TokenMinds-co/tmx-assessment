import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AssessmentStatus } from '../generated/prisma/enums';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { IMPORT_TRANSACTION_TIMEOUT_MS } from './assessments.constants';
import type {
  CanonicalAssessment,
  CanonicalMedia,
  CanonicalQuestion,
} from './canonical/canonical.types';
import { documentProblems } from './canonical/document-rules';
import { optionFields, questionFields } from './canonical/question-data';
import { blankToNull, normalizeQuestion } from './canonical/question-rules';

/** Finds the uploaded file a question's media refers to. */
export type MediaLookup = (media: CanonicalMedia | null | undefined) => {
  mediaId: string | null;
  mediaFileName: string | null;
};

/**
 * Writes canonical documents to the database. Used by JSON import, duplicate,
 * the seed and (for questions) the CSV import. See docs/assessments.md.
 */
@Injectable()
export class AssessmentImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a test from a document and returns its id. */
  async create(
    document: CanonicalAssessment,
    options: { createdById: string | null; status: AssessmentStatus },
  ): Promise<string> {
    assertImportable(document);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const { id } = await tx.assessment.create({
            data: {
              ...settingsOf(document),
              status: options.status,
              createdById: options.createdById,
            },
          });
          const lookup = await this.mediaLookup(document.questions, tx);
          await this.writeContent(tx, id, document, lookup);
          return id;
        },
        { timeout: IMPORT_TRANSACTION_TIMEOUT_MS },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `A test with the slug "${document.slug}" already exists. Change the slug and import again.`,
        );
      }
      throw error;
    }
  }

  /**
   * Rewrites a test's settings, sections, questions and bands from a document.
   * Candidates who were already sent it keep the version in their snapshot.
   */
  async replace(
    id: string,
    document: CanonicalAssessment,
    status: AssessmentStatus,
  ): Promise<void> {
    assertImportable(document);
    await this.prisma.$transaction(
      async (tx) => {
        const current = await tx.question.findMany({
          where: { assessmentId: id, mediaId: { not: null } },
          select: { mediaId: true },
        });
        const lookup = await this.mediaLookup(
          document.questions,
          tx,
          current.flatMap((question) => question.mediaId ?? []),
        );
        await tx.question.deleteMany({ where: { assessmentId: id } });
        await tx.assessmentSection.deleteMany({ where: { assessmentId: id } });
        await tx.scoreBand.deleteMany({ where: { assessmentId: id } });
        await tx.assessment.update({
          where: { id },
          data: { ...settingsOf(document), status },
        });
        await this.writeContent(tx, id, document, lookup);
      },
      { timeout: IMPORT_TRANSACTION_TIMEOUT_MS },
    );
  }

  /**
   * Matches each question's media to an uploaded file: by id when it exists
   * on this server, otherwise by file name, preferring files the test already
   * uses. Unmatched names are kept so the editor can ask for the upload.
   */
  async mediaLookup(
    questions: readonly CanonicalQuestion[],
    db: Prisma.TransactionClient = this.prisma,
    preferred: readonly string[] = [],
  ): Promise<MediaLookup> {
    const ids = unique(questions.map((q) => q.media?.assetId));
    const files = unique(questions.map((q) => q.media?.file));
    const byId: { id: string }[] =
      ids.length > 0
        ? await db.mediaAsset.findMany({
            where: { id: { in: ids } },
            select: { id: true },
          })
        : [];
    const byName: { id: string; originalName: string }[] =
      files.length > 0
        ? await db.mediaAsset.findMany({
            where: { originalName: { in: files } },
            select: { id: true, originalName: true },
            orderBy: { createdAt: 'desc' },
          })
        : [];

    const known = new Set(byId.map((asset) => asset.id));
    const favoured = new Set(preferred);
    const named = new Map<string, string>();
    for (const asset of byName) {
      const current = named.get(asset.originalName);
      if (!current || (favoured.has(asset.id) && !favoured.has(current))) {
        named.set(asset.originalName, asset.id);
      }
    }

    return (media) => {
      const assetId = media?.assetId;
      if (assetId && known.has(assetId))
        return { mediaId: assetId, mediaFileName: null };
      const file = blankToNull(media?.file);
      const match = file ? named.get(file) : undefined;
      return match
        ? { mediaId: match, mediaFileName: null }
        : { mediaId: null, mediaFileName: file };
    };
  }

  private async writeContent(
    tx: Prisma.TransactionClient,
    assessmentId: string,
    document: CanonicalAssessment,
    lookup: MediaLookup,
  ): Promise<void> {
    const sectionIds = new Map<string, string>();
    for (const [order, section] of document.sections.entries()) {
      const { id } = await tx.assessmentSection.create({
        data: {
          assessmentId,
          order,
          name: section.name.trim(),
          description: blankToNull(section.description),
          weight: section.weight ?? null,
        },
      });
      sectionIds.set(section.key.toLowerCase(), id);
      sectionIds.set(section.name.trim().toLowerCase(), id);
    }

    for (const [order, raw] of document.questions.entries()) {
      const question = normalizeQuestion(raw);
      const sectionId = question.section
        ? (sectionIds.get(question.section.toLowerCase()) ?? null)
        : null;
      await tx.question.create({
        data: {
          ...questionFields(question, { sectionId, ...lookup(question.media) }),
          assessmentId,
          order,
          options: { create: question.options.map(optionFields) },
        },
      });
    }

    if (document.bands.length > 0) {
      await tx.scoreBand.createMany({
        data: document.bands.map((band, order) => ({
          assessmentId,
          order,
          minScore: band.minScore,
          label: band.label.trim(),
          interpretation: blankToNull(band.interpretation),
          recommendedAction: blankToNull(band.recommendedAction),
        })),
      });
    }
  }
}

function assertImportable(document: CanonicalAssessment): void {
  const problems = documentProblems(document);
  if (problems.length > 0) throw new BadRequestException(problems);
}

function settingsOf(document: CanonicalAssessment) {
  return {
    slug: document.slug,
    name: document.name.trim(),
    tagline: blankToNull(document.tagline),
    description: blankToNull(document.description),
    level: blankToNull(document.level),
    relevantFor: blankToNull(document.relevantFor),
    instructions: blankToNull(document.instructions),
    durationMinutes: document.durationMinutes,
    scoringMethod: document.scoringMethod,
    questionOrder: document.questionOrder,
    shuffleOptions: document.shuffleOptions,
    allowBackNavigation: document.allowBackNavigation,
    audioReplays: document.audioReplays,
  };
}

function unique(values: (string | null | undefined)[]): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}
