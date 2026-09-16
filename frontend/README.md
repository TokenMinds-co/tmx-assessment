# TMX HR: Frontend

Web app for TMX HR, built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and shadcn/ui. For what the product does and why, see the [root README](../README.md).

> **Status: staff sign-in and assessments work.** Staff sign in and out, reset a forgotten password and accept an invitation, and every staff page needs a live session. Staff build tests, send them to candidates and read the results, and candidates take their tests from the emailed link. The dashboard still shows labelled sample data.

## Stack

- Next.js 16.3 (App Router), React 19.2, TypeScript 5
- Tailwind CSS 4, configured in [`app/globals.css`](app/globals.css). There's no `tailwind.config.*` file.
- shadcn/ui (style `radix-vega`, Radix primitives) with lucide icons, themed to TMX. See [design-system.md](docs/design-system.md).
- Inter and Geist Mono, loaded with `next/font`
- ESLint 9 with `eslint-config-next`
- pnpm 11
- TanStack Query 5 for data in the browser ([data-fetching.md](docs/data-fetching.md)), `motion` for animation and sonner for toasts

## Requirements

- Node.js 20.9 or newer (Next.js 16 requires `>= 20.9.0`)
- pnpm 11 (pinned in `packageManager` in `package.json`)
- The backend, running (see its [README](../backend/README.md))

## Getting started

```bash
pnpm install
cp .env.example .env   # API_URL: where the backend runs
pnpm dev
```

The app runs at http://localhost:3000. It forwards `/api/*` to the backend at `API_URL`, which defaults to http://localhost:4000, the backend's default port. If your backend runs on another port, set `API_URL` in `.env` and restart `pnpm dev`. Every variable is described in [configuration.md](docs/configuration.md).

To create the first account, see [Create the first admin](../backend/README.md#create-the-first-admin) in the backend README.

Pages to look at:

| URL | Page |
| --- | --- |
| http://localhost:3000/login | Sign in |
| http://localhost:3000/forgot-password | Ask for a reset link |
| http://localhost:3000/reset-password?token=preview | Choose a new password. Any token shows the form; the API checks it when you submit. |
| http://localhost:3000/accept-invite?token=preview | Set up an invited account. Any token shows the form; the API checks it when you submit. |
| http://localhost:3000/ | Dashboard, for signed-in staff |
| http://localhost:3000/assessments | Test library and sent tests, for signed-in staff. Run `pnpm db:seed` in the backend to load the prefilled tests. |
| `/take/<token>` | A candidate's tests. Send a test to yourself to get a link; while the backend's `RESEND_API_KEY` is empty, the email is printed in its terminal. |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Build for production. Needs `API_URL`. |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |

## Project structure

```text
frontend/
├── app/
│   ├── layout.tsx          # Root layout: fonts, metadata, tooltip provider
│   ├── providers.tsx       # TanStack Query client, toasts, devtools
│   ├── globals.css         # Tailwind and the TMX theme tokens
│   ├── icon.png            # Favicon (the TMX mark)
│   ├── (auth)/             # Sign-in pages: login, forgot-password, reset-password, accept-invite
│   ├── (app)/              # Staff app shell and its pages (dashboard at /, assessments), for signed-in staff
│   └── (candidate)/        # Candidate pages (/take/[token]) and the staff preview, without the shell
├── components/
│   ├── shared/             # Used by more than one page: app shell, logo, sign-in card, form parts, the test runner, assessment dialogs
│   └── ui/                 # shadcn/ui components, customized to TMX
├── hooks/                  # Shared hooks: use-mobile (from shadcn), countdown, debounced value, online status
├── lib/
│   ├── api/                # The API client: apiFetch() and one file per domain
│   └── …                   # Query keys, session check, sign-in redirect, form validation, formatting, dashboard types, sample data, cn()
├── proxy.ts                # Sends signed-out visitors to /login; /take/ is public
├── public/brand/           # TMX wordmark and mark
├── docs/                   # Area docs and CHANGELOG.md
├── .env.example            # Environment variables; copy it to .env
├── components.json         # shadcn/ui settings
├── PRODUCT.md              # Product context for the impeccable design skill
├── AGENTS.md               # Instructions for coding agents
├── CLAUDE.md               # Claude Code additions to AGENTS.md
└── .agents/skills/         # Agent skills (see AGENTS.md)
```

A component that only one page uses sits in a `_components/` folder next to that page's `page.tsx`, for example `app/(auth)/login/_components/`. The rules are in [AGENTS.md](AGENTS.md#where-components-go) and the reasons in [project-structure.md](docs/project-structure.md).

## Docs

| Area | Doc | Status |
| --- | --- | --- |
| Routing | [routing.md](docs/routing.md) | In progress |
| Project structure | [project-structure.md](docs/project-structure.md) | Done |
| Authentication | [authentication.md](docs/authentication.md) | In progress (staff sign-in and candidate links done) |
| Configuration | [configuration.md](docs/configuration.md) | In progress |
| API client | [api-client.md](docs/api-client.md) | In progress |
| Data fetching | [data-fetching.md](docs/data-fetching.md) | In progress |
| Query keys | [query-keys.md](docs/query-keys.md) | In progress |
| Design system | [design-system.md](docs/design-system.md) | In progress |
| Dashboard | [dashboard.md](docs/dashboard.md) | In progress (sample data) |
| Recruitment pipeline | [recruitment-pipeline.md](docs/recruitment-pipeline.md) | Not started |
| Assessments | [assessments.md](docs/assessments.md) | In progress |

Changes are logged in [CHANGELOG.md](docs/CHANGELOG.md). To add or update a doc, follow the [doc rules in the root README](../README.md#documentation).

## Working with coding agents

[AGENTS.md](AGENTS.md) tells coding agents which skills in `.agents/skills/` to load for each kind of task, and how to settle conflicts between them. Product context for design work is in [PRODUCT.md](PRODUCT.md). Next.js 16 has breaking changes from older versions, so check `node_modules/next/dist/docs/` before using a Next.js API.
