import { ApiProperty } from '@nestjs/swagger';
import {
  AssessmentStatus,
  Difficulty,
  QuestionOrder,
  QuestionType,
  ScoringMethod,
} from '../../generated/prisma/enums';
import { mediaUrl } from '../../media/dto/media-response.dto';
import { publishProblems } from '../canonical/canonical.mapper';
import type { AssessmentWithContent } from '../canonical/snapshot';

export interface AssessmentStats {
  sentCount: number;
  completedCount: number;
  averageScore: number | null;
}

export const NO_STATS: AssessmentStats = {
  sentCount: 0,
  completedCount: 0,
  averageScore: null,
};

/** A test in the library list. */
export class AssessmentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'communication' })
  slug!: string;

  @ApiProperty({ example: 'Communication' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  tagline!: string | null;

  @ApiProperty({ enum: AssessmentStatus, enumName: 'AssessmentStatus' })
  status!: AssessmentStatus;

  @ApiProperty({ enum: ScoringMethod, enumName: 'ScoringMethod' })
  scoringMethod!: ScoringMethod;

  @ApiProperty({ example: 8 })
  durationMinutes!: number;

  @ApiProperty({ example: 15 })
  questionCount!: number;

  @ApiProperty({ example: 4 })
  sectionCount!: number;

  @ApiProperty({ description: 'Questions waiting for an audio file.' })
  missingMediaCount!: number;

  @ApiProperty({ description: 'How many times the test was sent.' })
  sentCount!: number;

  @ApiProperty({
    description: 'Attempts submitted or closed by the time limit.',
  })
  completedCount!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Mean score of completed attempts, from 0 to 1.',
  })
  averageScore!: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AssessmentListDto {
  @ApiProperty({ type: [AssessmentSummaryDto] })
  items!: AssessmentSummaryDto[];
}

export class MediaRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '/api/media/0199a0c2-0000-7000-8000-000000000000' })
  url!: string;

  @ApiProperty({ example: 'audio/mpeg' })
  mimeType!: string;

  @ApiProperty({ example: 'listening_Q13.mp3' })
  originalName!: string;
}

export class OptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ example: 'B' })
  label!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ type: String, nullable: true })
  employerText!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  value!: number | null;

  @ApiProperty()
  isCorrect!: boolean;
}

/** A question with its answer key. Staff only. */
export class QuestionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sectionId!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Q5' })
  ref!: string | null;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type!: QuestionType;

  @ApiProperty({ enum: Difficulty, enumName: 'Difficulty', nullable: true })
  difficulty!: Difficulty | null;

  @ApiProperty({ type: String, nullable: true })
  instruction!: string | null;

  @ApiProperty({ type: String, nullable: true })
  context!: string | null;

  @ApiProperty()
  stem!: string;

  @ApiProperty({ type: MediaRefDto, nullable: true })
  media!: MediaRefDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'A file named by an import that hasn’t been uploaded yet.',
  })
  mediaFileName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  employerPrompt!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  employerValue!: number | null;

  @ApiProperty({ type: String, nullable: true })
  rationale!: string | null;

  @ApiProperty({ type: String, nullable: true })
  transcript!: string | null;

  @ApiProperty({ type: Boolean, nullable: true })
  shuffleOptions!: boolean | null;

  @ApiProperty()
  keepLastOptionFixed!: boolean;

  @ApiProperty({ type: [OptionDto] })
  options!: OptionDto[];
}

export class SectionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ example: 'Written communication' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.35 })
  weight!: number | null;

  @ApiProperty()
  questionCount!: number;
}

export class BandDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ example: 0.66 })
  minScore!: number;

  @ApiProperty({ example: 'Competent' })
  label!: string;

  @ApiProperty({ type: String, nullable: true })
  interpretation!: string | null;

  @ApiProperty({ type: String, nullable: true })
  recommendedAction!: string | null;
}

