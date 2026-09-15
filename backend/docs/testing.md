# Testing

**Status:** Scaffold only · **Last updated:** 2026-09-15

## Scope

Unit and end-to-end tests: tools, file layout, commands and conventions.

## Current state

- **Jest 30 with ts-jest.**
- **Unit tests** are `*.spec.ts` files next to the code in `src/`. Their config is the `jest` block in [package.json](../package.json).
- **E2E tests** are `*.e2e-spec.ts` files in `test/` and use Supertest. Their config is [test/jest-e2e.json](../test/jest-e2e.json).
- The existing tests only cover the scaffold: [app.controller.spec.ts](../src/app.controller.spec.ts) and [app.e2e-spec.ts](../test/app.e2e-spec.ts) both check that `GET /` returns `Hello World!`.
- Coverage reports go to `coverage/`, which git ignores.
- There's no CI yet.

| Command | What it runs |
| --- | --- |
| `pnpm test` | Unit tests |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:cov` | Unit tests with coverage |
| `pnpm test:e2e` | E2E tests |

## Proposed approach

- **Build modules under test** with `Test.createTestingModule`. See [`test-use-testing-module`](../.agents/skills/nestjs-best-practices/rules/test-use-testing-module.md).
- **Mock external services,** such as the LLM provider and email. See [`test-mock-external-services`](../.agents/skills/nestjs-best-practices/rules/test-mock-external-services.md).
- **Write e2e tests** with Supertest against the real app module. See [`test-e2e-supertest`](../.agents/skills/nestjs-best-practices/rules/test-e2e-supertest.md).
- **Test scoring logic thoroughly,** with fixed answer sets. A scoring bug filters out the wrong candidates.

## Open decisions

- The test database for e2e tests: Docker, Testcontainers, or a separate hosted database.
- CI: where tests run on each PR.

## References

- [database.md](database.md)
- [assessments.md](assessments.md) (scoring)
