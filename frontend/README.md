# TMX HR: Frontend

Web app for TMX HR, built with Next.js 16 (App Router), React 19 and Tailwind CSS 4. For what the product does and why, see the [root README](../README.md).

> **Status: fresh scaffold.** [`app/page.tsx`](app/page.tsx) is still the `create-next-app` starter page. There's no component library, data fetching or auth yet.

## Stack

- Next.js 16.3 (App Router), React 19.2, TypeScript 5
- Tailwind CSS 4, configured in [`app/globals.css`](app/globals.css). There's no `tailwind.config.*` file.
- Geist and Geist Mono, loaded with `next/font`
- ESLint 9 with `eslint-config-next`
- pnpm 11
- **Planned, not installed:** shadcn/ui ([design-system.md](docs/design-system.md)) and TanStack Query ([data-fetching.md](docs/data-fetching.md))

## Requirements

- Node.js 20.9 or newer (Next.js 16 requires `>= 20.9.0`)
- pnpm 11 (pinned in `packageManager` in `package.json`)

## Getting started

```bash
pnpm install
pnpm dev
```

The app runs at http://localhost:3000. The backend also defaults to port 3000, so start it on a different `PORT` (see [configuration.md](docs/configuration.md)).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Build for production |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |

## Project structure

```text
frontend/
├── app/
│   ├── layout.tsx      # Root layout: fonts, metadata (still the defaults)
│   ├── page.tsx        # Starter page
│   └── globals.css     # Tailwind import and theme tokens
├── public/             # Static files (starter SVGs)
├── docs/               # Area docs and CHANGELOG.md
├── AGENTS.md           # Instructions for coding agents
├── CLAUDE.md           # Claude Code additions to AGENTS.md
└── .agents/skills/     # Agent skills (see AGENTS.md)
```

## Docs

| Area | Doc | Status |
| --- | --- | --- |
| Routing | [routing.md](docs/routing.md) | Scaffold only |
| Authentication | [authentication.md](docs/authentication.md) | Not started |
| Configuration | [configuration.md](docs/configuration.md) | Scaffold only |
| API client | [api-client.md](docs/api-client.md) | Not started |
| Data fetching | [data-fetching.md](docs/data-fetching.md) | Not started |
| Query keys | [query-keys.md](docs/query-keys.md) | Not started |
| Design system | [design-system.md](docs/design-system.md) | Scaffold only |
| Recruitment pipeline | [recruitment-pipeline.md](docs/recruitment-pipeline.md) | Not started |
| Assessments | [assessments.md](docs/assessments.md) | Not started |

Changes are logged in [CHANGELOG.md](docs/CHANGELOG.md). To add or update a doc, follow the [doc rules in the root README](../README.md#documentation).

## Working with coding agents

[AGENTS.md](AGENTS.md) tells coding agents which skills in `.agents/skills/` to load for each kind of task, and how to settle conflicts between them. Next.js 16 has breaking changes from older versions, so check `node_modules/next/dist/docs/` before using a Next.js API.
