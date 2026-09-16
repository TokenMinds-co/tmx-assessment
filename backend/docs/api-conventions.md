# API conventions

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

How the HTTP API is shaped: routes, request validation, response and error format, versioning, CORS, CSRF and the API docs. Sign-in and route protection are in [authentication.md](authentication.md). Health checks are in [operations.md](operations.md).

## Current state

The HTTP setup lives in [app.setup.ts](../src/app.setup.ts). Both [main.ts](../src/main.ts) and the e2e tests use it, so tests run through the same pipeline as production. The routes so far are the [auth endpoints](authentication.md#endpoints), the [assessment, media and candidate endpoints](assessments.md#endpoints), the [health checks](operations.md#health-checks), and the scaffold's `GET /api`, which returns `Hello World!` and is hidden from the docs. Outside production, the API docs are at `/api/docs`.

## How it works

- **Every route starts with `/api`.** There's no version segment.
- **Request bodies are JSON,** up to 100 KB. Form-encoded bodies aren't parsed, which blocks form-based CSRF.
- **Multipart only for uploads.** The two upload routes, `POST /api/media` and `POST /api/assessments/:id/questions/import`, take `multipart/form-data` with one `file` field, read by Multer's `FileInterceptor` into memory. Each sets its own size limit (10 MiB for media, 1 MB for a CSV) and answers 413 above it. Both are admin-only.
- **Lists answer `{ items }`.** The one paged list, `GET /api/assessment-invitations`, uses offset paging: `?page=` (from 1) and `?pageSize=` (1 to 100, default 20), answering `{ items, total, page, pageSize }`.
- **Downloads** (JSON and CSV exports, and the CSV template) set `Content-Disposition: attachment; filename="…"` with `sendAsFile()` in [download.ts](../src/common/download.ts), so a plain link saves them as files. CSV files start with a UTF-8 byte-order mark so Excel reads them. Media files are served `inline` instead (see [assessments.md](assessments.md#media)).
- **Every input is validated** by a global `ValidationPipe` against DTO classes (`class-validator`). Unknown fields are rejected with a 400, and values are transformed first where a DTO says so, for example emails are trimmed and lowercased.
- **Responses are response DTOs,** never Prisma models, so internal fields such as password hashes can't leak. See [`UserResponseDto`](../src/auth/dto/user-response.dto.ts). Dates are ISO 8601 strings.
- **Errors use NestJS's default shape.** `message` is a string, or a list of strings for validation errors:

  ```json
  { "statusCode": 400, "message": ["Enter a valid email address."], "error": "Bad Request" }
  { "statusCode": 401, "message": "Invalid email or password.", "error": "Unauthorized" }
  ```

  Throw Nest's HTTP exceptions (`BadRequestException`, `ConflictException` and so on) from services, with a message a person can read.
- **CORS** allows `FRONTEND_URL` plus any origins listed in `CORS_ORIGINS`, with credentials (cookies). It allows the methods `GET`, `HEAD`, `POST`, `PUT`, `PATCH` and `DELETE`, and the request headers `Content-Type` and `Authorization`. Browsers may reuse a preflight answer for 10 minutes. Any other origin gets no CORS headers, so browsers block its requests.
- **Origin check (CSRF):** a `POST`, `PUT`, `PATCH` or `DELETE` gets a 403 unless its `Origin` header is one of the CORS origins or the API's own origin. The API's own origin is allowed so the docs page can send requests. Requests with no `Origin` header, such as curl or Next.js server-side calls, are allowed, because browsers always send the header on cross-origin writes. See [origin-check.middleware.ts](../src/common/origin-check.middleware.ts).
- **Rate limits:** 100 requests a minute per IP on every route, tighter on sensitive routes with `@Throttle()`, such as sign-in and the [candidate routes](assessments.md#candidate-links). Media downloads skip them (`@SkipThrottle()`), since audio players make many Range requests. They're off when `NODE_ENV=test`. Behind a proxy, set `TRUST_PROXY` so limits apply to the real client IP.
- **Every route needs a session** unless it's marked `@Public()`. See [authentication.md](authentication.md#protecting-routes).

### API docs

- **Swagger UI is at `/api/docs`,** and the OpenAPI 3 document is at `/api/docs/json`. Both are served whenever `NODE_ENV` isn't `production`. The setup is in [swagger.ts](../src/common/swagger.ts).
- **To try a protected endpoint,** run `POST /api/auth/login` on the docs page first. The docs page is on the API's own origin, so the browser keeps the session cookie and sends it with every later request from the page.
- **To document a new endpoint:**
  - On the controller, add `@ApiTags('<area>')`. On each route, add `@ApiOperation({ summary })`.
  - Describe the success response with `@ApiOkResponse({ type: SomeDto })`, `@ApiCreatedResponse` or `@ApiNoContentResponse`. Response DTOs must be classes with `@ApiProperty()` on each field; Swagger can't see interfaces, because they don't exist at runtime.
  - Describe the errors a caller should handle, such as `@ApiConflictResponse({ type: ErrorResponseDto, description })`. See [error-response.dto.ts](../src/common/error-response.dto.ts).
  - Mark routes that need a session with [`@ApiSession()`](../src/auth/decorators/api-session.decorator.ts), or put it on the controller if every route needs one. It only changes the docs; the guard does the checking.
  - Mark admin-only routes with [`@AdminOnly()`](../src/auth/decorators/admin-only.decorator.ts). It applies `@Roles(UserRole.ADMIN)` and documents the 403.
  - For an upload, add `@ApiConsumes('multipart/form-data')` and an `@ApiBody` schema with a binary `file` property. For a download, add `@ApiProduces('text/csv')` or the matching type.
  - For request DTO fields, the shared validators in [validators.ts](../src/auth/dto/validators.ts) document themselves. For any other field, add `@ApiProperty()` or `@ApiPropertyOptional()` next to its `class-validator` decorators.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Global prefix and versioning | `/api`, with no version | One first-party client, deployed with the API. If we need versions later, Nest's URI versioning with a version-neutral default keeps today's URLs working. | Build default |
| Error shape | NestJS's default `{ statusCode, message, error }` | Consistent enough for the frontend's `ApiError`. We can add machine-readable codes when a screen needs them. | Build default |
| Body format | JSON, plus `multipart/form-data` on the two upload routes | JSON blocks CSRF through plain HTML forms. The upload routes are admin-only, and the `SameSite=Lax` cookie and the Origin check still stop cross-site forms there. | Build default |
| Pagination (was open) | Offset: `page` and `pageSize`, answering `{ items, total, page, pageSize }` | The Sent list shows a total and pages, and the lists are small. Cursor paging can come later if a list grows large. | Build default |
| Downloads | The API sets `Content-Disposition: attachment`, and the frontend uses plain links | The browser saves the file, sending the session cookie, with no download code in the frontend. | Build default |
| CSRF protection | `SameSite=Lax` cookie, JSON-only bodies and an Origin check; no CSRF tokens | Covers cookie sessions without the frontend having to handle a token. | Build default |
| CORS | `FRONTEND_URL` plus the optional `CORS_ORIGINS`, with credentials, an explicit list of methods and headers, and preflights cached for 10 minutes | The frontend sends cookies, so the allowlist has to be exact. `CORS_ORIGINS` covers a staging frontend or a separate candidate site without a code change. | Requested |
| API docs | Swagger UI and the OpenAPI document, from `@nestjs/swagger` 11, served outside production only | The frontend can read the spec or generate types from it. Production doesn't expose an interactive console. The 12.x releases are for NestJS 12. | Requested |
| How endpoints are documented | Explicit decorators, not the Nest CLI Swagger plugin | The plugin only runs in `nest build`, so tests wouldn't see the docs, and it can't read our shared validators. | Build default |

## Open decisions

- Whether the frontend generates its API types from `/api/docs/json` (for example with `openapi-typescript`). Decide with the frontend's [api-client.md](../../frontend/docs/api-client.md).
- Whether to serve the docs in production, behind sign-in.
- Machine-readable error codes, if the frontend needs to branch on errors rather than show them.
- Security headers with `helmet`.

## References

- [authentication.md](authentication.md), [operations.md](operations.md)
- [configuration.md](configuration.md) (`FRONTEND_URL`, `CORS_ORIGINS`, `TRUST_PROXY`)
- Rules: [`security-validate-all-input`](../.agents/skills/nestjs-best-practices/rules/security-validate-all-input.md), [`api-use-pipes`](../.agents/skills/nestjs-best-practices/rules/api-use-pipes.md), [`api-use-dto-serialization`](../.agents/skills/nestjs-best-practices/rules/api-use-dto-serialization.md), [`error-throw-http-exceptions`](../.agents/skills/nestjs-best-practices/rules/error-throw-http-exceptions.md), [`api-versioning`](../.agents/skills/nestjs-best-practices/rules/api-versioning.md)
- [NestJS: OpenAPI](https://docs.nestjs.com/openapi/introduction)
- Frontend: [api-client.md](../../frontend/docs/api-client.md)
