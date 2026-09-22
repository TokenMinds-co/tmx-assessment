# TMX Assessment: Backend

REST API for TMX Assessment, built with NestJS 11 and TypeScript. For what the product does and why, see the [root README](../README.md).

> **Status: authentication, assessments and the dashboard are built.** Staff sign in with email and password, and admins invite staff by email. Admins build tests; staff send them to candidates, who take them through an emailed link, and the server times and scores them. Five tests are prefilled, converted from the workbooks in [seed/workbooks/](seed/workbooks/). `GET /api/dashboard` answers the staff home page in one request. The API has interactive docs and health checks, and the frontend is wired to it. It deploys to a Linux server as a Docker container through GitHub Actions. Next is the recruitment pipeline.

## Stack

- NestJS 11 on Express, TypeScript 5
- PostgreSQL on Prisma Postgres, through Prisma ORM 7. See [database.md](docs/database.md).
- Resend for email. See [email.md](docs/email.md).
- Swagger (`@nestjs/swagger`) for the API docs, Terminus for health checks
- Docker, built and deployed by GitHub Actions. See [operations.md](docs/operations.md#deployment).
- Jest 30 and Supertest for tests
- ESLint 9 and Prettier (single quotes, trailing commas)
- pnpm

## Requirements

- Node.js 24, the version [`.nvmrc`](../.nvmrc) pins, CI runs and the Dockerfile builds on. The `engines` field in `package.json` also accepts 20.19+ and 22.12+, the range Prisma 7 sets.
- pnpm 11.8.0, pinned in `packageManager` in `package.json`. `corepack enable` picks it up on its own.

## Getting started

```bash
pnpm install        # also generates Prisma Client
cp .env.example .env
pnpm db:start       # starts local Prisma Postgres; put the URL it prints in .env as DATABASE_URL
pnpm db:migrate     # creates the tables
pnpm db:seed        # optional: loads the prefilled tests and their audio
pnpm start:dev
```

The startup log prints where everything is:

| What | URL |
| --- | --- |
| API | http://localhost:4000/api |
| API docs (Swagger UI) | http://localhost:4000/api/docs |
| OpenAPI document | http://localhost:4000/api/docs/json |
| Health check | http://localhost:4000/api/health/ready |

All settings live in `.env`; see [configuration.md](docs/configuration.md). While `RESEND_API_KEY` is empty, emails are printed in the terminal instead of sent. Uploaded files, such as question audio, go to `STORAGE_DIR` (default `./storage`).

### Create the first admin

Accounts are invite-only, so the first admin comes from the command line:

```bash
pnpm auth:invite-admin --email you@example.com --name "Your Name"
```

It prints the invitation link, and while `RESEND_API_KEY` is empty it prints the email too. With the frontend running, open the link, choose a password, and you're signed in. After that, sign in at http://localhost:3000/login. Every endpoint is listed in [authentication.md](docs/authentication.md#endpoints).

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
| `pnpm db:seed` | Load the prefilled tests and their audio from `seed/`. Tests that exist are skipped; `--force` rewrites them. See [database.md](docs/database.md#seed-data). |
| `pnpm auth:invite-admin` | Invite an admin by email (`--email`, `--name`) |

## Project structure

```text
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # One folder per migration, committed
├── prisma.config.ts        # Prisma CLI config
├── seed/
│   ├── assessments/        # The prefilled tests, in the canonical JSON format
│   ├── media/              # Their audio clips
│   └── workbooks/          # The spreadsheets they were converted from, one per slug
├── src/
│   ├── main.ts             # Bootstrap: creates the app, listens on PORT, logs the URLs
│   ├── app.setup.ts        # HTTP setup (CORS, validation, docs), shared with the e2e tests
│   ├── app.module.ts       # Root module: config, rate limits, feature modules
│   ├── auth/               # Sign-in, sessions, passwords, invitations, guards
│   ├── assessments/        # Tests, questions, sending, the candidate API and scoring
│   ├── candidates/         # Candidates, for sending tests
│   ├── dashboard/          # The numbers on the staff home page
│   ├── media/              # Uploading and serving question audio and images
│   ├── storage/            # Where uploaded files are kept (local disk)
│   ├── health/             # Liveness and readiness checks
│   ├── mail/               # Email templates and transports (Resend)
│   ├── prisma/             # PrismaService
│   ├── config/             # Environment variable checks
│   ├── common/             # Shared middleware, tokens, email links, CSV, downloads and the API docs setup
│   ├── cli/                # Command-line scripts: invite an admin, seed the tests
│   └── generated/          # Prisma Client (generated, gitignored)
├── storage/                # Uploaded files (STORAGE_DIR), gitignored
├── test/                   # E2E tests and their helpers
├── docs/                   # Area docs and CHANGELOG.md
├── Dockerfile              # The production image; CI builds it from this folder
├── docker-compose.local.yml       # Postgres and the API together; the one that works on a fresh machine
├── docker-compose-production.yml  # Runs the GHCR image against a Postgres already on the host
├── docker-compose.yml      # The same stack, built from this folder, for checking the image
└── .agents/skills/         # Agent skills for NestJS and Prisma (not tracked in git; see below)
```

The workflows live at the repository root: [.github/workflows/ci.yml](../.github/workflows/ci.yml) runs the checks and [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) ships the image.

New code goes into feature modules, one per domain (like `src/assessments/`, or `src/jobs/` next), following the [`arch-feature-modules`](.agents/skills/nestjs-best-practices/rules/arch-feature-modules.md) rule. Routes need a session by default; see [authentication.md](docs/authentication.md#protecting-routes). Document every endpoint for Swagger; see [api-conventions.md](docs/api-conventions.md#api-docs).

## Deployment

Every push to `main` that touches `backend/` builds the Docker image, pushes it to GitHub Container Registry and deploys it to the server over SSH. The deploy is guarded so a fork never tries to run it. Checks are a separate workflow that runs on every pull request. The server setup, the GitHub secrets, and how to run the first-admin and seed commands in the container are in [operations.md](docs/operations.md#deployment).

## Docs

| Area | Doc | Status |
| --- | --- | --- |
| API conventions | [api-conventions.md](docs/api-conventions.md) | In progress |
| Authentication | [authentication.md](docs/authentication.md) | In progress |
| Configuration | [configuration.md](docs/configuration.md) | In progress |
| Dashboard | [dashboard.md](docs/dashboard.md) | In progress (the endpoint is built) |
| Database | [database.md](docs/database.md) | In progress |
| Email | [email.md](docs/email.md) | In progress |
| Operations | [operations.md](docs/operations.md) | In progress |
| Recruitment pipeline | [recruitment-pipeline.md](docs/recruitment-pipeline.md) | Not started |
| Assessments | [assessments.md](docs/assessments.md) | In progress |
| Question generation | [question-generation.md](docs/question-generation.md) | Not started |
| Testing | [testing.md](docs/testing.md) | In progress |

Changes are logged in [CHANGELOG.md](docs/CHANGELOG.md). To add or update a doc, follow the [doc rules in the root README](../README.md#documentation).

## Agent skills

`.agents/skills/` holds agent skills for NestJS and Prisma. **The folder is not tracked in git**, so a fresh clone doesn't have it; only `skills-lock.json` is, which pins each skill's source and a hash of its contents. To restore them, run this once in `backend/` (and again in `frontend/` for that package's skills):

```bash
pnpm dlx skills experimental_install
```

You don't need them to build or test anything; they only matter if you work with a coding agent. The area docs link to the rules that apply, so those links resolve only after the install. Don't edit these files by hand; the installer overwrites them and the lockfile's hashes stop matching.
