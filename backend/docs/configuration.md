# Configuration

**Status:** In progress · **Last updated:** 2026-09-21

## Scope

Environment variables, how config is loaded and checked, and ports.

## Current state

- **`@nestjs/config` loads `.env`** and checks every variable at startup against [env.validation.ts](../src/config/env.validation.ts). A missing or malformed value stops the app with a message naming the variable.
- **[.env.example](../.env.example) is committed** and lists every variable. The real `.env` is gitignored.
- **In production the container reads `backend/.env` on the server** through `env_file` in [docker-compose-production.yml](../docker-compose-production.yml). The compose file sets `NODE_ENV=production` and `STORAGE_DIR=/app/storage` itself. See [operations.md](operations.md#deployment).
- **Read config through `ConfigService`,** typed with the validated class:

  ```ts
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true });
  }
  ```

  Don't read `process.env` directly. The one exception is [prisma.config.ts](../prisma.config.ts), which the Prisma CLI loads outside Nest.

### Environment variables

| Variable | Required | Default | Purpose | Doc |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `production` or `test`. `production` turns on `Secure` cookies, requires `RESEND_API_KEY` and turns off the API docs. `test` turns off rate limits. | |
| `PORT` | No | `4000` | HTTP port. The startup log prints it. In Docker, the compose files publish this same port on the host. | [operations.md](operations.md#ports-and-health) |
| `FRONTEND_URL` | Yes | | The frontend's origin, such as `http://localhost:3000`. Used for CORS, the Origin check and links in emails. | [api-conventions.md](api-conventions.md) |
| `CORS_ORIGINS` | No | Not set | Extra origins CORS allows, comma-separated, such as a staging frontend. `FRONTEND_URL` is always allowed. | [api-conventions.md](api-conventions.md) |
| `COMPANY_NAME` | No | `TMX HR` | Your company's name, as candidates see it in their assessment emails: the sender line ("Sam from Acme"), the subject and the name above the heading. Staff emails use the app's own name. The frontend has its own `NEXT_PUBLIC_COMPANY_NAME`; set both to the same value. | [email.md](email.md) |
| `DATABASE_URL` | Yes | | Postgres connection string. Locally the Prisma Postgres instance; in production the VPS's Postgres, over `postgres_network`. | [database.md](database.md) |
| `SESSION_TTL_DAYS` | No | `7` | Days without use before a session ends (1 to 30) | [authentication.md](authentication.md) |
| `COOKIE_DOMAIN` | No | Not set | Cookie domain. Set a parent domain only if the frontend is on a sibling subdomain. | [authentication.md](authentication.md) |
| `TRUST_PROXY` | No | `0` | Number of reverse proxies in front of the API. `1` on the VPS, behind its reverse proxy. | [api-conventions.md](api-conventions.md) |
| `RESEND_API_KEY` | In production | Not set | Resend API key. When it's empty, emails are printed to the terminal. | [email.md](email.md) |
| `EMAIL_FROM` | No | `TMX HR <onboarding@resend.dev>` | The sender. Its domain must be verified in Resend. | [email.md](email.md) |
| `STORAGE_DIR` | No | `./storage` | The folder for uploaded files, such as question audio. A relative path starts at the folder the API runs in. Keep it out of `dist/`, which every build empties. The default folder is gitignored. In Docker it's `/app/storage`, a named volume. | [assessments.md](assessments.md#media) |

An empty value (`KEY=`) counts as not set, so the default applies.

To add a variable: add it to `EnvironmentVariables` with its checks, to `.env.example`, and to the table above, in the same PR.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| The backend's default port | `4000` | The Next.js dev server uses 3000, so both apps now run without flags. | Build default |
| The company name candidates see | `COMPANY_NAME`, defaulting to `TMX HR` | It was hardcoded, so a fork would email candidates under someone else's name. The default matches the app's own name and the wordmark, so a fresh install reads coherently. | Requested |
| How config is checked | A class checked with `class-validator` | It's the same library the request DTOs use, so there's no Joi or Zod to learn. | Build default |
| `@nestjs/config` version | 4.x, not 12.x | 12.x ships as ES modules only and is meant for NestJS 12. Jest and the CommonJS build of this NestJS 11 app can't load it. Revisit when we upgrade NestJS. | Build default |
| Where secrets live in production | `backend/.env` on the VPS, gitignored, read by the compose file | The deploy resets the clone and `.env` survives. Nothing secret is in the image or in GitHub. | Build default |
| Where uploaded files live in production | A named Docker volume mounted at `STORAGE_DIR` | See [operations.md](operations.md#the-compose-files). | Build default |

## Open decisions

- The LLM API key, once question generation starts (see [question-generation.md](question-generation.md)).
- Whether uploads should move to a bucket behind the `FileStorage` interface (see [assessments.md](assessments.md#media)), if the VPS's disk ever becomes the constraint.

## References

- [`devops-use-config-module`](../.agents/skills/nestjs-best-practices/rules/devops-use-config-module.md)
- Frontend: [configuration.md](../../frontend/docs/configuration.md)
