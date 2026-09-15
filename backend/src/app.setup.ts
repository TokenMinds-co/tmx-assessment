import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { originCheck } from './common/origin-check.middleware';
import { setupSwagger } from './common/swagger';
import { EnvironmentVariables, NodeEnv } from './config/env.validation';

const API_PREFIX = 'api';

export interface AppSetup {
  /** Browser origins allowed to call the API with cookies. */
  corsOrigins: string[];
  /** Where Swagger UI is served, or null when the docs are off. */
  docsPath: string | null;
}

/**
 * HTTP setup shared by main.ts and the e2e tests, so tests run through the same
 * pipeline as production. Create the app with `{ bodyParser: false }`: JSON is
 * the only body format the API accepts. See docs/api-conventions.md.
 */
export function configureApp(app: NestExpressApplication): AppSetup {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const corsOrigins = allowedOrigins(config);

  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  app.useBodyParser('json', { limit: '100kb' });
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Browsers may reuse a preflight answer for 10 minutes.
    maxAge: 600,
  });
  app.use(originCheck(corsOrigins));
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  // The interactive docs are a development tool; production doesn't serve them.
  const docsPath =
    config.get('NODE_ENV', { infer: true }) === NodeEnv.Production
      ? null
      : setupSwagger(app, API_PREFIX);

  return { corsOrigins, docsPath };
}

/** FRONTEND_URL plus any CORS_ORIGINS, reduced to bare origins. */
function allowedOrigins(
  config: ConfigService<EnvironmentVariables, true>,
): string[] {
  const extra = config.get('CORS_ORIGINS', { infer: true })?.split(',') ?? [];
  const origins = [config.get('FRONTEND_URL', { infer: true }), ...extra].map(
    (url) => new URL(url.trim()).origin,
  );
  return [...new Set(origins)];
}
