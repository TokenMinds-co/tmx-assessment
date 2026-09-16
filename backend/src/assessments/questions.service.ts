import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentImportService } from './assessment-import.service';
import {
  IMPORT_TRANSACTION_TIMEOUT_MS,
  MAX_QUESTIONS,
  MAX_SECTIONS,
} from './assessments.constants';
import { AssessmentsService } from './assessments.service';
import { slugify, toCanonicalQuestion } from './canonical/canonical.mapper';
import type { CanonicalQuestion } from './canonical/canonical.types';
import {
  type CsvIssue,
  parseQuestionCsv,
  questionsToCsv,
} from './canonical/csv-questions';
import {
  optionFields,
  questionFields,
  type QuestionLinks,
} from './canonical/question-data';
import {
  normalizeQuestion,
  questionProblems,
} from './canonical/question-rules';
import type { AssessmentWithContent } from './canonical/snapshot';
import type { AssessmentDetailDto } from './dto/assessment-response.dto';
import type {
  CsvPreviewRowDto,
  QuestionImportResultDto,
} from './dto/question-import-result.dto';
import type {
  BandInputDto,
  CreateSectionDto,
  QuestionInputDto,
  UpdateSectionDto,
} from './dto/structure-input.dto';

const QUESTION_NOT_FOUND = 'That question isn’t in this test.';
const SECTION_NOT_FOUND = 'That section isn’t in this test.';

/**
 * A test's structure: sections, questions with their options, score bands,
 * and question CSV import and export. Every change returns the whole test, so
 * the editor can replace what it shows in one step.
 */
