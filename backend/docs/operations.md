# Operations

**Status:** In progress · **Last updated:** 2026-09-16

## Scope

How the API runs in an environment: the startup log, health checks, shutdown, logs, and how it's built into a Docker image and deployed. Environment variables are in [configuration.md](configuration.md), and creating the production database is in [database.md](database.md).

## Current state

- **Startup log:** [main.ts](../src/main.ts) prints the port, the environment, the URLs for the API, the health check and the docs, and the CORS origins.
- **Health checks:** [src/health/](../src/health/), built with `@nestjs/terminus`. `/api/health/live` and `/api/health/ready`.
- **Shutdown:** shutdown hooks are on, so on `SIGTERM` Nest stops the HTTP server and Prisma closes its connections.
- **Logs:** Nest's built-in logger, plain text on stdout.
- **Deployment:** the API ships as a Docker image, built by [.github/workflows/backend.yml](../../.github/workflows/backend.yml) on every push to `main`, pushed to GitHub Container Registry (GHCR) and started on the TokenMinds VPS with [docker-compose-production.yml](../docker-compose-production.yml). Pull requests get a build, lint and unit-test check. See [Deployment](#deployment).

## Requirements

- Log the port the API runs on at startup.
- A health check endpoint.
- The backend deploys with the same pipeline as mmaon-polymarket: a GitHub Actions workflow that builds a Docker image and deploys it to the VPS over SSH. The frontend is hosted on Vercel.
- In production the API uses the Postgres already on the VPS, over its `postgres_network`.

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

### Deployment

The frontend deploys itself through Vercel from its own folder. The backend is a Docker image: [.github/workflows/backend.yml](../../.github/workflows/backend.yml) builds it, pushes it to GHCR and starts it on the TokenMinds VPS over SSH. The workflow only runs when `backend/**` or the workflow itself changes, so a frontend-only or docs-only push never redeploys the API.

| Trigger | What runs |
| --- | --- |
| A PR to `main` that touches the backend | Install, `nest build`, ESLint (without `--fix`, so a fixable problem still fails), the unit tests, and a Docker build that isn't pushed |
| A push to `main` that touches the backend | Build the image, push it to GHCR, deploy it over SSH, verify it answers |
| **Run workflow** in the Actions tab | The same as a push, without a commit |

#### The image

[Dockerfile](../Dockerfile) builds from the `backend/` folder (`docker build -t tmx-hr-backend .`) in two stages. The builder installs everything and runs `nest build`. The production stage installs runtime dependencies only (`--prod`), copies `dist/` and `seed/` across, and runs as the `node` user. Its start command applies pending migrations, then starts the API:

```sh
node_modules/.bin/prisma migrate deploy && exec node dist/main
```

- **A container that can't migrate never serves.** `exec` makes Nest PID 1, so `docker stop` reaches the shutdown hooks and Prisma disconnects cleanly.
- **`prisma` and `dotenv` are regular dependencies** because of this command: the CLI loads [prisma.config.ts](../prisma.config.ts), which imports `dotenv/config`, and a `--prod` install would leave both out.
- **pnpm is pinned once,** in `packageManager` in [package.json](../package.json). The image's corepack, the workflow's `pnpm/action-setup` and developers all read it.
- **Right for one container.** Two containers starting at once would race on the migration lock. If the API is ever scaled out, move the migration to a one-off job.

Every build pushes two tags: the commit's 7-character SHA, which the deploy pins to, and `production-latest`, a moving pointer for a manual `docker compose up`.

#### The compose files

- **[docker-compose-production.yml](../docker-compose-production.yml)** runs one service, `backend`, from the GHCR image. Postgres is the instance already on the server: the file joins its `postgres_network` and reads `DATABASE_URL` from `.env`. The network is `external: true`, so Compose attaches to it and never creates or removes it, and `docker compose down` here can't take the database with it. Uploads (`STORAGE_DIR`) live on a named volume, `tmx_hr_storage`, which survives redeploys. Only `docker compose down -v` deletes it, and with it every upload.
- **[docker-compose.yml](../docker-compose.yml)** builds the image locally and runs it against its own Postgres 17 on host port 5434, with credentials from `database.env` (copy [database.env.example](../database.env.example)). It's for checking the image before it ships; development uses `pnpm start:dev`.

Both files name the project `tmx-hr`, so `--remove-orphans` never touches another project deployed from a folder that's also called `backend`.

#### Ports and health

- **`PORT` means one thing.** The API listens on `PORT` from `.env` (default 4000), and the compose files publish that same port on the host. The reverse proxy on the server forwards the public hostname to it. Set `TRUST_PROXY=1` there, so rate limits see the client's IP.
- **The container's healthcheck and the deploy's smoke test call `/api/health/ready`** at `127.0.0.1`, not `localhost`, which resolves to `::1` first in the container while the app binds IPv4. Readiness rather than liveness: Docker doesn't restart unhealthy containers, so the status is for reading, and "can it serve" is the useful answer. If a tool that restarts unhealthy containers is ever added, switch the healthcheck to `/api/health/live`.

#### Server setup, once

1. Clone the repo on the VPS. The deploy expects it at `~/tmx-hr`; set the repository variable `VPS_DEPLOY_PATH` if it's elsewhere. Only `backend/docker-compose-production.yml` and `backend/.env` are read from it. The app comes from the image.
2. Confirm the Postgres network is `postgres_network` (`docker network ls`) and find the Postgres container's name on it (`docker network inspect postgres_network`).
3. Create a role and a database for TMX HR on that Postgres. See [database.md](database.md#deployed-environments). `migrate deploy` creates tables, not databases.
4. Create `backend/.env` from [.env.example](../.env.example) with `NODE_ENV=production`, `PORT`, `FRONTEND_URL` set to the Vercel domain, `DATABASE_URL` using the container's name and port 5432 (for example `postgresql://tmx_hr:<password>@postgres_db:5432/tmx_hr`), `TRUST_PROXY=1`, `RESEND_API_KEY` and `EMAIL_FROM`.
5. Add these to the repository's settings on GitHub:

| Kind | Name | Notes |
| --- | --- | --- |
| Secret | `VPS_HOST` | Server hostname or IP |
| Secret | `VPS_USER` | SSH user. It must be in the `docker` group. |
| Secret | `VPS_SSH_KEY` | Private key, the full PEM including the header line |
| Secret | `VPS_PORT` | Optional. Defaults to 22. |
| Variable | `VPS_DEPLOY_PATH` | Optional. Defaults to `tmx-hr`, relative to the SSH user's home. |

`GITHUB_TOKEN` is provided automatically. It pushes to GHCR and the server logs in with it, so no personal access token is involved. To gate deploys behind an approval, give the `deploy` job a `production` environment with a required reviewer.

#### What a deploy does

1. Resets the server's clone to the pushed ref (`-f`, so local edits go; `.env` is gitignored and survives).
2. Pulls the image by its SHA tag and runs `docker compose up -d --remove-orphans`, which recreates only the backend. The external Postgres is never touched.
3. Polls `/api/health/ready` from inside the container until it answers `200`. It answers `503` until the migrations finish and the database is reachable.
4. Checks with `docker inspect` that the running container was created from the image this run pushed. A deploy that silently kept the old container fails here.
5. Deletes older image tags, which `docker image prune` alone never reclaims because every deploy tags a distinct SHA.

If the API never becomes ready, the run fails with the last 100 log lines and nothing is pruned, so the previous image is still on the server. To roll back, run this there with the previous SHA from the Actions log:

```bash
IMAGE_TAG=<previous sha> docker compose -f backend/docker-compose-production.yml up -d
```

The workflow's `concurrency` group runs one deploy at a time and never cancels one in progress.

#### Once it's running

Run these on the server, from the clone:

```bash
# The first admin (the link is emailed, and printed too)
docker compose -f backend/docker-compose-production.yml exec backend node dist/cli/invite-admin --email you@tokenminds.co --name "Your Name"
# The prefilled tests and their audio
docker compose -f backend/docker-compose-production.yml exec backend node dist/cli/seed-assessments
# Logs
docker compose -f backend/docker-compose-production.yml logs -f backend
```

#### Checking the image locally

```bash
cd backend
cp database.env.example database.env
docker compose up --build            # reads .env; keep NODE_ENV=development for a sign-in check
curl localhost:4000/api/health/ready # 4000 = PORT in .env
```

With `NODE_ENV=production` the API requires `RESEND_API_KEY` and sets `Secure` cookies, which a browser on plain `http://localhost` won't send back.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Startup log | The port and environment, plus the API, health and docs URLs and the CORS origins | You asked for the port. The URLs and origins show at a glance whether `.env` is right. | Requested |
| Health check library | `@nestjs/terminus` 11 | The standard response shape, and what the [`micro-use-health-checks`](../.agents/skills/nestjs-best-practices/rules/micro-use-health-checks.md) rule recommends. The 12.x releases are for NestJS 12. | Requested |
| Probes | Separate liveness and readiness | A database outage shouldn't restart the API. | Build default |
| Heap limit for liveness | 512 MiB | Catches a leak without restarting a healthy process. The container's memory limit is 512 MiB too; raise both together. | Build default |
| Hosting | A Docker image on GHCR, run with Docker Compose on the TokenMinds VPS, deployed by GitHub Actions over SSH | The pipeline mmaon-polymarket already runs, so there's one way to deploy. The frontend stays on Vercel. | Requested |
| Production database | The Postgres already on the VPS, joined over `postgres_network` | One database server for the team's apps. The network is external to this stack, so a `docker compose down` here can't take it down. | Requested |
| Uploaded files in production | A named Docker volume, `tmx_hr_storage`, mounted at `STORAGE_DIR` | Survives redeploys with nothing else to set up. A bucket behind `FileStorage` stays possible later. | Build default |
| Ports in Docker | `PORT` is both the container's port and the published host port | One number means one thing, and nothing in the app has to force a port in production. | Build default |
| Container healthcheck | `/api/health/ready` | Docker doesn't restart unhealthy containers, so the status is for reading, and "can it serve" is the useful answer. | Build default |
| Verifying a deploy | Compare the running container's image to the tag the run pushed, with `docker inspect` | Catches a deploy that kept the old container, without adding a version field to the health body. | Build default |
| Secrets in production | `backend/.env` on the server, gitignored | The deploy resets the clone and `.env` survives. Nothing secret is in the image or on GitHub. | Build default |
| `prisma` and `dotenv` as runtime dependencies | Moved from `devDependencies` | The image runs `prisma migrate deploy` after a `--prod` install, and the CLI's config imports `dotenv/config`. | Build default |
| Node.js in the image | `node:24-alpine`, with pnpm pinned by `packageManager` | Node 24 is the current LTS and what development uses. Corepack, CI and the image read one pin. | Build default |
| Container user | `node`, not root | Standard hardening. The only folder it writes is the uploads volume. | Build default |
| What CI runs on a PR | Build, lint, unit tests and a Docker build, no e2e tests | Needs no database, and catches a Dockerfile that no longer builds before it reaches `main`. See [testing.md](testing.md). | Build default |

## Open decisions

- The API's public hostname, and the reverse-proxy rule on the VPS that forwards it to `PORT`.
- Gating deploys behind an approval, with a `production` environment and a required reviewer.
- A rollback job, instead of the manual `docker compose up` above.
- Structured JSON logs, for whatever log service the hosting uses. See [`devops-use-logging`](../.agents/skills/nestjs-best-practices/rules/devops-use-logging.md).
- Whether readiness should turn unhealthy as soon as shutdown starts, so the load balancer drains traffic first. See [`devops-graceful-shutdown`](../.agents/skills/nestjs-best-practices/rules/devops-graceful-shutdown.md).
- Error tracking, such as Sentry.

## References

- [configuration.md](configuration.md), [database.md](database.md), [api-conventions.md](api-conventions.md), [testing.md](testing.md)
- [Dockerfile](../Dockerfile), [docker-compose-production.yml](../docker-compose-production.yml), [docker-compose.yml](../docker-compose.yml), [.github/workflows/backend.yml](../../.github/workflows/backend.yml)
- The reference pipeline: mmaon-polymarket's `.github/workflows/backend.yml` and `docs/deployment.md`
- Rules: [`micro-use-health-checks`](../.agents/skills/nestjs-best-practices/rules/micro-use-health-checks.md), [`devops-graceful-shutdown`](../.agents/skills/nestjs-best-practices/rules/devops-graceful-shutdown.md), [`devops-use-logging`](../.agents/skills/nestjs-best-practices/rules/devops-use-logging.md)
- [NestJS: Health checks (Terminus)](https://docs.nestjs.com/recipes/terminus)
