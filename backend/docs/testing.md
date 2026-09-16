# Testing

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

Unit and end-to-end tests: tools, file layout, commands and conventions.

## Current state

- **Jest 30 with ts-jest.**
- **Unit tests** are `*.spec.ts` files next to the code in `src/`. Their config is the `jest` block in [package.json](../package.json). They cover config checks, the Origin check, password hashing, tokens, frontend links, CSV reading and writing, email templates, media type detection and local file storage, and for assessments the question rules, question CSV, question order, scoring and what candidates are sent. [seed-files.spec.ts](../src/assessments/canonical/seed-files.spec.ts) checks every seed file against its workbook's question count, time and audio.
- **E2E tests** are `*.e2e-spec.ts` files in `test/` and use Supertest. Their config is [test/jest-e2e.json](../test/jest-e2e.json). [auth.e2e-spec.ts](../test/auth.e2e-spec.ts) covers every auth flow: sign-in and cookie flags, identical errors for unknown emails and wrong passwords, validation, bearer tokens, sign-out, the Origin check, invitations and roles, password reset, password change and deactivated accounts. [app.e2e-spec.ts](../test/app.e2e-spec.ts) covers the health checks, the API docs and CORS. [assessments.e2e-spec.ts](../test/assessments.e2e-spec.ts) covers building and publishing tests, JSON import and export, duplicating, previews, question CSV and deleting. [take.e2e-spec.ts](../test/take.e2e-spec.ts) covers sending, taking and scoring tests, time running out, resending, revoking, expired links, the Sent list and candidate search. [media.e2e-spec.ts](../test/media.e2e-spec.ts) covers uploads, Range requests, type checks, the size limit and roles.
- On 2026-09-15: 107 unit tests in 16 files, all passing, and 60 e2e tests in 5 files.
- Coverage reports go to `coverage/`, which git ignores.
- There's no CI yet.

| Command | What it runs |
| --- | --- |
| `pnpm test` | Unit tests |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:cov` | Unit tests with coverage |
| `pnpm test:e2e` | E2E tests. The database must be running (`pnpm db:start`) with migrations applied. |

## How it works

- **E2E tests run the real app.** [`createTestApp()`](../test/utils/test-app.ts) builds `AppModule` and applies the same `configureApp()` as `main.ts`. The differences are email and uploads. The `MAIL_TRANSPORT` provider is replaced with an [in-memory transport](../test/utils/in-memory-mail.transport.ts), and tests read links from the captured emails with `mail.waitFor(to, /subject/)`, `tokenFrom(message)` and, for a candidate's link, `takeTokenFrom(message)`. The `FILE_STORAGE` provider is replaced with local storage in a temporary folder (`tmx-hr-e2e-<uuid>` in the system's temp folder) instead of `STORAGE_DIR`; `createTestApp()` returns it as `storageDir`, and a suite that uploads deletes it when it's done.
- **Staff accounts for a suite** come from [staff.ts](../test/utils/staff.ts): `createStaff()` writes an active user straight to the database, and `signIn()` returns a Supertest agent holding the session.
- **E2E tests use the database in `DATABASE_URL`,** normally your local Prisma Postgres. Each run gives its users emails that start with a random `e2e-xxxxxxxx-` prefix and deletes exactly those users at the end. The assessment suites give their tests' slugs and their candidates' emails the same prefix, and delete those tests, candidates and links, and the files their users uploaded. It never empties tables, so running it against your development database is safe. Suites run one at a time (`--runInBand`).
- **Jest sets `NODE_ENV=test`,** which turns off rate limits, since the tests sign in many times in a row.
- **Jest compiles TypeScript with [tsconfig.jest.json](../tsconfig.jest.json).** It compiles to CommonJS, because the generated Prisma Client loads its query compiler with `import()`, which Jest's CommonJS runtime can't run. The `moduleNameMapper` in both Jest configs strips the `.js` extension from the generated client's relative imports.
- **Tests never call outside services.** Replace them with test doubles, as the in-memory mail transport does. See [`test-mock-external-services`](../.agents/skills/nestjs-best-practices/rules/test-mock-external-services.md).
- **For unit tests of services,** build the module with `Test.createTestingModule` and mock `PrismaService`. See [`test-use-testing-module`](../.agents/skills/nestjs-best-practices/rules/test-use-testing-module.md).
- **Scoring is tested with fixed answer sets** in [scoring.spec.ts](../src/assessments/canonical/scoring.spec.ts), including the Motivation workbook's own example (0.8225, "Good fit"). A scoring bug filters out the wrong candidates. Shuffles use a seeded random source (`mulberry32` in [layout.ts](../src/assessments/canonical/layout.ts)), so they're the same every run.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| The database for e2e tests | The one in `DATABASE_URL`. Tests delete only the rows they created. | Nothing extra to set up, and it's safe to run against development data. | Build default |
| Email in tests | An in-memory transport in place of Resend | Tests follow the real links in the real emails without sending anything. | Build default |
| Uploaded files in e2e tests | A temporary folder per run, not `STORAGE_DIR` | Tests never touch real uploads, and the folder is deleted after the suite. | Build default |
| Running Prisma 7 under Jest | A separate `tsconfig.jest.json` that compiles to CommonJS | The generated client's `import()` doesn't run under Jest otherwise. The app build is unaffected. | Build default |

## Open decisions

- CI: where tests run on each PR, and which database the e2e tests use there (a `prisma dev` instance inside the job, or a throwaway Prisma Postgres database).

## References

- [database.md](database.md)
- [email.md](email.md) (the mail transport)
- [assessments.md](assessments.md) (scoring)
- [`test-e2e-supertest`](../.agents/skills/nestjs-best-practices/rules/test-e2e-supertest.md)
