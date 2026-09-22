# Database

**Status:** In progress · **Last updated:** 2026-09-21

## Scope

The database engine, ORM, schema, migrations, seed data and transactions. The domain models themselves are described in their area docs: [authentication.md](authentication.md), [recruitment-pipeline.md](recruitment-pipeline.md) and [assessments.md](assessments.md).

## Current state

- **Prisma ORM 7.10 with PostgreSQL.** Local development uses a local Prisma Postgres instance (`prisma dev`). Production uses your own Postgres 17 — in the reference setup, a container already running on the same server, reached over a shared Docker network. See [Deployed environments](#deployed-environments).
- **Files:** the schema is [prisma/schema.prisma](../prisma/schema.prisma), CLI config is [prisma.config.ts](../prisma.config.ts), and migrations are in [prisma/migrations/](../prisma/migrations/).
- **Prisma Client is generated** into `src/generated/prisma/`. That folder is gitignored and regenerated on every `pnpm install`.
- **[`PrismaService`](../src/prisma/prisma.service.ts)** is the app's one client, provided globally by `PrismaModule`. It connects over TCP with the `@prisma/adapter-pg` driver adapter.
- **Tables:** `users`, `sessions` and `auth_tokens` for [authentication](authentication.md), created by the first migration, `20260915032122_init_auth`. Then `assessments`, `assessment_sections`, `questions`, `question_options`, `score_bands`, `media_assets`, `candidates`, `assessment_invitations`, `assessment_attempts` and `attempt_answers` for [assessments](assessments.md#data-model), created by `20260915070113_init_assessments`.
- **Seed data:** the five prefilled tests, loaded with `pnpm db:seed`. See [Seed data](#seed-data).

## Requirements

- Production uses a **Postgres that already runs on the deployment server**, shared with whatever else is hosted there (2026-09-16). Local development stays on Prisma Postgres.

## How it works

### Local setup

```bash
pnpm db:start     # start the local Prisma Postgres instance "tmx-assessment" in the background
                  # and print its postgres:// URL; put that URL in .env as DATABASE_URL
pnpm db:migrate   # apply the migrations
pnpm db:seed      # optional: load the prefilled tests and their audio
pnpm db:studio    # optional: browse the data
pnpm db:stop      # stop the instance
```

The instance keeps its data between restarts. It listens on ports 51216 to 51219. If `pnpm db:start` prints a different URL, update `.env`.

### Deployed environments

The API runs in Docker on the server and joins the Postgres container's network, `postgres_network`. See [operations.md](operations.md#deployment).

1. On that Postgres, create a role and a database for TMX Assessment, once:

   ```sql
   CREATE ROLE tmx_assessment LOGIN PASSWORD '<password>';
   CREATE DATABASE tmx_assessment OWNER tmx_assessment;
   ```

2. Put its URL in `backend/.env` on the server, using the Postgres container's name on `postgres_network` and the container port `5432`:

   ```
   DATABASE_URL=postgresql://tmx_assessment:<password>@postgres_db:5432/tmx_assessment
   ```

3. Migrations run on every start. The image's start command is `prisma migrate deploy && node dist/main`, so a container that can't migrate never serves, and nothing runs `pnpm db:deploy` by hand.

A managed database works too: put its direct URL (with `?sslmode=require`) in `DATABASE_URL` and drop `postgres_network` from [docker-compose-production.yml](../docker-compose-production.yml).

### Changing the schema

1. Edit `prisma/schema.prisma`.
2. Run `pnpm db:migrate --name <what_changed>`. It writes a migration and applies it to your local database.
3. Run `pnpm db:generate`. Prisma 7 no longer regenerates the client after a migration.
4. Commit the new folder in `prisma/migrations/` together with the schema.

Never edit a migration that has already been applied. Deployed environments only ever run `prisma migrate deploy`.

### Seed data

```bash
pnpm db:seed            # load the tests in seed/ that aren't in the database yet
pnpm db:seed --force    # rewrite them from the files
```

- **It builds the app and runs [src/cli/seed-assessments.ts](../src/cli/seed-assessments.ts),** which reads every file in [seed/assessments/](../seed/assessments/) and checks it the same way a JSON import does. The files use the [canonical format](assessments.md#the-canonical-format).
- **A test whose slug already exists is skipped.** With `--force` it's rewritten from its file. Candidates who were already sent it keep their frozen copy.
- **Seeded tests are published,** so they can be sent straight away.
- **The audio each test names** is uploaded from [seed/media/](../seed/media/) into `STORAGE_DIR`, unless a stored file with that name already exists.
- `--dir <folder>` reads another folder with the same layout.

**Seed from the machine the app runs on.** The audio goes to the `STORAGE_DIR` of whichever machine runs the seed, not of the machine holding the database. Seeding a deployed database from a laptop therefore splits the test in two: the rows land on the server and the mp3s stay on the laptop, and every listening question's audio answers `404`. On the server, run it inside the container, which carries `seed/` and writes to the uploads volume:

```bash
docker compose -f backend/docker-compose-production.yml exec backend node dist/cli/seed-assessments
```

Call `node dist/cli/seed-assessments`, not `pnpm db:seed`: that script runs `nest build` first, and the Nest CLI is a devDependency the production image doesn't install.

Re-running won't repair a database that was seeded from the wrong machine. Without `--force` the slugs are skipped; with `--force` the files are uploaded again but the questions are relinked to the assets already on them, whose bytes are still missing. Copy the files onto the volume, or seed a database with no tests in it yet.

### Conventions

- **Names:** models are singular PascalCase and fields camelCase. In Postgres, tables are plural snake_case (`@@map("users")`), and columns and enum types are snake_case (`@map("created_at")`).
- **IDs:** UUID v7, `@id @default(uuid(7)) @db.Uuid`. They can't be guessed and they sort by creation time.
- **Timestamps:** `@db.Timestamptz(3)`. Every model has `createdAt`, plus `updatedAt` if its rows change.
- **Imports:** models, `Prisma` and `PrismaClient` come from `src/generated/prisma/client`; enums from `src/generated/prisma/enums`.
- **Transactions:** a method that sometimes runs inside a transaction takes an optional `db: Prisma.TransactionClient = this.prisma` as its last argument. See `SessionsService.revokeAllForUser`. Imports write many rows in one transaction, so they allow 30 seconds instead of Prisma's 5 (`IMPORT_TRANSACTION_TIMEOUT_MS`).
- **Prisma errors:** check with the helpers in [prisma-errors.ts](../src/prisma/prisma-errors.ts): `isUniqueViolation(error)` (turn it into a 409), `isForeignKeyViolation(error)` (a delete blocked by rows that still refer to the record) and `isRecordNotFound(error)` (an update or delete that found nothing).
- **JSON columns** hold versioned shapes, such as an attempt's `snapshot` and `layout`. Read them back through a function that checks the version, such as `readSnapshot()` in [snapshot.ts](../src/assessments/canonical/snapshot.ts).

## Decisions

"Requested" means the maintainers asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Production database | A Postgres 17 container already on the deployment server, joined over an external Docker network | One database server for everything on that host, and the layout the maintainers' other deploys use. Replaces the earlier choice of Prisma Postgres for production (2026-09-16). | Requested |
| Local development database | Local Prisma Postgres (`prisma dev`), no Docker | It's Postgres too, and it comes with the `prisma` package, so there's nothing else to install. | Build default |
| Prisma version | 7.10, not 8.0 | npm's `latest` tag currently points at an 8.0 release candidate. The Prisma agent skills in this repo describe 7.x. | Build default |
| How the app connects | `@prisma/adapter-pg` over a direct TCP connection | The setup the `prisma-postgres` skill recommends for Node.js servers. | Build default |
| Where the client is generated | `src/generated/prisma`, gitignored, generated on install | `nest build` compiles it with the app, and it never goes stale in git. | Build default |
| Naming in Postgres | snake_case tables and columns | Easier raw SQL and reporting tools. | Build default |
| IDs | UUID v7 | Not guessable in URLs, and sorted by time. | Build default |
| Seed data | A CLI, `pnpm db:seed`, that loads canonical JSON files, instead of `prisma db seed` | It reuses the import's checks and the storage interface for the audio, the way `auth:invite-admin` reuses the app. | Build default |

## Open decisions

- **Retention:** how long candidate personal data and answers are kept, and how they're deleted on request.
- **Cleanup of expired rows:** expired sessions are deleted when their user next signs in, and used tokens when a new one is issued. A scheduled cleanup job can come later.
- **Seed data for the pipeline:** the default stages, once that module exists. All five prefilled tests are seeded already. See the [db seed reference](../.agents/skills/prisma-cli/references/db-seed.md).

## References

- [configuration.md](configuration.md) (`DATABASE_URL`)
- [testing.md](testing.md) (which database the tests use)
- Rules: [`db-use-migrations`](../.agents/skills/nestjs-best-practices/rules/db-use-migrations.md), [`db-use-transactions`](../.agents/skills/nestjs-best-practices/rules/db-use-transactions.md), [`db-avoid-n-plus-one`](../.agents/skills/nestjs-best-practices/rules/db-avoid-n-plus-one.md), [`arch-use-repository-pattern`](../.agents/skills/nestjs-best-practices/rules/arch-use-repository-pattern.md)
- Skills: [`prisma-database-setup`](../.agents/skills/prisma-database-setup/SKILL.md), [`prisma-postgres`](../.agents/skills/prisma-postgres/SKILL.md), [`prisma dev`](../.agents/skills/prisma-cli/references/dev.md)
