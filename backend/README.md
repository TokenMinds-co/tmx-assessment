# TMX HR: Backend

REST API for TMX HR, built with NestJS 11 and TypeScript. For what the product does and why, see the [root README](../README.md).

> **Status: fresh scaffold.** The only endpoint is `GET /`, which returns `Hello World!`. There is no database, auth or feature module yet.

## Stack

- NestJS 11 on Express, TypeScript 5
- Jest 30 and Supertest for tests
- ESLint 9 and Prettier (single quotes, trailing commas)
- pnpm
- **Planned, not installed:** PostgreSQL with Prisma. See [database.md](docs/database.md).

## Requirements

- Node.js 20 or newer (NestJS 11 requires `>= 20`)
- pnpm

## Getting started

```bash
pnpm install
PORT=4000 pnpm start:dev
```

[`src/main.ts`](src/main.ts) listens on `PORT`, or 3000 if it isn't set. The frontend dev server also uses 3000, so set `PORT` when you run both. See [configuration.md](docs/configuration.md).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm start:dev` | Run in watch mode |
| `pnpm start:debug` | Run in watch mode with the debugger attached |
| `pnpm build` | Compile to `dist/` |
| `pnpm start:prod` | Run the compiled app from `dist/main` |
| `pnpm lint` | Run ESLint and fix what it can |
| `pnpm format` | Run Prettier on `src/` and `test/` |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | End-to-end tests |
| `pnpm test:cov` | Unit tests with a coverage report |

## Project structure

```text
backend/
├── src/
│   ├── main.ts             # Bootstrap: creates the app, listens on PORT
│   ├── app.module.ts       # Root module
│   ├── app.controller.ts   # GET / (scaffold sample)
│   └── app.service.ts
├── test/
│   ├── app.e2e-spec.ts     # E2E test for GET /
│   └── jest-e2e.json
├── docs/                   # Area docs and CHANGELOG.md
└── .agents/skills/         # Agent skills for NestJS and Prisma
```

New code goes into feature modules, one per domain (for example `src/candidates/` or `src/assessments/`), following the [`arch-feature-modules`](.agents/skills/nestjs-best-practices/rules/arch-feature-modules.md) rule.

## Docs

| Area | Doc | Status |
| --- | --- | --- |
| API conventions | [api-conventions.md](docs/api-conventions.md) | Not started |
| Authentication | [authentication.md](docs/authentication.md) | Not started |
| Configuration | [configuration.md](docs/configuration.md) | Scaffold only |
| Database | [database.md](docs/database.md) | Not started |
| Recruitment pipeline | [recruitment-pipeline.md](docs/recruitment-pipeline.md) | Not started |
| Assessments | [assessments.md](docs/assessments.md) | Not started |
| Question generation | [question-generation.md](docs/question-generation.md) | Not started |
| Testing | [testing.md](docs/testing.md) | Scaffold only |

Changes are logged in [CHANGELOG.md](docs/CHANGELOG.md). To add or update a doc, follow the [doc rules in the root README](../README.md#documentation).

## Agent skills

`.agents/skills/` holds agent skills for NestJS and Prisma, pinned in `skills-lock.json`. The area docs link to the rules that apply. Don't edit these files by hand; the skills installer manages them.
