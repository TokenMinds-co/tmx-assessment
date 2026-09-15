# API conventions

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

How the HTTP API is shaped: routes, request validation, response and error format, versioning, CORS and CSRF. Sign-in and route protection are in [authentication.md](authentication.md).

## Current state

The HTTP setup lives in [app.setup.ts](../src/app.setup.ts). Both [main.ts](../src/main.ts) and the e2e tests use it, so tests run through the same pipeline as production. The only routes so far are the [auth endpoints](authentication.md#endpoints) and the scaffold's `GET /api`, which returns `Hello World!`.

## How it works

- **Every route starts with `/api`.** There's no version segment.
- **Request bodies are JSON only,** up to 100 KB. Form-encoded bodies aren't parsed, which blocks form-based CSRF.
- **Every input is validated** by a global `ValidationPipe` against DTO classes (`class-validator`). Unknown fields are rejected with a 400, and values are transformed first where a DTO says so, for example emails are trimmed and lowercased.
- **Responses are response DTOs,** never Prisma models, so internal fields such as password hashes can't leak. See [`UserResponseDto`](../src/auth/dto/user-response.dto.ts). Dates are ISO 8601 strings.
- **Errors use NestJS's default shape.** `message` is a string, or a list of strings for validation errors:

  ```json
  { "statusCode": 400, "message": ["Enter a valid email address."], "error": "Bad Request" }
  { "statusCode": 401, "message": "Invalid email or password.", "error": "Unauthorized" }
  ```

  Throw Nest's HTTP exceptions (`BadRequestException`, `ConflictException` and so on) from services, with a message a person can read.
- **CORS** allows only `FRONTEND_URL`, with credentials (cookies).
- **Origin check (CSRF):** a `POST`, `PUT`, `PATCH` or `DELETE` whose `Origin` header isn't `FRONTEND_URL` gets a 403. Requests with no `Origin` header, such as curl or Next.js server-side calls, are allowed, because browsers always send the header on cross-origin writes. See [origin-check.middleware.ts](../src/common/origin-check.middleware.ts).
- **Rate limits:** 100 requests a minute per IP on every route, tighter on sensitive routes with `@Throttle()`. They're off when `NODE_ENV=test`. Behind a proxy, set `TRUST_PROXY` so limits apply to the real client IP.
- **Every route needs a session** unless it's marked `@Public()`. See [authentication.md](authentication.md#protecting-routes).

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Global prefix and versioning | `/api`, with no version | One first-party client, deployed with the API. If we need versions later, Nest's URI versioning with a version-neutral default keeps today's URLs working. | Build default |
| Error shape | NestJS's default `{ statusCode, message, error }` | Consistent enough for the frontend's `ApiError`. We can add machine-readable codes when a screen needs them. | Build default |
| Body format | JSON only | Blocks CSRF through plain HTML forms. | Build default |
| CSRF protection | `SameSite=Lax` cookie, JSON-only bodies and an Origin check; no CSRF tokens | Covers cookie sessions without the frontend having to handle a token. | Build default |

## Open decisions

- Pagination for list endpoints: offset or cursor.
- Whether to publish an OpenAPI spec with `@nestjs/swagger`, so the frontend can generate its types from it.
- Machine-readable error codes, if the frontend needs to branch on errors rather than show them.
- Security headers with `helmet`.

## References

- [authentication.md](authentication.md)
- [configuration.md](configuration.md) (`FRONTEND_URL`, `TRUST_PROXY`)
- Rules: [`security-validate-all-input`](../.agents/skills/nestjs-best-practices/rules/security-validate-all-input.md), [`api-use-pipes`](../.agents/skills/nestjs-best-practices/rules/api-use-pipes.md), [`api-use-dto-serialization`](../.agents/skills/nestjs-best-practices/rules/api-use-dto-serialization.md), [`error-throw-http-exceptions`](../.agents/skills/nestjs-best-practices/rules/error-throw-http-exceptions.md), [`api-versioning`](../.agents/skills/nestjs-best-practices/rules/api-versioning.md)
- Frontend: [api-client.md](../../frontend/docs/api-client.md)
