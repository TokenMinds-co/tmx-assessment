# Database

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

The database engine, ORM, schema, migrations, seed data and transactions. The domain models themselves are described in [recruitment-pipeline.md](recruitment-pipeline.md) and [assessments.md](assessments.md).

## Current state

No database yet, and Prisma isn't in `package.json`. The Prisma agent skills are installed (`prisma-cli`, `prisma-client-api`, `prisma-database-setup` and `prisma-postgres`), which points to Prisma with PostgreSQL.

## Proposed approach

- **PostgreSQL with Prisma ORM.** Set it up with the [`prisma-database-setup`](../.agents/skills/prisma-database-setup/SKILL.md) skill and its [PostgreSQL reference](../.agents/skills/prisma-database-setup/references/postgresql.md).
- **Every schema change is a migration:** `prisma migrate dev` locally and `prisma migrate deploy` in deployed environments. Never edit a migration that has already been applied. See [`db-use-migrations`](../.agents/skills/nestjs-best-practices/rules/db-use-migrations.md), and the Prisma CLI references for [migrate dev](../.agents/skills/prisma-cli/references/migrate-dev.md) and [migrate deploy](../.agents/skills/prisma-cli/references/migrate-deploy.md).
- **One `PrismaService`,** injected into feature modules. Queries live in each module's repository or service, never in controllers. See [`arch-use-repository-pattern`](../.agents/skills/nestjs-best-practices/rules/arch-use-repository-pattern.md).
- **Use transactions for multi-step writes,** for example submitting an assessment and moving the candidate to the next stage. See [`db-use-transactions`](../.agents/skills/nestjs-best-practices/rules/db-use-transactions.md).
- **Avoid N+1 queries** when loading candidates with their stages and results. See [`db-avoid-n-plus-one`](../.agents/skills/nestjs-best-practices/rules/db-avoid-n-plus-one.md).
- **Seed** the default pipeline stages and the five assessments with `prisma db seed`. See the [db seed reference](../.agents/skills/prisma-cli/references/db-seed.md).

## Open decisions

- Hosting: Prisma Postgres (its skill is installed), another managed Postgres, or self-hosted.
- Retention: how long candidate personal data and answers are kept, and how they're deleted on request.
- Local development database: Docker or a hosted dev database.

## References

- [configuration.md](configuration.md) (`DATABASE_URL`)
- [testing.md](testing.md) (test database)
