# TMX HR: Backend

REST API for TMX HR, built with NestJS 11 and TypeScript. For what the product does and why, see the [root README](../README.md).

> **Status: authentication is built.** Staff sign in with email and password, and admins invite staff by email. The frontend isn't wired to the API yet. Next are the recruitment pipeline and assessments.

## Stack

- NestJS 11 on Express, TypeScript 5
- PostgreSQL on Prisma Postgres, through Prisma ORM 7. See [database.md](docs/database.md).
- Resend for email. See [email.md](docs/email.md).
- Jest 30 and Supertest for tests
- ESLint 9 and Prettier (single quotes, trailing commas)
- pnpm

## Requirements

- Node.js 20.19 or newer (Prisma 7 needs 20.19, NestJS 11 needs 20)
- pnpm

## Getting started

```bash
pnpm install        # also generates Prisma Client
cp .env.example .env
pnpm db:start       # starts local Prisma Postgres; put the URL it prints in .env as DATABASE_URL
pnpm db:migrate     # creates the tables
pnpm start:dev      # http://localhost:4000/api
```

All settings live in `.env`; see [configuration.md](docs/configuration.md). While `RESEND_API_KEY` is empty, emails are printed in the terminal instead of sent.

### Create the first admin

Accounts are invite-only, so the first admin comes from the command line:

```bash
pnpm auth:invite-admin --email you@tokenminds.co --name "Your Name"
```

It prints the invitation link. Until the frontend has its `/accept-invite` page, accept the invitation with the token from that link:

```bash
curl -X POST http://localhost:4000/api/auth/invitations/accept \
  -H 'content-type: application/json' \
  -d '{"token":"<token from the link>","password":"<at least 12 characters>"}'
```

After that, sign in with `POST /api/auth/login`. Every endpoint is listed in [authentication.md](docs/authentication.md#endpoints).

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
| `pnpm test:e2e` | End-to-end tests. They need the database running. |
| `pnpm test:cov` | Unit tests with a coverage report |
| `pnpm db:start` / `pnpm db:stop` | Start or stop the local Prisma Postgres instance |
| `pnpm db:migrate` | Create and apply a migration in development |
| `pnpm db:deploy` | Apply pending migrations in a deployed environment |
| `pnpm db:generate` | Regenerate Prisma Client after a schema change |
| `pnpm db:studio` | Browse and edit data in Prisma Studio |
| `pnpm auth:invite-admin` | Invite an admin by email (`--email`, `--name`) |

## Project structure

```text
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # One folder per migration, committed
├── prisma.config.ts        # Prisma CLI config
├── src/
│   ├── main.ts             # Bootstrap: creates the app, listens on PORT
│   ├── app.setup.ts        # HTTP setup, shared with the e2e tests
│   ├── app.module.ts       # Root module: config, rate limits, feature modules
│   ├── auth/               # Sign-in, sessions, passwords, invitations, guards
│   ├── mail/               # Email templates and transports (Resend)
│   ├── prisma/             # PrismaService
│   ├── config/             # Environment variable checks
│   ├── common/             # Shared middleware
│   ├── cli/                # Command-line scripts
│   └── generated/          # Prisma Client (generated, gitignored)
├── test/                   # E2E tests and their helpers
├── docs/                   # Area docs and CHANGELOG.md
└── .agents/skills/         # Agent skills for NestJS and Prisma
```

New code goes into feature modules, one per domain (for example `src/candidates/` or `src/assessments/`), following the [`arch-feature-modules`](.agents/skills/nestjs-best-practices/rules/arch-feature-modules.md) rule. Routes need a session by default; see [authentication.md](docs/authentication.md#protecting-routes).

## Docs

| Area | Doc | Status |
| --- | --- | --- |
| API conventions | [api-conventions.md](docs/api-conventions.md) | In progress |
| Authentication | [authentication.md](docs/authentication.md) | In progress |
| Configuration | [configuration.md](docs/configuration.md) | In progress |
| Database | [database.md](docs/database.md) | In progress |
| Email | [email.md](docs/email.md) | In progress |
| Recruitment pipeline | [recruitment-pipeline.md](docs/recruitment-pipeline.md) | Not started |
| Assessments | [assessments.md](docs/assessments.md) | Not started |
| Question generation | [question-generation.md](docs/question-generation.md) | Not started |
| Testing | [testing.md](docs/testing.md) | In progress |

Changes are logged in [CHANGELOG.md](docs/CHANGELOG.md). To add or update a doc, follow the [doc rules in the root README](../README.md#documentation).

## Agent skills

`.agents/skills/` holds agent skills for NestJS and Prisma, pinned in `skills-lock.json`. The area docs link to the rules that apply. Don't edit these files by hand; the skills installer manages them.
