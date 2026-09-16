import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Difficulty, QuestionType } from '../../generated/prisma/enums';
import {
  MAX_BANDS,
  MAX_QUESTIONS,
  TEXT_LIMITS,
} from '../assessments.constants';
import {
  MAX_CHOICE_OPTIONS,
  MAX_SCALE_POINTS,
} from '../canonical/question-rules';
import { IsOptionalText, IsText } from './validators';

export class CreateSectionDto {
  @IsText(TEXT_LIMITS.name, { example: 'Written communication' })
  name!: string;

  @IsOptionalText(TEXT_LIMITS.long)
  description?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Alignment tests: share of the overall score.',
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  weight?: number | null;
}

export class UpdateSectionDto {
  @IsText(TEXT_LIMITS.name, { required: false })
  name?: string;

  @IsOptionalText(TEXT_LIMITS.long)
  description?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  weight?: number | null;
}

export class ReorderDto {
  @ApiProperty({
    type: [String],
    description: 'Every id, once, in the new order.',
  })
  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS)
  @IsUUID('all', { each: true })
  ids!: string[];
}

export class QuestionOptionInputDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Keep an existing option’s id. Leave it out for a new option.',
  })
  @IsOptional()
  @IsUUID('all')
  id?: string;

  @IsText(TEXT_LIMITS.option, { allowEmpty: true })
  text!: string;

  @IsOptionalText(TEXT_LIMITS.option)
  employerText?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  value?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

/** A whole question. Saving replaces the question, options included. */
export class QuestionInputDto {
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('all')
  sectionId?: string | null;

  @IsOptionalText(40, { example: 'Q5' })
  ref?: string | null;

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

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('all')
  mediaId?: string | null;

  @IsOptionalText(255, {
    description: 'A file an import named that hasn’t been uploaded yet.',
  })
  mediaFileName?: string | null;

  @ApiProperty({ type: [QuestionOptionInputDto] })
  @IsArray()
  @ArrayMaxSize(Math.max(MAX_CHOICE_OPTIONS, MAX_SCALE_POINTS))
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionInputDto)
  options!: QuestionOptionInputDto[];

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

export class BandInputDto {
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

export class ReplaceBandsDto {
  @ApiProperty({ type: [BandInputDto] })
  @IsArray()
  @ArrayMaxSize(MAX_BANDS)
  @ValidateNested({ each: true })
  @Type(() => BandInputDto)
  bands!: BandInputDto[];
}

export class ImportQuestionsQueryDto {
  @ApiPropertyOptional({
    enum: ['append', 'replace'],
    default: 'append',
    description:
      'append adds the rows after the current questions; replace deletes them first.',
  })
  @IsOptional()
  @IsIn(['append', 'replace'])
  mode?: 'append' | 'replace';

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Check the file and return a preview without saving.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  dryRun?: boolean;
}
