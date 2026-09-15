# API conventions

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

How the HTTP API is shaped: routes, request validation, response and error format, versioning and CORS. Sign-in and route protection are in [authentication.md](authentication.md).

## Current state

- One sample route, `GET /`, which returns the plain string `Hello World!` ([app.controller.ts](../src/app.controller.ts)).
- [main.ts](../src/main.ts) sets up nothing else: no global prefix, validation pipe, exception filter, versioning or CORS.

## Proposed approach

- **REST over JSON,** with one controller per feature module.
- **Validate every input** with DTOs and a global `ValidationPipe` (this needs `class-validator` and `class-transformer`). See [`security-validate-all-input`](../.agents/skills/nestjs-best-practices/rules/security-validate-all-input.md) and [`api-use-pipes`](../.agents/skills/nestjs-best-practices/rules/api-use-pipes.md).
- **Return response DTOs,** not database models, so internal fields never leak. See [`api-use-dto-serialization`](../.agents/skills/nestjs-best-practices/rules/api-use-dto-serialization.md).
- **Throw Nest HTTP exceptions** and map them to one error shape in a global exception filter. See [`error-throw-http-exceptions`](../.agents/skills/nestjs-best-practices/rules/error-throw-http-exceptions.md) and [`error-use-exception-filters`](../.agents/skills/nestjs-best-practices/rules/error-use-exception-filters.md).
- **Enable CORS** for the frontend origin if the browser calls the API directly. See the frontend's [api-client.md](../../frontend/docs/api-client.md).

## Open decisions

- Global prefix and versioning, for example `/api/v1`. See [`api-versioning`](../.agents/skills/nestjs-best-practices/rules/api-versioning.md).
- The error response shape.
- Pagination for list endpoints: offset or cursor.
- Whether to publish an OpenAPI spec with `@nestjs/swagger`, so the frontend can generate its types from it.

## References

- [authentication.md](authentication.md)
- [configuration.md](configuration.md) (the frontend origin for CORS)
- Frontend: [api-client.md](../../frontend/docs/api-client.md)