@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessments: AssessmentsService,
    private readonly importer: AssessmentImportService,
  ) {}

  // --- Sections --------------------------------------------------------------

  async createSection(
    assessmentId: string,
    dto: CreateSectionDto,
  ): Promise<AssessmentDetailDto> {
    const content = await this.assessments.content(assessmentId);
    if (content.sections.length >= MAX_SECTIONS) {
      throw new BadRequestException(
        `A test can have up to ${MAX_SECTIONS} sections.`,
      );
    }
    assertSectionNameFree(content, dto.name);
    await this.prisma.assessmentSection.create({
      data: {
        assessmentId,
        name: dto.name,
        description: dto.description ?? null,
        weight: dto.weight ?? null,
        order: nextOrder(content.sections),
      },
    });
    return this.assessments.detail(assessmentId);
  }

  async updateSection(
    assessmentId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ): Promise<AssessmentDetailDto> {
    const content = await this.assessments.content(assessmentId);
    findSection(content, sectionId);
    if (dto.name !== undefined)
      assertSectionNameFree(content, dto.name, sectionId);
    await this.prisma.assessmentSection.update({
      where: { id: sectionId },
      data: {
        name: dto.name,
        description: dto.description,
        weight: dto.weight,
      },
    });
    return this.assessments.detail(assessmentId);
  }

  /** Its questions stay in the test, without a section. */
  async removeSection(
    assessmentId: string,
    sectionId: string,
  ): Promise<AssessmentDetailDto> {
    findSection(await this.assessments.content(assessmentId), sectionId);
    await this.prisma.assessmentSection.delete({ where: { id: sectionId } });
    return this.assessments.detail(assessmentId);
  }

  async reorderSections(
    assessmentId: string,
    ids: string[],
  ): Promise<AssessmentDetailDto> {
    const content = await this.assessments.content(assessmentId);
    assertSameIds(content.sections, ids, 'section');
    await this.prisma.$transaction(
      ids.map((id, order) =>
        this.prisma.assessmentSection.update({
          where: { id },
          data: { order },
        }),
      ),
    );
    return this.assessments.detail(assessmentId);
  }

  // --- Questions -------------------------------------------------------------

  async createQuestion(
    assessmentId: string,
    dto: QuestionInputDto,
  ): Promise<AssessmentDetailDto> {
    const content = await this.assessments.content(assessmentId);
    if (content.questions.length >= MAX_QUESTIONS) {
      throw new BadRequestException(
        `A test can hold up to ${MAX_QUESTIONS} questions.`,
      );
    }
    const { question, links } = await this.prepare(content, dto);
    await this.prisma.question.create({
      data: {
        ...questionFields(question, links),
        assessmentId,
        order: nextOrder(content.questions),
        options: { create: question.options.map(optionFields) },
      },
    });
    return this.assessments.detail(assessmentId);
  }

  /**
   * Replaces a question. Options sent with an id keep it; options without one
   * are new; options left out are deleted.
   */
  async updateQuestion(
    assessmentId: string,
    questionId: string,
    dto: QuestionInputDto,
  ): Promise<AssessmentDetailDto> {
    const content = await this.assessments.content(assessmentId);
    const existing = findQuestion(content, questionId);
    const { question, links } = await this.prepare(content, dto);

    const known = new Set(existing.options.map((option) => option.id));
    const kept = dto.options
      .map((option) => option.id)
      .filter((id): id is string => id !== undefined && known.has(id));

    await this.prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id: questionId },
        data: questionFields(question, links),
      });
      await tx.questionOption.deleteMany({
        where: { questionId, id: { notIn: kept } },
      });
      for (const [order, option] of question.options.entries()) {
        const data = optionFields(option, order);
        const id = dto.options[order]?.id;
        if (id && known.has(id)) {
          await tx.questionOption.update({ where: { id }, data });
        } else {
          await tx.questionOption.create({ data: { ...data, questionId } });
        }
      }
    });
    return this.assessments.detail(assessmentId);
  }

  /** A copy straight after the original. */
  async duplicateQuestion(
    assessmentId: string,
    questionId: string,
  ): Promise<AssessmentDetailDto> {
    const content = await this.assessments.content(assessmentId);
    const original = findQuestion(content, questionId);
    if (content.questions.length >= MAX_QUESTIONS) {
      throw new BadRequestException(
        `A test can hold up to ${MAX_QUESTIONS} questions.`,
      );
    }
    const copy = normalizeQuestion({
      ...toCanonicalQuestion(original, null),
      ref: null,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.question.updateMany({
        where: { assessmentId, order: { gt: original.order } },
        data: { order: { increment: 1 } },
      });
      await tx.question.create({
        data: {
          ...questionFields(copy, {
            sectionId: original.sectionId,
            mediaId: original.mediaId,
            mediaFileName: original.mediaFileName,
          }),
          assessmentId,
          order: original.order + 1,
          options: { create: copy.options.map(optionFields) },
        },
      });
    });
    return this.assessments.detail(assessmentId);
  }

  async removeQuestion(
    assessmentId: string,
    questionId: string,
  ): Promise<AssessmentDetailDto> {
    findQuestion(await this.assessments.content(assessmentId), questionId);
    await this.prisma.question.delete({ where: { id: questionId } });
    return this.assessments.detail(assessmentId);
  }

  async reorderQuestions(
    assessmentId: string,
    ids: string[],
  ): Promise<AssessmentDetailDto> {
    const content = await this.assessments.content(assessmentId);
    assertSameIds(content.questions, ids, 'question');
    await this.prisma.$transaction(
      ids.map((id, order) =>
        this.prisma.question.update({ where: { id }, data: { order } }),
      ),
    );
    return this.assessments.detail(assessmentId);
  }

  // --- Score bands -----------------------------------------------------------

  async replaceBands(
    assessmentId: string,
    bands: BandInputDto[],
  ): Promise<AssessmentDetailDto> {
    await this.assessments.assertExists(assessmentId);
    const minimums = bands.map((band) => band.minScore);
    if (new Set(minimums).size !== minimums.length) {
      throw new BadRequestException(
        'Two bands start at the same score. Give each band its own minimum.',
      );
    }
    const highestFirst = [...bands].sort((a, b) => b.minScore - a.minScore);
    await this.prisma.$transaction([
      this.prisma.scoreBand.deleteMany({ where: { assessmentId } }),
      this.prisma.scoreBand.createMany({
        data: highestFirst.map((band, order) => ({
          assessmentId,
          order,
          minScore: band.minScore,
          label: band.label,
          interpretation: band.interpretation ?? null,
          recommendedAction: band.recommendedAction ?? null,
        })),
      }),
    ]);
    return this.assessments.detail(assessmentId);
  }

  // --- CSV ---------------------------------------------------------------------

  /**
   * Reads a question CSV into the test. A dry run only reports what would
   * happen; the editor shows that as a preview before the real import.
   */
  async importCsv(
    assessmentId: string,
    file: Buffer,
    mode: 'append' | 'replace',
    dryRun: boolean,
  ): Promise<QuestionImportResultDto> {
    const content = await this.assessments.content(assessmentId);
    const parsed = parseQuestionCsv(decodeCsv(file), content.scoringMethod);
    const errors: CsvIssue[] = [...parsed.errors];
    const warnings: CsvIssue[] = [...parsed.warnings];

    // Sections are matched by name or key; any others are created.
    const sectionIds = new Map<string, string>();
    for (const section of content.sections) {
      sectionIds.set(section.name.toLowerCase(), section.id);
      sectionIds.set(slugify(section.name), section.id);
    }
    const sectionFor = (name: string) =>
      sectionIds.get(name.toLowerCase()) ?? sectionIds.get(slugify(name));
    const newSections: string[] = [];
    for (const { row, question } of parsed.rows) {
      const name = question.section;
      if (
        name &&
        !sectionFor(name) &&
        !newSections.some((n) => n.toLowerCase() === name.toLowerCase())
      ) {
        newSections.push(name);
        warnings.push({
          row,
          column: 'section',
          message: `Creates a new section, "${name}".`,
        });
      }
    }

    const lookup = await this.importer.mediaLookup(
      parsed.rows.map((row) => row.question),
      this.prisma,
      content.questions.flatMap((question) => question.mediaId ?? []),
    );
    const preview: CsvPreviewRowDto[] = parsed.rows.map(({ row, question }) => {
      const file = question.media?.file ?? null;
      const mediaFound = file ? lookup(question.media).mediaId !== null : null;
      if (mediaFound === false) {
        warnings.push({
          row,
          column: 'media',
          message: `No uploaded file is called "${file}" yet. Upload it on the question after importing.`,
        });
      }
      return {
        row,
        ref: question.ref ?? null,
        section: question.section ?? null,
        type: question.type,
        stem: question.stem,
        optionCount: question.options.length,
        correctLabel:
          question.options.find((option) => option.correct)?.label ?? null,
        media: file,
        mediaFound,
      };
    });

    const questionTotal =
      (mode === 'replace' ? 0 : content.questions.length) + parsed.rows.length;
    if (questionTotal > MAX_QUESTIONS) {
      errors.push({
        row: null,
        column: null,
        message: `A test can hold up to ${MAX_QUESTIONS} questions, and this import would make ${questionTotal}.`,
      });
    }
    const sectionTotal = content.sections.length + newSections.length;
    if (sectionTotal > MAX_SECTIONS) {
      errors.push({
        row: null,
        column: null,
        message: `A test can have up to ${MAX_SECTIONS} sections, and this import would make ${sectionTotal}.`,
      });
    }

    const result: QuestionImportResultDto = {
      dryRun,
      mode,
      rowCount: parsed.rows.length,
      importedCount: 0,
      newSections,
      errors,
      warnings: warnings.sort(byRow),
      preview,
    };
    if (dryRun) return result;
    if (errors.length > 0)
      throw new BadRequestException(errors.map(describeIssue));

    await this.prisma.$transaction(
      async (tx) => {
        if (mode === 'replace')
          await tx.question.deleteMany({ where: { assessmentId } });
        let sectionOrder = nextOrder(content.sections);
        for (const name of newSections) {
          const { id } = await tx.assessmentSection.create({
            data: { assessmentId, name, order: sectionOrder++ },
          });
          sectionIds.set(name.toLowerCase(), id);
        }
        let order = mode === 'replace' ? 0 : nextOrder(content.questions);
        for (const { question } of parsed.rows) {
          const sectionId = question.section
            ? (sectionFor(question.section) ?? null)
            : null;
          await tx.question.create({
            data: {
              ...questionFields(question, {
                sectionId,
                ...lookup(question.media),
              }),
              assessmentId,
              order: order++,
              options: { create: question.options.map(optionFields) },
            },
          });
        }
      },
      { timeout: IMPORT_TRANSACTION_TIMEOUT_MS },
    );

    return {
      ...result,
      importedCount: parsed.rows.length,
      assessment: await this.assessments.detail(assessmentId),
    };
  }

  async exportCsv(
    assessmentId: string,
  ): Promise<{ filename: string; text: string }> {
    const content = await this.assessments.content(assessmentId);
    const names = new Map(
      content.sections.map((section) => [section.id, section.name]),
    );
    const questions = content.questions.map((question) =>
      normalizeQuestion(
        toCanonicalQuestion(
          question,
          question.sectionId ? (names.get(question.sectionId) ?? null) : null,
        ),
      ),
    );
    return {
      filename: `${content.slug}-questions.csv`,
      text: questionsToCsv(questions),
    };
  }

  /** Checks a question from the editor and turns it into what's stored. */
  private async prepare(
    content: AssessmentWithContent,
    dto: QuestionInputDto,
  ): Promise<{ question: CanonicalQuestion; links: QuestionLinks }> {
    if (
      dto.sectionId &&
      !content.sections.some((s) => s.id === dto.sectionId)
    ) {
      throw new BadRequestException(SECTION_NOT_FOUND);
    }
    const ids = dto.options.flatMap((option) => option.id ?? []);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('The same option id appears twice.');
    }
    if (dto.mediaId) {
      const media = await this.prisma.mediaAsset.findUnique({
        where: { id: dto.mediaId },
        select: { id: true },
      });
      if (!media) {
        throw new BadRequestException(
          'That audio file doesn’t exist any more. Upload it again.',
        );
      }
    }

    const question = normalizeQuestion({
      ref: dto.ref,
      type: dto.type,
      difficulty: dto.difficulty,
      instruction: dto.instruction,
      context: dto.context,
      stem: dto.stem,
      options: dto.options.map((option) => ({
        text: option.text,
        employerText: option.employerText,
        value: option.value,
        correct: option.isCorrect,
      })),
      rationale: dto.rationale,
      transcript: dto.transcript,
      shuffleOptions: dto.shuffleOptions,
      keepLastOptionFixed: dto.keepLastOptionFixed,
      employerPrompt: dto.employerPrompt,
      employerValue: dto.employerValue,
    });
    const problems = questionProblems(question, content.scoringMethod);
    if (problems.length > 0) throw new BadRequestException(problems);

    return {
      question,
      links: {
        sectionId: dto.sectionId ?? null,
        mediaId: dto.mediaId ?? null,
        mediaFileName: dto.mediaFileName ?? null,
      },
    };
  }
}

