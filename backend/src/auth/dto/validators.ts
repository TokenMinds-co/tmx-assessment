import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../auth.constants';

// Each decorator both validates a field and describes it in the API docs, so
// the docs can't drift from the rules.

const toNormalizedEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const toTrimmed = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** An email address, trimmed and lowercased before it's checked. */
export const IsNormalizedEmail = () =>
  applyDecorators(
    ApiProperty({
      format: 'email',
      maxLength: 254,
      example: 'ada@example.com',
    }),
    Transform(toNormalizedEmail),
    IsEmail({}, { message: 'Enter a valid email address.' }),
    MaxLength(254),
  );

/** A password being set. Length is the only rule. */
export const IsNewPassword = () =>
  applyDecorators(
    ApiProperty({
      format: 'password',
      minLength: PASSWORD_MIN_LENGTH,
      maxLength: PASSWORD_MAX_LENGTH,
      description: `At least ${PASSWORD_MIN_LENGTH} characters. No other rules.`,
    }),
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    }),
    MaxLength(PASSWORD_MAX_LENGTH, {
      message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
    }),
  );

/** A password being checked. No minimum, so older passwords still work. */
export const IsExistingPassword = () =>
  applyDecorators(
    ApiProperty({ format: 'password', maxLength: PASSWORD_MAX_LENGTH }),
    IsString(),
    IsNotEmpty(),
    MaxLength(PASSWORD_MAX_LENGTH),
  );

/** A token from an email link. */
export const IsEmailToken = () =>
  applyDecorators(
    ApiProperty({
      description: 'The `token` value from the link in the email.',
      maxLength: 128,
    }),
    IsString(),
    IsNotEmpty(),
    MaxLength(128),
  );

/** A person's name, trimmed. Pass `{ required: false }` for an optional one. */
export const IsPersonName = ({
  required = true,
}: { required?: boolean } = {}) =>
  applyDecorators(
    ApiProperty({ required, maxLength: 100, example: 'Ada Lovelace' }),
    ...(required ? [] : [IsOptional()]),
    Transform(toTrimmed),
    IsString(),
    IsNotEmpty({ message: 'Enter a name.' }),
    MaxLength(100),
  );
