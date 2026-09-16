# Changelog: Backend

Notable changes to the backend, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**How to add an entry:** add a line under **Unreleased** in the same PR as the change, under Added, Changed, Fixed or Removed. Link the area doc when there is one. When you release, move the Unreleased lines under a new version and date.

## [Unreleased]

### Added

- Staff authentication: email and password sign-in, server-side sessions in an httpOnly cookie, invite-only accounts with `ADMIN` and `MEMBER` roles, password change, and forgot and reset password. Every route needs a session unless it's marked `@Public()`. See [authentication](authentication.md).
- `pnpm auth:invite-admin` to invite the first admin from the command line.
- Email through Resend, printed to the terminal in development when no API key is set. See [email](email.md).
- PostgreSQL through Prisma ORM 7 on Prisma Postgres, a local database with `prisma dev`, and the first migration (`users`, `sessions`, `auth_tokens`). See [database](database.md).
- Checked environment config with `@nestjs/config`, and `.env.example`. See [configuration](configuration.md).
- API conventions: the `/api` prefix, JSON-only bodies, global validation, CORS for the frontend, an Origin check against CSRF, and rate limits. See [API conventions](api-conventions.md).
- Unit tests for config, passwords, tokens and email templates; e2e tests for every auth flow against the local database. See [testing](testing.md).
- A "Decisions" section in the area docs, recording what was decided, why, and whether the team asked for it.
- Project docs: [README](../README.md) and area docs for [API conventions](api-conventions.md), [authentication](authentication.md), [configuration](configuration.md), [database](database.md), [email](email.md), [recruitment pipeline](recruitment-pipeline.md), [assessments](assessments.md), [question generation](question-generation.md) and [testing](testing.md).
- API docs: Swagger UI at `/api/docs` and the OpenAPI document at `/api/docs/json`, served outside production. See [API conventions](api-conventions.md#api-docs).
- Health checks at `/api/health/live` and `/api/health/ready`, built with `@nestjs/terminus`. See [operations](operations.md).
- A startup log with the port, the environment, the API, health and docs URLs, and the CORS origins.
- `CORS_ORIGINS`, for extra origins CORS allows. See [configuration](configuration.md).
- Area doc: [operations](operations.md).
- Assessments: test templates with sections, questions, score bands and four question types, scored by correct answers or by alignment with a role profile. Publishing checks, preview, duplicate, and JSON import and export in one canonical format, `tmx-hr.assessment/1`. See [assessments](assessments.md).
- Question CSV import and export for each test, with a dry run that reports problems by row and column, and a CSV template. See [assessments](assessments.md#question-csv).
- Sending tests: one emailed link per send, to one or more tests, each frozen when sent. Resend, revoke, a paged list of sent links, and results with section scores, flags and answers. See [assessments](assessments.md#candidate-links).
- The candidate API under `/api/take/:token`: see the tests, start one, save answers and submit, with the deadline kept by the server and 30 seconds' grace. See [assessments](assessments.md#candidate-links).
- Candidates at `/api/candidates`: a minimal record (email, name, phone) for sending tests.
- Media at `/api/media`: admin uploads of question audio and images up to 10 MiB, with the type read from the file, served publicly with Range support. Files are kept on local disk behind a `FileStorage` interface. See [assessments](assessments.md#media).
- `STORAGE_DIR`, the folder for uploaded files. See [configuration](configuration.md).
- The assessments migration (`20260915070113_init_assessments`), four prefilled tests in `seed/` with their audio, and `pnpm db:seed` to load them. See [database](database.md#seed-data).
- The candidate's assessment email, which carries the TokenMinds name. See [email](email.md).
- `@AdminOnly()`, which limits a route to admins and documents the 403.
- Unit tests for the question rules, question CSV, question order, scoring, what candidates are sent, the seed files, CSV, media types and local storage; e2e tests for media, the test library, and sending and taking tests. See [testing](testing.md).

### Changed

- The default port is now 4000 instead of 3000, so the backend and the frontend dev server can run side by side.
- The scaffold's `GET /` is now `GET /api`, and it's public. It's hidden from the API docs.
- CORS now lists its allowed methods and headers, and lets browsers cache preflight answers for 10 minutes.
- The Origin check also allows the API's own origin, so the docs page can send requests.
- Docs: the frontend is wired to the auth endpoints, so the first admin now accepts the invitation in the browser. [Authentication](authentication.md#how-the-frontend-connects) describes how the frontend connects, including `FRONTEND_URL` and rate limits behind its `/api` rewrite.
- Docs: candidates register interest through a Notion form that the app imports, and the assessments stay in this app. See [recruitment pipeline](recruitment-pipeline.md) and [assessments](assessments.md#decisions).
- `tokens.ts` and `frontend-links.ts` moved from `src/auth/` to `src/common/`, since assessments use them too. `frontend-links.ts` adds the candidate's `/take` page.
- `prisma-errors.ts` adds `isForeignKeyViolation()` and `isRecordNotFound()`.
- The build leaves out `*.fixtures.ts` files, which only tests use.
- The e2e test app keeps uploads in a temporary folder instead of `STORAGE_DIR`. See [testing](testing.md).
- Docs: the area docs describe the built assessments: [assessments](assessments.md), [candidate links](authentication.md#candidate-links), [API conventions](api-conventions.md) (multipart uploads, paging and downloads), [configuration](configuration.md), [database](database.md), [email](email.md) and [testing](testing.md).

## [0.0.1] - 2026-09-15

### Added

- NestJS 11 scaffold with a sample `GET /` endpoint, plus a unit test and an e2e test for it.
- Agent skills: `nestjs-best-practices`, `prisma-cli`, `prisma-client-api`, `prisma-database-setup` and `prisma-postgres`.
