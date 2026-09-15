# TMX HR: Frontend

Web app for TMX HR, built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and shadcn/ui. For what the product does and why, see the [root README](../README.md).

> **Status: UI only.** The TMX design system, the app shell, the staff sign-in screens and the dashboard are built, but nothing talks to the backend yet. The forms don't sign anyone in, and the dashboard shows labelled sample data.

## Stack

- Next.js 16.3 (App Router), React 19.2, TypeScript 5
- Tailwind CSS 4, configured in [`app/globals.css`](app/globals.css). There's no `tailwind.config.*` file.
- shadcn/ui (style `radix-vega`, Radix primitives) with lucide icons, themed to TMX. See [design-system.md](docs/design-system.md).
- Inter and Geist Mono, loaded with `next/font`
- ESLint 9 with `eslint-config-next`
- pnpm 11
- **Planned, not installed:** TanStack Query ([data-fetching.md](docs/data-fetching.md))

## Requirements

- Node.js 20.9 or newer (Next.js 16 requires `>= 20.9.0`)
- pnpm 11 (pinned in `packageManager` in `package.json`)

## Getting started

```bash
pnpm install
pnpm dev
```

The app runs at http://localhost:3000. The backend also defaults to port 3000, so start it on a different `PORT` (see [configuration.md](docs/configuration.md)).

Pages to look at:

| URL | Page |
| --- | --- |
| http://localhost:3000/login | Sign in |
| http://localhost:3000/forgot-password | Ask for a reset link |
| http://localhost:3000/reset-password?token=preview | Choose a new password (any token shows the form) |
| http://localhost:3000/accept-invite?token=preview | Set up an invited account (any token shows the form) |
| http://localhost:3000/ | Dashboard |

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
│   ├── layout.tsx          # Root layout: fonts, metadata, tooltip provider
│   ├── globals.css         # Tailwind and the TMX theme tokens
│   ├── icon.png            # Favicon (the TMX mark)
│   ├── (auth)/             # Sign-in pages: login, forgot-password, reset-password
│   └── (app)/              # Staff app shell and its pages (dashboard at /)
├── components/
│   ├── ui/                 # shadcn/ui components, customized to TMX
│   ├── brand/              # TMX HR logo
│   ├── layout/             # Sidebar, topbar, account menu, page header, nav items
│   ├── auth/               # Sign-in card and forms
│   └── dashboard/          # Dashboard cards and their data types
├── hooks/                  # Shared hooks (from shadcn)
├── lib/                    # cn(), formatting helpers, sample data
├── public/brand/           # TMX wordmark and mark
├── docs/                   # Area docs and CHANGELOG.md
├── components.json         # shadcn/ui settings
├── PRODUCT.md              # Product context for the impeccable design skill
├── AGENTS.md               # Instructions for coding agents
├── CLAUDE.md               # Claude Code additions to AGENTS.md
└── .agents/skills/         # Agent skills (see AGENTS.md)
```

## Docs

| Area | Doc | Status |
| --- | --- | --- |
| Routing | [routing.md](docs/routing.md) | In progress |
| Authentication | [authentication.md](docs/authentication.md) | In progress (screens only) |
| Configuration | [configuration.md](docs/configuration.md) | In progress |
| API client | [api-client.md](docs/api-client.md) | Not started |
| Data fetching | [data-fetching.md](docs/data-fetching.md) | Not started |
| Query keys | [query-keys.md](docs/query-keys.md) | Not started |
| Design system | [design-system.md](docs/design-system.md) | In progress |
| Dashboard | [dashboard.md](docs/dashboard.md) | In progress (sample data) |
| Recruitment pipeline | [recruitment-pipeline.md](docs/recruitment-pipeline.md) | Not started |
| Assessments | [assessments.md](docs/assessments.md) | Not started |

Changes are logged in [CHANGELOG.md](docs/CHANGELOG.md). To add or update a doc, follow the [doc rules in the root README](../README.md#documentation).

## Working with coding agents

[AGENTS.md](AGENTS.md) tells coding agents which skills in `.agents/skills/` to load for each kind of task, and how to settle conflicts between them. Product context for design work is in [PRODUCT.md](PRODUCT.md). Next.js 16 has breaking changes from older versions, so check `node_modules/next/dist/docs/` before using a Next.js API.
