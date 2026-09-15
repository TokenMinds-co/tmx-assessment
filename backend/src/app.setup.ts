import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { originCheck } from './common/origin-check.middleware';
import { EnvironmentVariables } from './config/env.validation';

/**
 * HTTP setup shared by main.ts and the e2e tests, so tests run through the same
 * pipeline as production. Create the app with `{ bodyParser: false }`: JSON is
 * the only body format the API accepts. See docs/api-conventions.md.
 */
export function configureApp(app: NestExpressApplication): void {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const frontendOrigin = new URL(config.get('FRONTEND_URL', { infer: true }))
    .origin;

  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  app.useBodyParser('json', { limit: '100kb' });
  app.use(cookieParser());
  app.enableCors({ origin: frontendOrigin, credentials: true });
  app.use(originCheck([frontendOrigin]));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}
