import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsNormalizedEmail, IsPersonName } from '../../auth/dto/validators';
import {
  AttemptStatus,
  QuestionType,
  ScoringMethod,
} from '../../generated/prisma/enums';
import {
  DEFAULT_EXPIRY_DAYS,
  MAX_EXPIRY_DAYS,
  MAX_TESTS_PER_INVITATION,
  TEXT_LIMITS,
} from '../assessments.constants';
import { AlignmentFlagDto, SectionScoreDto } from './take-response.dto';
import { IsOptionalText } from './validators';

// --- Requests -----------------------------------------------------------------

export class NewCandidateDto {
  @IsPersonName()
  name!: string;

  @IsNormalizedEmail()
  email!: string;
}

export class CreateAssessmentInvitationDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'An existing candidate. Send this or `candidate`.',
  })
  @IsOptional()
  @IsUUID('all')
  candidateId?: string;

  @ApiPropertyOptional({
    type: NewCandidateDto,
    description:
      'A new candidate. If the email is already known, that candidate is used and their name updated.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewCandidateDto)
  candidate?: NewCandidateDto;

  @ApiProperty({
    type: [String],
    description: `The tests to send, in the order the candidate sees them. 1 to ${MAX_TESTS_PER_INVITATION}.`,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one test.' })
  @ArrayMaxSize(MAX_TESTS_PER_INVITATION, {
    message: `Send at most ${MAX_TESTS_PER_INVITATION} tests in one link.`,
  })
  @IsUUID('all', { each: true })
  assessmentIds!: string[];

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_EXPIRY_DAYS,
    default: DEFAULT_EXPIRY_DAYS,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_EXPIRY_DAYS)
  expiresInDays?: number;

  @IsOptionalText(TEXT_LIMITS.message, {
    description:
      'A note to the candidate, shown in the email and on their start page.',
  })
  message?: string | null;
}

export class ResendInvitationDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_EXPIRY_DAYS,
    description: `Days until the new link expires. Without it, the old expiry stays, or ${DEFAULT_EXPIRY_DAYS} days if it has passed.`,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_EXPIRY_DAYS)
  expiresInDays?: number;
}

export class ListInvitationsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptionalText(100, { description: 'Part of a candidate’s name or email.' })
  search?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all')
  assessmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all')
  candidateId?: string;
}

// --- Responses ----------------------------------------------------------------

export const INVITATION_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'EXPIRED',
  'REVOKED',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export class PersonRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class CandidateRefDto extends PersonRefDto {
  @ApiProperty({ format: 'email' })
  email!: string;
}

export class AttemptSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  assessmentId!: string;

  @ApiProperty({ example: 'Communication' })
  name!: string;

  @ApiProperty({ enum: AttemptStatus, enumName: 'AttemptStatus' })
  status!: AttemptStatus;

  @ApiProperty({ type: Number, nullable: true, description: 'From 0 to 1.' })
  score!: number | null;

  @ApiProperty({ type: String, nullable: true })
  bandLabel!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  finishedAt!: Date | null;
}

/** One sent link, for the Sent list. */
export class InvitationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: CandidateRefDto })
  candidate!: CandidateRefDto;

  @ApiProperty({ type: PersonRefDto, nullable: true })
  sentBy!: PersonRefDto | null;

  @ApiProperty({ enum: INVITATION_STATUSES })
  status!: InvitationStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the email last went out. Null when sending failed.',
  })
  sentAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  revokedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastOpenedAt!: Date | null;

  @ApiProperty({ type: [AttemptSummaryDto] })
  attempts!: AttemptSummaryDto[];
}

export class InvitationListDto {
  @ApiProperty({ type: [InvitationSummaryDto] })
  items!: InvitationSummaryDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class BandSummaryDto {
  @ApiProperty()
  minScore!: number;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: String, nullable: true })
  interpretation!: string | null;

  @ApiProperty({ type: String, nullable: true })
  recommendedAction!: string | null;
}

export class ChoiceDto {
  @ApiProperty({ example: 'B' })
  label!: string;

  @ApiProperty()
  text!: string;
}

/** How a candidate answered one question, for staff. */
export class AnswerReviewDto {
  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ description: 'Position in the test as written, from 1.' })
  number!: number;

  @ApiProperty({ type: String, nullable: true })
  ref!: string | null;

  @ApiProperty({ type: String, nullable: true })
  section!: string | null;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type!: QuestionType;

  @ApiProperty()
  stem!: string;

  @ApiProperty({ type: ChoiceDto, nullable: true })
  chosen!: ChoiceDto | null;

  @ApiProperty({
    type: ChoiceDto,
    nullable: true,
    description: 'The right answer, or the role profile’s answer on a scale.',
  })
  expected!: ChoiceDto | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description: 'Null on scales.',
  })
  isCorrect!: boolean | null;

  @ApiProperty({ type: Number, nullable: true })
  candidateValue!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  employerValue!: number | null;
}

/** One test's result. Section scores, flags and answers appear once it's finished. */
export class AttemptResultDto extends AttemptSummaryDto {
  @ApiProperty({ type: String, nullable: true })
  tagline!: string | null;

  @ApiProperty({ enum: ScoringMethod, enumName: 'ScoringMethod' })
  scoringMethod!: ScoringMethod;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  questionCount!: number;

  @ApiProperty()
  answeredCount!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deadlineAt!: Date | null;

  @ApiProperty({ type: Number, nullable: true })
  timeTakenSeconds!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  correctCount!: number | null;

  @ApiProperty({ type: BandSummaryDto, nullable: true })
  band!: BandSummaryDto | null;

  @ApiProperty({ type: [SectionScoreDto] })
  sections!: SectionScoreDto[];

  @ApiProperty({ type: [AlignmentFlagDto] })
  flags!: AlignmentFlagDto[];

  @ApiProperty({ type: [AnswerReviewDto] })
  answers!: AnswerReviewDto[];
}

export class InvitationDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: CandidateRefDto })
  candidate!: CandidateRefDto;

  @ApiProperty({ type: PersonRefDto, nullable: true })
  sentBy!: PersonRefDto | null;

  @ApiProperty({ enum: INVITATION_STATUSES })
  status!: InvitationStatus;

  @ApiProperty({ type: String, nullable: true })
  message!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  sentAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  revokedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastOpenedAt!: Date | null;

  @ApiProperty({ type: [AttemptResultDto] })
  attempts!: AttemptResultDto[];
}

export class SentInvitationDto {
  @ApiProperty({ type: InvitationDetailDto })
  invitation!: InvitationDetailDto;

  @ApiProperty({
    example: 'https://hr.tokenminds.co/take/…',
    description:
      'The candidate’s link. Only the token’s hash is stored, so this is the one chance to copy it; resending makes a new one.',
  })
  link!: string;

  @ApiProperty({
    description:
      'False when the email failed; share the link another way or resend.',
  })
  emailSent!: boolean;
}
