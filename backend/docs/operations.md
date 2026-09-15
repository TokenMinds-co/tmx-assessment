# Operations

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

How the API runs in an environment: the startup log, health checks, shutdown and logs. Environment variables are in [configuration.md](configuration.md), and applying migrations on deploy is in [database.md](database.md).

## Current state

- **Startup log:** [main.ts](../src/main.ts) prints the port, the environment, the URLs for the API, the health check and the docs, and the CORS origins.
- **Health checks:** [src/health/](../src/health/), built with `@nestjs/terminus`. `/api/health/live` and `/api/health/ready`.
- **Shutdown:** shutdown hooks are on, so on `SIGTERM` Nest stops the HTTP server and Prisma closes its connections.
- **Logs:** Nest's built-in logger, plain text on stdout.
- **Not chosen yet:** hosting, so there's no deployment config.

## Requirements

- Log the port the API runs on at startup.
- A health check endpoint.

## How it works

### Startup log

```text
LOG [Bootstrap] TMX HR API is running on port 4000 (development)
LOG [Bootstrap] API:    http://localhost:4000/api
LOG [Bootstrap] Health: http://localhost:4000/api/health/ready
LOG [Bootstrap] Docs:   http://localhost:4000/api/docs
LOG [Bootstrap] CORS:   http://localhost:3000
```

In production the docs line says `off`. The URLs use `localhost`; in a deployed environment the host is whatever the platform assigns.

### Health checks

| Path | Checks | Use it for |
| --- | --- | --- |
| `GET /api/health/live` | The process answers, and its V8 heap is under 512 MiB | Liveness: restart the process when this fails |
| `GET /api/health/ready` | The database answers a `SELECT 1` within 2 seconds | Readiness, load balancer health checks and uptime monitors |

- **Both are public,** not rate-limited, and sent with `Cache-Control: no-cache`.
- **Healthy is `200`** and unhealthy is `503`, with Terminus's standard body:

  ```json
  { "status": "ok", "info": { "database": { "status": "up" } }, "error": {}, "details": { "database": { "status": "up" } } }
  ```

- **Liveness doesn't check the database,** so a database outage doesn't make the platform restart a healthy API. Readiness takes it out of rotation instead.

To check another dependency later (a queue, the LLM provider), add a Terminus indicator to `ready()` in [health.controller.ts](../src/health/health.controller.ts).

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Startup log | The port and environment, plus the API, health and docs URLs and the CORS origins | You asked for the port. The URLs and origins show at a glance whether `.env` is right. | Requested |
| Health check library | `@nestjs/terminus` 11 | The standard response shape, and what the [`micro-use-health-checks`](../.agents/skills/nestjs-best-practices/rules/micro-use-health-checks.md) rule recommends. The 12.x releases are for NestJS 12. | Requested |
| Probes | Separate liveness and readiness | A database outage shouldn't restart the API. | Build default |
| Heap limit for liveness | 512 MiB | Catches a leak without restarting a healthy process. Tune it once hosting is chosen. | Build default |

## Open decisions

- Hosting, and which probe paths it's configured with.
- Structured JSON logs, for whatever log service the hosting uses. See [`devops-use-logging`](../.agents/skills/nestjs-best-practices/rules/devops-use-logging.md).
- Whether readiness should turn unhealthy as soon as shutdown starts, so the load balancer drains traffic first. See [`devops-graceful-shutdown`](../.agents/skills/nestjs-best-practices/rules/devops-graceful-shutdown.md).
- Error tracking, such as Sentry.

## References

- [configuration.md](configuration.md), [database.md](database.md), [api-conventions.md](api-conventions.md)
- Rules: [`micro-use-health-checks`](../.agents/skills/nestjs-best-practices/rules/micro-use-health-checks.md), [`devops-graceful-shutdown`](../.agents/skills/nestjs-best-practices/rules/devops-graceful-shutdown.md), [`devops-use-logging`](../.agents/skills/nestjs-best-practices/rules/devops-use-logging.md)
- [NestJS: Health checks (Terminus)](https://docs.nestjs.com/recipes/terminus)
