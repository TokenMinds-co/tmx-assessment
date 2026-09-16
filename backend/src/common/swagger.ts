import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants';

const DOCS_PATH = 'docs';

/**
 * Serves Swagger UI at /<prefix>/docs and the OpenAPI document at
 * /<prefix>/docs/json. Returns the UI's path. See docs/api-conventions.md.
 */
export function setupSwagger(app: INestApplication, prefix: string): string {
  const config = new DocumentBuilder()
    .setTitle('TMX HR API')
    .setDescription(
      'REST API for TMX HR. To try the protected endpoints on this page, sign in with `POST /api/auth/login` first. The browser then sends the session cookie with every request.',
    )
    .addCookieAuth(
      SESSION_COOKIE_NAME,
      {
        type: 'apiKey',
        in: 'cookie',
        name: SESSION_COOKIE_NAME,
        description: 'Set by sign-in and sent by the browser automatically.',
      },
      SESSION_COOKIE_NAME,
    )
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      description: 'The same session token, for server-side callers.',
    })
    .build();

  SwaggerModule.setup(
    DOCS_PATH,
    app,
    () => SwaggerModule.createDocument(app, config),
    {
      useGlobalPrefix: true,
      jsonDocumentUrl: `${DOCS_PATH}/json`,
      customSiteTitle: 'TMX HR API docs',
    },
  );
  return `/${prefix}/${DOCS_PATH}`;
}
