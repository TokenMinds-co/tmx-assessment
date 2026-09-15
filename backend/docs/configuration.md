# Configuration

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

Environment variables, how config is loaded and checked, and ports.

## Current state

- **`@nestjs/config` loads `.env`** and checks every variable at startup against [env.validation.ts](../src/config/env.validation.ts). A missing or malformed value stops the app with a message naming the variable.
- **[.env.example](../.env.example) is committed** and lists every variable. The real `.env` is gitignored.
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
| `NODE_ENV` | No | `development` | `development`, `production` or `test`. `production` turns on `Secure` cookies and requires `RESEND_API_KEY`. `test` turns off rate limits. | |
| `PORT` | No | `4000` | HTTP port | |
| `FRONTEND_URL` | Yes | | The frontend's origin, such as `http://localhost:3000`. Used for CORS, the Origin check and links in emails. | [api-conventions.md](api-conventions.md) |
| `DATABASE_URL` | Yes | | Postgres connection string (Prisma Postgres) | [database.md](database.md) |
| `SESSION_TTL_DAYS` | No | `7` | Days without use before a session ends (1 to 30) | [authentication.md](authentication.md) |
| `COOKIE_DOMAIN` | No | Not set | Cookie domain. Set a parent domain only if the frontend is on a sibling subdomain. | [authentication.md](authentication.md) |
| `TRUST_PROXY` | No | `0` | Number of reverse proxies in front of the API. Usually `1` behind a load balancer. | [api-conventions.md](api-conventions.md) |
| `RESEND_API_KEY` | In production | Not set | Resend API key. When it's empty, emails are printed to the terminal. | [email.md](email.md) |
| `EMAIL_FROM` | No | `TMX HR <onboarding@resend.dev>` | The sender. Its domain must be verified in Resend. | [email.md](email.md) |

An empty value (`KEY=`) counts as not set, so the default applies.

To add a variable: add it to `EnvironmentVariables` with its checks, to `.env.example`, and to the table above, in the same PR.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| The backend's default port | `4000` | The Next.js dev server uses 3000, so both apps now run without flags. | Build default |
| How config is checked | A class checked with `class-validator` | It's the same library the request DTOs use, so there's no Joi or Zod to learn. | Build default |
| `@nestjs/config` version | 4.x, not 12.x | 12.x ships as ES modules only and is meant for NestJS 12. Jest and the CommonJS build of this NestJS 11 app can't load it. Revisit when we upgrade NestJS. | Build default |

## Open decisions

- Where secrets are stored in deployed environments. This depends on the hosting target, which isn't chosen yet.
- The LLM API key, once question generation starts (see [question-generation.md](question-generation.md)).

## References

- [`devops-use-config-module`](../.agents/skills/nestjs-best-practices/rules/devops-use-config-module.md)
- Frontend: [configuration.md](../../frontend/docs/configuration.md)
