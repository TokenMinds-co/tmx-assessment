import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { EnvironmentVariables } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const { corsOrigins, docsPath } = configureApp(app);

  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  const baseUrl = `http://localhost:${port}`;
  logger.log(
    `TMX HR API is running on port ${port} (${config.get('NODE_ENV', { infer: true })})`,
  );
  logger.log(`API:    ${baseUrl}/api`);
  logger.log(`Health: ${baseUrl}/api/health/ready`);
  logger.log(docsPath ? `Docs:   ${baseUrl}${docsPath}` : 'Docs:   off');
  logger.log(`CORS:   ${corsOrigins.join(', ')}`);
}
void bootstrap();
