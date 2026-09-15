import { applyDecorators } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../auth.constants';

const toNormalizedEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const toTrimmed = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** An email address, trimmed and lowercased before it's checked. */
export const IsNormalizedEmail = () =>
  applyDecorators(
    Transform(toNormalizedEmail),
    IsEmail({}, { message: 'Enter a valid email address.' }),
    MaxLength(254),
  );

/** A password being set. Length is the only rule. */
export const IsNewPassword = () =>
  applyDecorators(
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
  applyDecorators(IsString(), IsNotEmpty(), MaxLength(PASSWORD_MAX_LENGTH));

/** A token from an email link. */
export const IsEmailToken = () =>
  applyDecorators(IsString(), IsNotEmpty(), MaxLength(128));

export const IsPersonName = () =>
  applyDecorators(
    Transform(toTrimmed),
    IsString(),
    IsNotEmpty({ message: 'Enter a name.' }),
    MaxLength(100),
  );
