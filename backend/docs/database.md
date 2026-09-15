# Database

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

The database engine, ORM, schema, migrations, seed data and transactions. The domain models themselves are described in their area docs: [authentication.md](authentication.md), [recruitment-pipeline.md](recruitment-pipeline.md) and [assessments.md](assessments.md).

## Current state

- **Prisma ORM 7.10 with PostgreSQL,** hosted on **Prisma Postgres**. Local development uses a local Prisma Postgres instance (`prisma dev`).
- **Files:** the schema is [prisma/schema.prisma](../prisma/schema.prisma), CLI config is [prisma.config.ts](../prisma.config.ts), and migrations are in [prisma/migrations/](../prisma/migrations/).
- **Prisma Client is generated** into `src/generated/prisma/`. That folder is gitignored and regenerated on every `pnpm install`.
- **[`PrismaService`](../src/prisma/prisma.service.ts)** is the app's one client, provided globally by `PrismaModule`. It connects over TCP with the `@prisma/adapter-pg` driver adapter.
- **Tables:** `users`, `sessions` and `auth_tokens`, for [authentication](authentication.md). They were created by the first migration, `20260915032122_init_auth`.
- **No seed data yet.**

## Requirements

- The database is **Prisma Postgres**.

## How it works

### Local setup

```bash
pnpm db:start     # start the local Prisma Postgres instance "tmx-hr" in the background
                  # and print its postgres:// URL; put that URL in .env as DATABASE_URL
pnpm db:migrate   # apply the migrations
pnpm db:studio    # optional: browse the data
pnpm db:stop      # stop the instance
```

The instance keeps its data between restarts. It listens on ports 51216 to 51219. If `pnpm db:start` prints a different URL, update `.env`.

### Deployed environments

1. Create a database in the [Prisma Console](https://console.prisma.io).
2. Copy its **direct** connection string (`postgres://…@db.prisma.io:5432/postgres?sslmode=require`) into `DATABASE_URL`.
3. Run `pnpm db:deploy` on every release, before the app starts.

### Changing the schema

1. Edit `prisma/schema.prisma`.
2. Run `pnpm db:migrate --name <what_changed>`. It writes a migration and applies it to your local database.
3. Run `pnpm db:generate`. Prisma 7 no longer regenerates the client after a migration.
4. Commit the new folder in `prisma/migrations/` together with the schema.

Never edit a migration that has already been applied. Deployed environments only ever run `prisma migrate deploy`.

### Conventions

- **Names:** models are singular PascalCase and fields camelCase. In Postgres, tables are plural snake_case (`@@map("users")`), and columns and enum types are snake_case (`@map("created_at")`).
- **IDs:** UUID v7, `@id @default(uuid(7)) @db.Uuid`. They can't be guessed and they sort by creation time.
- **Timestamps:** `@db.Timestamptz(3)`. Every model has `createdAt`, plus `updatedAt` if its rows change.
- **Imports:** models, `Prisma` and `PrismaClient` come from `src/generated/prisma/client`; enums from `src/generated/prisma/enums`.
- **Transactions:** a method that sometimes runs inside a transaction takes an optional `db: Prisma.TransactionClient = this.prisma` as its last argument. See `SessionsService.revokeAllForUser`.
- **Unique violations:** check with `isUniqueViolation(error)` from [prisma-errors.ts](../src/prisma/prisma-errors.ts) and turn them into a 409.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Hosting | Prisma Postgres | | Requested |
| Local development database | Local Prisma Postgres (`prisma dev`), no Docker | It's the same product as production, and it comes with the `prisma` package, so there's nothing else to install. | Build default |
| Prisma version | 7.10, not 8.0 | npm's `latest` tag currently points at an 8.0 release candidate. The Prisma agent skills in this repo describe 7.x. | Build default |
| How the app connects | `@prisma/adapter-pg` over a direct TCP connection | The setup the `prisma-postgres` skill recommends for Node.js servers. | Build default |
| Where the client is generated | `src/generated/prisma`, gitignored, generated on install | `nest build` compiles it with the app, and it never goes stale in git. | Build default |
| Naming in Postgres | snake_case tables and columns | Easier raw SQL and reporting tools. | Build default |
| IDs | UUID v7 | Not guessable in URLs, and sorted by time. | Build default |

## Open decisions

- **Retention:** how long candidate personal data and answers are kept, and how they're deleted on request.
- **Cleanup of expired rows:** expired sessions are deleted when their user next signs in, and used tokens when a new one is issued. A scheduled cleanup job can come later.
- **Seed data:** the default pipeline stages and the five assessments, once those modules exist. See the [db seed reference](../.agents/skills/prisma-cli/references/db-seed.md).

## References

- [configuration.md](configuration.md) (`DATABASE_URL`)
- [testing.md](testing.md) (which database the tests use)
- Rules: [`db-use-migrations`](../.agents/skills/nestjs-best-practices/rules/db-use-migrations.md), [`db-use-transactions`](../.agents/skills/nestjs-best-practices/rules/db-use-transactions.md), [`db-avoid-n-plus-one`](../.agents/skills/nestjs-best-practices/rules/db-avoid-n-plus-one.md), [`arch-use-repository-pattern`](../.agents/skills/nestjs-best-practices/rules/arch-use-repository-pattern.md)
- Skills: [`prisma-database-setup`](../.agents/skills/prisma-database-setup/SKILL.md), [`prisma-postgres`](../.agents/skills/prisma-postgres/SKILL.md), [`prisma dev`](../.agents/skills/prisma-cli/references/dev.md)
