// Type conversion reads decorator metadata. Nest loads this polyfill too, but
// importing it here keeps validateEnv working on its own (in unit tests).
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Every environment variable the backend reads. It's checked once at startup, so
 * a missing or malformed value stops the app before it serves a request.
 * Keep this in sync with .env.example and docs/configuration.md.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;

  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgres:// connection string',
  })
  DATABASE_URL!: string;

  @IsUrl({
    require_tld: false,
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  FRONTEND_URL!: string;

  /** Extra origins CORS allows, comma-separated. FRONTEND_URL is always allowed. */
  @IsOptional()
  @Matches(/^https?:\/\/[^\s,]+(\s*,\s*https?:\/\/[^\s,]+)*$/, {
    message: 'CORS_ORIGINS must be a comma-separated list of http(s) origins',
  })
  CORS_ORIGINS?: string;

  @IsInt()
  @Min(1)
  @Max(30)
  SESSION_TTL_DAYS: number = 7;

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @IsInt()
  @Min(0)
  TRUST_PROXY: number = 0;

  @ValidateIf(
    (env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production,
  )
  @IsString()
  @IsNotEmpty({ message: 'RESEND_API_KEY is required in production' })
  RESEND_API_KEY?: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_FROM: string = 'TMX HR <onboarding@resend.dev>';
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  // Treat `KEY=` as unset, so the default applies.
  const present = Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== ''),
  );
  const env = plainToInstance(EnvironmentVariables, present, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(env);
  if (errors.length > 0) {
    const details = errors
      .map(
        (error) => `  - ${Object.values(error.constraints ?? {}).join('; ')}`,
      )
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${details}\nSee .env.example and docs/configuration.md.`,
    );
  }
  return env;
}
