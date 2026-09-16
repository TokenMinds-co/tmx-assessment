import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { MAIL_TRANSPORT } from '../../src/mail/mail.transport';
import { FILE_STORAGE } from '../../src/storage/file-storage';
import { LocalDiskStorage } from '../../src/storage/local-disk.storage';
import { InMemoryMailTransport } from './in-memory-mail.transport';

export interface TestApp {
  app: NestExpressApplication;
  mail: InMemoryMailTransport;
  /**
   * Uploaded files go here instead of STORAGE_DIR. The folder is created on
   * the first upload; a suite that uploads deletes it when it's done.
   */
  storageDir: string;
}

/**
 * The real app, set up exactly like main.ts, with email captured in memory and
 * uploads kept in a temporary folder. It uses the database in DATABASE_URL
 * (see docs/testing.md).
 */
export async function createTestApp(): Promise<TestApp> {
  const mail = new InMemoryMailTransport();
  const storageDir = join(tmpdir(), `tmx-hr-e2e-${randomUUID()}`);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL_TRANSPORT)
    .useValue(mail)
    .overrideProvider(FILE_STORAGE)
    .useValue(new LocalDiskStorage(storageDir))
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });
  configureApp(app);
  await app.init();
  return { app, mail, storageDir };
}