/** A whole test for the editor, answer keys included. Staff only. */
export class AssessmentDetailDto extends AssessmentSummaryDto {
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  level!: string | null;

  @ApiProperty({ type: String, nullable: true })
  relevantFor!: string | null;

  @ApiProperty({ type: String, nullable: true })
  instructions!: string | null;

  @ApiProperty({ enum: QuestionOrder, enumName: 'QuestionOrder' })
  questionOrder!: QuestionOrder;

  @ApiProperty()
  shuffleOptions!: boolean;

  @ApiProperty()
  allowBackNavigation!: boolean;

  @ApiProperty()
  audioReplays!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: [SectionDto] })
  sections!: SectionDto[];

  @ApiProperty({ type: [QuestionDto] })
  questions!: QuestionDto[];

  @ApiProperty({ type: [BandDto], description: 'Highest minimum first.' })
  bands!: BandDto[];

  @ApiProperty({
    type: [String],
    description:
      'What stops the test from being published or sent. Empty when it’s ready.',
  })
  problems!: string[];

  static from(
    assessment: AssessmentWithContent,
    stats: AssessmentStats,
  ): AssessmentDetailDto {
    const perSection = new Map<string, number>();
    for (const question of assessment.questions) {
      if (question.sectionId) {
        perSection.set(
          question.sectionId,
          (perSection.get(question.sectionId) ?? 0) + 1,
        );
      }
    }

    return {
      id: assessment.id,
      slug: assessment.slug,
      name: assessment.name,
      tagline: assessment.tagline,
      status: assessment.status,
      scoringMethod: assessment.scoringMethod,
      durationMinutes: assessment.durationMinutes,
      questionCount: assessment.questions.length,
      sectionCount: assessment.sections.length,
      missingMediaCount: assessment.questions.filter(
        (question) => !question.mediaId && question.mediaFileName,
      ).length,
      ...stats,
      updatedAt: assessment.updatedAt,
      description: assessment.description,
      level: assessment.level,
      relevantFor: assessment.relevantFor,
      instructions: assessment.instructions,
      questionOrder: assessment.questionOrder,
      shuffleOptions: assessment.shuffleOptions,
      allowBackNavigation: assessment.allowBackNavigation,
      audioReplays: assessment.audioReplays,
      createdAt: assessment.createdAt,
      sections: assessment.sections.map((section) => ({
        id: section.id,
        order: section.order,
        name: section.name,
        description: section.description,
        weight: section.weight,
        questionCount: perSection.get(section.id) ?? 0,
      })),
      questions: assessment.questions.map((question) => ({
        id: question.id,
        order: question.order,
        sectionId: question.sectionId,
        ref: question.ref,
        type: question.type,
        difficulty: question.difficulty,
        instruction: question.instruction,
        context: question.context,
        stem: question.stem,
        media: question.media
          ? {
              id: question.media.id,
              url: mediaUrl(question.media.id),
              mimeType: question.media.mimeType,
              originalName: question.media.originalName,
            }
          : null,
        mediaFileName: question.mediaFileName,
        employerPrompt: question.employerPrompt,
        employerValue: question.defaultEmployerValue,
        rationale: question.rationale,
        transcript: question.transcript,
        shuffleOptions: question.shuffleOptions,
        keepLastOptionFixed: question.keepLastOptionFixed,
        options: question.options.map((option) => ({
          id: option.id,
          order: option.order,
          label: option.label,
          text: option.text,
          employerText: option.employerText,
          value: option.value,
          isCorrect: option.isCorrect,
        })),
      })),
      bands: [...assessment.bands]
        .sort((a, b) => b.minScore - a.minScore)
        .map((band) => ({
          id: band.id,
          order: band.order,
          minScore: band.minScore,
          label: band.label,
          interpretation: band.interpretation,
          recommendedAction: band.recommendedAction,
        })),
      problems: publishProblems(assessment),
    };
  }
}
