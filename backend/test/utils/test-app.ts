import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { MAIL_TRANSPORT } from '../../src/mail/mail.transport';
import { InMemoryMailTransport } from './in-memory-mail.transport';

export interface TestApp {
  app: NestExpressApplication;
  mail: InMemoryMailTransport;
}

/**
 * The real app, set up exactly like main.ts, with email captured in memory.
 * It uses the database in DATABASE_URL (see docs/testing.md).
 */
export async function createTestApp(): Promise<TestApp> {
  const mail = new InMemoryMailTransport();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL_TRANSPORT)
    .useValue(mail)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });
  configureApp(app);
  await app.init();
  return { app, mail };
}
