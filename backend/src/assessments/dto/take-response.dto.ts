import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import {
  AssessmentStatus,
  AttemptStatus,
  QuestionType,
  ScoringMethod,
} from '../../generated/prisma/enums';
import { MAX_QUESTIONS } from '../assessments.constants';

/*
 * What a candidate's browser receives. Built from the snapshot by take-view.ts,
 * never from a model, so answer keys, rationale, transcripts, the role profile
 * and section names can't leak. Staff previews reuse the same shapes.
 */

export class TakeMediaDto {
  @ApiProperty({ example: '/api/media/0199a0c2-0000-7000-8000-000000000000' })
  url!: string;

  @ApiProperty({ example: 'audio/mpeg' })
  mimeType!: string;
}

export class TakeOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'Can be empty for the middle points of a scale.',
  })
  text!: string;
}

export class TakeQuestionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Position in this attempt, from 1.' })
  number!: number;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type!: QuestionType;

  @ApiProperty({ type: String, nullable: true })
  instruction!: string | null;

  @ApiProperty({ type: String, nullable: true })
  context!: string | null;

  @ApiProperty()
  stem!: string;

  @ApiProperty({ type: TakeMediaDto, nullable: true })
  media!: TakeMediaDto | null;

  @ApiProperty({
    type: [TakeOptionDto],
    description: 'In the order to show them.',
  })
  options!: TakeOptionDto[];
}

export class TakeSettingsDto {
  @ApiProperty()
  allowBackNavigation!: boolean;

  @ApiProperty({
    description: 'Replays allowed after the first play of each clip.',
  })
  audioReplays!: number;

  @ApiProperty({ enum: ScoringMethod, enumName: 'ScoringMethod' })
  scoringMethod!: ScoringMethod;
}

export class TakeAnswerDto {
  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ format: 'uuid' })
  optionId!: string;
}

/** One test as the candidate takes it. */
export class TakeAttemptDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AttemptStatus, enumName: 'AttemptStatus' })
  status!: AttemptStatus;

  @ApiProperty({ example: 'Communication' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  instructions!: string | null;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deadlineAt!: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'The server’s clock, so the countdown can correct for a wrong device clock.',
  })
  serverNow!: Date;

  @ApiProperty({ type: TakeSettingsDto })
  settings!: TakeSettingsDto;

  @ApiProperty({ type: [TakeQuestionDto] })
  questions!: TakeQuestionDto[];

  @ApiProperty({ type: [TakeAnswerDto] })
  answers!: TakeAnswerDto[];
}

export class AnswerKeyDto {
  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ format: 'uuid' })
  optionId!: string;

  @ApiProperty({
    enum: ['CORRECT', 'ROLE_PROFILE'],
    description: 'The right answer, or the role profile’s answer on a scale.',
  })
  kind!: 'CORRECT' | 'ROLE_PROFILE';
}

/** A test as a candidate would see it, with the answer key. Staff only. */
export class AssessmentPreviewDto {
  @ApiProperty({ format: 'uuid' })
  assessmentId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  tagline!: string | null;

  @ApiProperty({ type: String, nullable: true })
  instructions!: string | null;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ enum: AssessmentStatus, enumName: 'AssessmentStatus' })
  status!: AssessmentStatus;

  @ApiProperty({ type: TakeSettingsDto })
  settings!: TakeSettingsDto;

  @ApiProperty({
    type: [TakeQuestionDto],
    description: 'A fresh shuffle each time, as a candidate would get.',
  })
  questions!: TakeQuestionDto[];

  @ApiProperty({ type: [AnswerKeyDto] })
  answerKey!: AnswerKeyDto[];

  @ApiProperty({ type: [String] })
  problems!: string[];
}

export class AnswerInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all')
  questionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('all')
  optionId!: string;
}

export class PreviewScoreInputDto {
  @ApiProperty({ type: [AnswerInputDto] })
  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => AnswerInputDto)
  answers!: AnswerInputDto[];
}

export class SectionScoreDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sectionId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'From 0 to 1.' })
  score!: number;

  @ApiProperty({ type: Number, nullable: true })
  weight!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  correct!: number | null;

  @ApiProperty()
  answered!: number;

  @ApiProperty()
  total!: number;
}

export class AlignmentFlagDto {
  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ type: String, nullable: true })
  ref!: string | null;

  @ApiProperty()
  stem!: string;

  @ApiProperty()
  employerValue!: number;

  @ApiProperty()
  candidateValue!: number;

  @ApiProperty({ description: 'Candidate minus role profile.' })
  gap!: number;

  @ApiProperty({ enum: ['CANDIDATE_WANTS_MORE', 'ROLE_OFFERS_MORE'] })
  direction!: 'CANDIDATE_WANTS_MORE' | 'ROLE_OFFERS_MORE';
}

export class ScoreResultDto {
  @ApiProperty({ description: 'From 0 to 1.' })
  score!: number;

  @ApiProperty({ type: String, nullable: true })
  bandLabel!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  correctCount!: number | null;

  @ApiProperty()
  answeredCount!: number;

  @ApiProperty()
  questionCount!: number;

  @ApiProperty({ type: [SectionScoreDto] })
  sections!: SectionScoreDto[];

  @ApiProperty({ type: [AlignmentFlagDto] })
  flags!: AlignmentFlagDto[];
}

export class TakeOverviewAttemptDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Communication' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  tagline!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Shown before the test starts.',
  })
  instructions!: string | null;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  questionCount!: number;

  @ApiProperty({ description: 'Whether any question plays audio.' })
  hasAudio!: boolean;

  @ApiProperty({ type: TakeSettingsDto })
  settings!: TakeSettingsDto;

  @ApiProperty({ enum: AttemptStatus, enumName: 'AttemptStatus' })
  status!: AttemptStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deadlineAt!: Date | null;
}

/** The candidate's start page: who sent the link and the tests in it. */
export class TakeOverviewDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  candidateName!: string;

  @ApiProperty({ type: String, nullable: true })
  sentByName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  message!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  serverNow!: Date;

  @ApiProperty({ type: [TakeOverviewAttemptDto] })
  attempts!: TakeOverviewAttemptDto[];
}

export class AnswerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all')
  optionId!: string;
}

export class TakeSubmitDto {
  @ApiProperty({
    enum: AttemptStatus,
    enumName: 'AttemptStatus',
    description: 'EXPIRED when the time ran out before the submit arrived.',
  })
  status!: AttemptStatus;
}