function findQuestion(content: AssessmentWithContent, questionId: string) {
  const question = content.questions.find((q) => q.id === questionId);
  if (!question) throw new NotFoundException(QUESTION_NOT_FOUND);
  return question;
}

function findSection(content: AssessmentWithContent, sectionId: string) {
  const section = content.sections.find((s) => s.id === sectionId);
  if (!section) throw new NotFoundException(SECTION_NOT_FOUND);
  return section;
}

function assertSectionNameFree(
  content: AssessmentWithContent,
  name: string,
  exceptId?: string,
): void {
  const taken = content.sections.some(
    (section) =>
      section.id !== exceptId &&
      section.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken)
    throw new ConflictException(
      `This test already has a section called "${name}".`,
    );
}

function assertSameIds(
  items: readonly { id: string }[],
  ids: readonly string[],
  noun: string,
): void {
  const expected = new Set(items.map((item) => item.id));
  const valid =
    ids.length === expected.size &&
    new Set(ids).size === ids.length &&
    ids.every((id) => expected.has(id));
  if (!valid) {
    throw new BadRequestException(
      `Send every ${noun} id in this test once, in the new order.`,
    );
  }
}

function nextOrder(items: readonly { order: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.order + 1), 0);
}

/** UTF-8, or the Windows encoding older Excel versions use for "CSV (Comma delimited)". */
function decodeCsv(data: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    return new TextDecoder('windows-1252').decode(data);
  }
}

function describeIssue(issue: CsvIssue): string {
  const where = [
    issue.row === null ? 'The file' : `Row ${issue.row}`,
    issue.column,
  ]
    .filter(Boolean)
    .join(', ');
  return `${where}: ${issue.message}`;
}

function byRow(a: CsvIssue, b: CsvIssue): number {
  return (a.row ?? 0) - (b.row ?? 0);
}
