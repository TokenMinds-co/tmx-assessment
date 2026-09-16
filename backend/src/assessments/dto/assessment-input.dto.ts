import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  AssessmentStatus,
  QuestionOrder,
  ScoringMethod,
} from '../../generated/prisma/enums';
import { TEXT_LIMITS } from '../assessments.constants';
import { IsOptionalText, IsSlug, IsText } from './validators';

export class CreateAssessmentDto {
  @IsText(TEXT_LIMITS.name, { example: 'Attention to Detail' })
  name!: string;

  @IsSlug({ required: false })
  slug?: string;

  @ApiProperty({
    enum: ScoringMethod,
    enumName: 'ScoringMethod',
    description:
      'CORRECT_ANSWER for skills tests with right answers; ALIGNMENT for preference questionnaires compared with a role profile.',
  })
  @IsEnum(ScoringMethod)
  scoringMethod!: ScoringMethod;

  @IsOptionalText(TEXT_LIMITS.label)
  tagline?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 240, default: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  durationMinutes?: number;
}

/** Every field is optional; send only what changes. */
export class UpdateAssessmentDto {
  @IsText(TEXT_LIMITS.name, { required: false })
  name?: string;

  @IsSlug({ required: false })
  slug?: string;

  @IsOptionalText(TEXT_LIMITS.label)
  tagline?: string | null;

  @IsOptionalText(TEXT_LIMITS.long)
  description?: string | null;

  @IsOptionalText(TEXT_LIMITS.label)
  level?: string | null;

  @IsOptionalText(TEXT_LIMITS.long)
  relevantFor?: string | null;

  @IsOptionalText(TEXT_LIMITS.long, {
    description: 'Shown to candidates before they start.',
  })
  instructions?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 240 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: ScoringMethod, enumName: 'ScoringMethod' })
  @IsOptional()
  @IsEnum(ScoringMethod)
  scoringMethod?: ScoringMethod;

  @ApiPropertyOptional({
    enum: AssessmentStatus,
    enumName: 'AssessmentStatus',
    description:
      'Publishing checks the test first and answers 400 with what to fix.',
  })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @ApiPropertyOptional({ enum: QuestionOrder, enumName: 'QuestionOrder' })
  @IsOptional()
  @IsEnum(QuestionOrder)
  questionOrder?: QuestionOrder;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowBackNavigation?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  audioReplays?: number;
}

export class ListAssessmentsQueryDto {
  @ApiPropertyOptional({ enum: AssessmentStatus, enumName: 'AssessmentStatus' })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;
}

export class CsvTemplateQueryDto {
  @ApiPropertyOptional({
    enum: ScoringMethod,
    enumName: 'ScoringMethod',
    default: ScoringMethod.CORRECT_ANSWER,
  })
  @IsOptional()
  @IsEnum(ScoringMethod)
  scoringMethod?: ScoringMethod;
}
