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
  configureApp(app);

  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
