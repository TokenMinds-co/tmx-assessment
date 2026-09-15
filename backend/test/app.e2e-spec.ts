import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './utils/test-app';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api (GET) is public', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });
});
