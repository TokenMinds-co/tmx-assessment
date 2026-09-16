import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './utils/test-app';

interface HealthBody {
  status: string;
  info: Record<string, { status: string }>;
}

interface OpenApiBody {
  openapi: string;
  paths: Record<string, unknown>;
}

describe('App (e2e)', () => {
  let app: NestExpressApplication;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api (GET) is public', () => {
    return http().get('/api').expect(200).expect('Hello World!');
  });

  describe('health checks', () => {
    it('reports the process as live', async () => {
      const res = await http().get('/api/health/live').expect(200);

      expect(res.body as HealthBody).toMatchObject({
        status: 'ok',
        info: { memory_heap: { status: 'up' } },
      });
    });

    it('reports ready when the database answers', async () => {
      const res = await http().get('/api/health/ready').expect(200);

      expect(res.body as HealthBody).toMatchObject({
        status: 'ok',
        info: { database: { status: 'up' } },
      });
    });
  });

  describe('API docs', () => {
    it('serves the OpenAPI document', async () => {
      const res = await http().get('/api/docs/json').expect(200);
      const doc = res.body as OpenApiBody;

      expect(doc.openapi).toMatch(/^3\./);
      expect(Object.keys(doc.paths)).toEqual(
        expect.arrayContaining([
          '/api/auth/login',
          '/api/auth/invitations',
          '/api/health/ready',
        ]),
      );
      expect(Object.keys(doc.paths)).not.toContain('/api');
    });

    it('serves Swagger UI', async () => {
      await http().get('/api/docs').expect(200).expect('Content-Type', /html/);
    });
  });

  describe('CORS', () => {
    it('answers a preflight from the frontend', async () => {
      await http()
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204)
        .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
        .expect('Access-Control-Allow-Credentials', 'true');
    });

    it('gives other origins no CORS headers', async () => {
      const res = await http()
        .options('/api/auth/login')
        .set('Origin', 'https://evil.example')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.get('Access-Control-Allow-Origin')).toBeUndefined();
    });

    it("lets the docs page write from the API's own origin", async () => {
      // Swagger UI sends its requests with Origin set to the API itself.
      await http()
        .post('/api/auth/password/forgot')
        .set('Host', 'api.example.test')
        .set('Origin', 'http://api.example.test')
        .send({ email: 'nobody@example.test' })
        .expect(202);
    });
  });
});
