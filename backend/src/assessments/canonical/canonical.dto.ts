import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  validate,
  ValidateNested,
  type ValidationError,
} from 'class-validator';
import {
  Difficulty,
  QuestionOrder,
  QuestionType,
  ScoringMethod,
} from '../../generated/prisma/enums';
import {
  MAX_BANDS,
  MAX_QUESTIONS,
  MAX_SECTIONS,
  TEXT_LIMITS,
} from '../assessments.constants';
import { IsOptionalText, IsSlug, IsText } from '../dto/validators';
import {
  CANONICAL_FORMAT,
  type CanonicalAssessment,
  type CanonicalBand,
  type CanonicalMedia,
  type CanonicalOption,
  type CanonicalQuestion,
  type CanonicalSection,
} from './canonical.types';
import { MAX_CHOICE_OPTIONS, MAX_SCALE_POINTS } from './question-rules';

/*
 * The canonical format as request DTOs, for JSON import and the seed files.
 * Structure is checked here; the rules that span fields (one correct option,
 * scale values, known sections) are in question-rules.ts and document-rules.ts.
 */

export class CanonicalOptionDto implements CanonicalOption {
  @ApiPropertyOptional({ example: 'B' })
  @IsOptional()
  @IsText(8)
  label?: string;

  @IsText(TEXT_LIMITS.option, {
    allowEmpty: true,
    example: 'A smaller first phase',
  })
  text!: string;

  @IsOptionalText(TEXT_LIMITS.option)
  employerText?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  value?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  correct?: boolean;
}

export class CanonicalMediaDto implements CanonicalMedia {
  @IsOptionalText(255, { example: 'listening_Q13.mp3' })
  file?: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  assetId?: string | null;
}

export class CanonicalQuestionDto implements CanonicalQuestion {
  @IsOptionalText(40, { example: 'Q5' })
  ref?: string | null;

  @IsOptionalText(TEXT_LIMITS.name, { description: 'A section key or name.' })
  section?: string | null;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  @IsEnum(QuestionType)
  type!: QuestionType;

  @ApiPropertyOptional({
    enum: Difficulty,
    enumName: 'Difficulty',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty | null;

  @IsOptionalText(TEXT_LIMITS.long)
  instruction?: string | null;

  @IsOptionalText(TEXT_LIMITS.long)
  context?: string | null;

  @IsText(TEXT_LIMITS.stem, {
    example: 'What is the main point of the message?',
  })
  stem!: string;

  @ApiPropertyOptional({ type: CanonicalMediaDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CanonicalMediaDto)
  media?: CanonicalMediaDto | null;

  @ApiProperty({ type: [CanonicalOptionDto] })
  @IsArray()
  @ArrayMaxSize(Math.max(MAX_CHOICE_OPTIONS, MAX_SCALE_POINTS))
  @ValidateNested({ each: true })
  @Type(() => CanonicalOptionDto)
  options!: CanonicalOptionDto[];

  @IsOptionalText(TEXT_LIMITS.long)
  rationale?: string | null;

  @IsOptionalText(TEXT_LIMITS.long)
  transcript?: string | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  keepLastOptionFixed?: boolean;

  @IsOptionalText(TEXT_LIMITS.stem)
  employerPrompt?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  employerValue?: number | null;
}

export class CanonicalSectionDto implements CanonicalSection {
  @IsText(TEXT_LIMITS.name, { example: 'written-communication' })
  key!: string;

  @IsText(TEXT_LIMITS.name, { example: 'Written communication' })
  name!: string;

  @IsOptionalText(TEXT_LIMITS.long)
  description?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 0.35 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  weight?: number | null;
}

export class CanonicalBandDto implements CanonicalBand {
  @ApiProperty({ minimum: 0, maximum: 1, example: 0.66 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1)
  minScore!: number;

  @IsText(TEXT_LIMITS.label, { example: 'Competent' })
  label!: string;

  @IsOptionalText(TEXT_LIMITS.long)
  interpretation?: string | null;

  @IsOptionalText(TEXT_LIMITS.long)
  recommendedAction?: string | null;
}

export class CanonicalAssessmentDto implements CanonicalAssessment {
  @ApiProperty({ enum: [CANONICAL_FORMAT], example: CANONICAL_FORMAT })
  @Equals(CANONICAL_FORMAT, {
    message: `format must be "${CANONICAL_FORMAT}".`,
  })
  format!: typeof CANONICAL_FORMAT;

  @IsSlug()
  slug!: string;

  @IsText(TEXT_LIMITS.name, { example: 'Communication' })
  name!: string;

  @IsOptionalText(TEXT_LIMITS.label)
  tagline?: string | null;

  @IsOptionalText(TEXT_LIMITS.long)
  description?: string | null;

  @IsOptionalText(TEXT_LIMITS.label)
  level?: string | null;

  @IsOptionalText(TEXT_LIMITS.long)
  relevantFor?: string | null;

  @IsOptionalText(TEXT_LIMITS.long)
  instructions?: string | null;

  @ApiProperty({ minimum: 1, maximum: 240, example: 15 })
  @IsInt()
  @Min(1)
  @Max(240)
  durationMinutes!: number;

  @ApiProperty({ enum: ScoringMethod, enumName: 'ScoringMethod' })
  @IsEnum(ScoringMethod)
  scoringMethod!: ScoringMethod;

  @ApiProperty({ enum: QuestionOrder, enumName: 'QuestionOrder' })
  @IsEnum(QuestionOrder)
  questionOrder!: QuestionOrder;

  @ApiProperty()
  @IsBoolean()
  shuffleOptions!: boolean;

  @ApiProperty()
  @IsBoolean()
  allowBackNavigation!: boolean;

  @ApiProperty({ minimum: 0, maximum: 5 })
  @IsInt()
  @Min(0)
  @Max(5)
  audioReplays!: number;

  @ApiProperty({ type: [CanonicalSectionDto] })
  @IsArray()
  @ArrayMaxSize(MAX_SECTIONS)
  @ValidateNested({ each: true })
  @Type(() => CanonicalSectionDto)
  sections!: CanonicalSectionDto[];

  @ApiProperty({ type: [CanonicalBandDto] })
  @IsArray()
  @ArrayMaxSize(MAX_BANDS)
  @ValidateNested({ each: true })
  @Type(() => CanonicalBandDto)
  bands!: CanonicalBandDto[];

  @ApiProperty({ type: [CanonicalQuestionDto] })
  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => CanonicalQuestionDto)
  questions!: CanonicalQuestionDto[];
}

/**
 * Checks a parsed JSON document against the DTOs, the same way the API's
 * ValidationPipe does. Used by the seed, which runs outside a request.
 */
export async function validateCanonical(
  plain: unknown,
): Promise<{ document: CanonicalAssessmentDto; errors: string[] }> {
  const document = plainToInstance(CanonicalAssessmentDto, plain);
  const errors = await validate(document, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { document, errors: flattenErrors(errors) };
}

/** Nested validation errors as "questions.3.stem: stem can't be empty." lines. */
export function flattenErrors(errors: ValidationError[], path = ''): string[] {
  return errors.flatMap((error) => {
    const here = path ? `${path}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map(
      (message) => `${here}: ${message}`,
    );
    return [...own, ...flattenErrors(error.children ?? [], here)];
  });
}
