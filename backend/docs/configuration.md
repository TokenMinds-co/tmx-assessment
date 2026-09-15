# Configuration

**Status:** Scaffold only · **Last updated:** 2026-09-15

## Scope

Environment variables, how config is loaded and checked, and ports.

## Current state

- [main.ts](../src/main.ts) reads `PORT` straight from `process.env` and falls back to 3000.
- `@nestjs/config` isn't installed, and there's no `.env` or `.env.example` file. `.gitignore` already keeps real `.env` files out of git.

### Environment variables

| Variable | Required | Default | Used in | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | `3000` | `src/main.ts` | HTTP port |

### Known issue: port clash

The Next.js dev server also uses port 3000. Until the backend gets a different default, start it on another port, for example `PORT=4000 pnpm start:dev`.

## Proposed approach

- **Add `@nestjs/config`,** read values through `ConfigService`, and validate them at startup so a missing variable fails fast. See [`devops-use-config-module`](../.agents/skills/nestjs-best-practices/rules/devops-use-config-module.md).
- **Commit a `.env.example`** that lists every variable, with no real secrets.
- **Add each new variable** to the table above in the same PR.

Variables expected once features land:

| Variable | For | Doc |
| --- | --- | --- |
| `DATABASE_URL` | Prisma connection | [database.md](database.md) |
| Auth secret(s) | Signing tokens and candidate links | [authentication.md](authentication.md) |
| LLM API key | Question generation | [question-generation.md](question-generation.md) |
| Frontend origin | CORS | [api-conventions.md](api-conventions.md) |

## Open decisions

- The backend's default port.
- Where secrets are stored in deployed environments. This depends on the hosting target, which isn't chosen yet.

## References

- Frontend: [configuration.md](../../frontend/docs/configuration.md)
