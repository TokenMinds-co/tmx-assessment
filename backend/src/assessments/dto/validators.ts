import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TEXT_LIMITS } from '../assessments.constants';

// Like src/auth/dto/validators.ts: each decorator validates a field and
// describes it in the API docs, so the two can't drift apart.

const trimmed = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimmedOrNull = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

interface TextOptions {
  example?: string;
  description?: string;
  /** Allow an empty string, such as the unlabelled middle of a scale. */
  allowEmpty?: boolean;
  /** False for update DTOs, where every field is optional. */
  required?: boolean;
}

/** Text, trimmed. */
export const IsText = (maxLength: number, options: TextOptions = {}) => {
  const required = options.required ?? true;
  return applyDecorators(
    (required ? ApiProperty : ApiPropertyOptional)({
      maxLength,
      example: options.example,
      description: options.description,
    }),
    Transform(trimmed),
    ...(required ? [] : [IsOptional()]),
    IsString(),
    ...(options.allowEmpty
      ? []
      : [IsNotEmpty({ message: "$property can't be empty." })]),
    MaxLength(maxLength),
  );
};

/** Optional text, trimmed. Blank text is stored as null. */
export const IsOptionalText = (
  maxLength: number,
  options: Pick<TextOptions, 'example' | 'description'> = {},
) =>
  applyDecorators(
    ApiPropertyOptional({
      type: String,
      nullable: true,
      maxLength,
      example: options.example,
      description: options.description,
    }),
    Transform(trimmedOrNull),
    IsOptional(),
    IsString(),
    MaxLength(maxLength),
  );

/** A URL-safe name such as "critical-thinking". */
export const IsSlug = ({ required = true }: { required?: boolean } = {}) =>
  applyDecorators(
    (required ? ApiProperty : ApiPropertyOptional)({
      maxLength: TEXT_LIMITS.slug,
      example: 'critical-thinking',
      description: 'Lowercase letters, numbers and single hyphens.',
    }),
    Transform(trimmed),
    ...(required ? [] : [IsOptional()]),
    IsString(),
    Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        'The slug can only hold lowercase letters, numbers and single hyphens, such as "critical-thinking".',
    }),
    MaxLength(TEXT_LIMITS.slug),
  );
