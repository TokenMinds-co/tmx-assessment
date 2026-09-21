# Changelog: Frontend

Notable changes to the frontend, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**How to add an entry:** add a line under **Unreleased** in the same PR as the change, under Added, Changed, Fixed or Removed. Link the area doc when there is one. When you release, move the Unreleased lines under a new version and date.

## [Unreleased]

### Added

- The dashboard at `/` reads real data from `GET /api/dashboard`, in one query, with the three states a real request needs: skeleton cards in the same grid as the real ones while it loads, a destructive `Alert` with the API's message and a "Try again" button when it fails, and an `Empty` with a button to `/assessments` when nothing has been sent yet — a fresh install would otherwise show bars that all read zero, which looks broken rather than new. See [dashboard.md](dashboard.md).
- `lib/api/dashboard.ts` and the `dashboardKeys` factory in `lib/query-keys.ts`, so the dashboard's one query is keyed like every other. It uses `staleTime: 0`: candidates move these counts server-side at any moment, so no staff action in this app could invalidate them, and a fresh read on every visit is the cheapest correct answer. See [api-client.md](api-client.md) and [query-keys.md](query-keys.md).
- Each row in the Recent results card links to `/assessments/invitations/<id>`. The row summarises one send, and that page already holds the detail behind it. See [dashboard.md](dashboard.md).
- Frontend CI: the `frontend` job in `.github/workflows/ci.yml` runs `pnpm lint` and `pnpm build` with `API_URL` set, on every pull request and every push to `main`, so a page that no longer compiles fails before `main` rather than on Vercel.
- The question CSV import dialog opens with the template's example rows in a table, so the columns are clear without downloading the template. See [assessments.md](assessments.md).
- Staff sign-in wired to the backend: sign in, sign out, forgot and reset password, and accepting an invitation. The forms show the API's errors, and every submit button shows a busy state while its request runs. See [authentication.md](authentication.md).
- Protected staff pages: `proxy.ts` sends signed-out visitors to `/login?next=…`, the `(app)` layout confirms the session with `GET /api/auth/me` (`lib/session.ts`), and signing in returns to the page that asked for it. See [authentication.md](authentication.md#protecting-staff-pages).
- The API client in `lib/api/`, and a `/api/*` rewrite to the backend. See [api-client.md](api-client.md).
- `API_URL` and a committed `.env.example`. See [configuration.md](configuration.md).
- shadcn's `Spinner`, and `FormError` and `SubmitButton` in `components/shared/`.
- [project-structure.md](project-structure.md), and a "Where components go" section in `AGENTS.md` with the placement rules.
- TMX design system on shadcn/ui (style `radix-vega`, Radix primitives, lucide icons). The TMX Visibility colors, Inter, type scale, radii, shadows and gradients are mapped onto shadcn's tokens, and Button, Input, Card, Badge, Alert, Dropdown menu, Table and Sidebar are customized to match. See [design-system.md](design-system.md).
- TMX HR logo and favicon, built from the TMX brand artwork.
- App shell: a gradient sidebar that collapses and becomes a sheet on phones, and a topbar with a breadcrumb and an account menu. See [design-system.md](design-system.md#app-shell).
- Staff sign-in screens, UI only: `/login`, `/forgot-password`, `/reset-password` and `/accept-invite`, with the backend's 12 to 128 character password rule. See [authentication.md](authentication.md).
- A "Decisions" section in the area docs, recording each decision, why, and whether the maintainers asked for it.
- Dashboard at `/` with the pipeline by stage and assessment progress, showing labelled sample data. See [dashboard.md](dashboard.md).
- `PRODUCT.md`, the product context for the `impeccable` design skill.
- `NEXT_PUBLIC_APP_VERSION`, set in `next.config.ts` from `package.json`. See [configuration.md](configuration.md).
- Project docs: [README](../README.md) and area docs for [routing](routing.md), [authentication](authentication.md), [configuration](configuration.md), [API client](api-client.md), [data fetching](data-fetching.md), [query keys](query-keys.md), [design system](design-system.md), [dashboard](dashboard.md), [recruitment pipeline](recruitment-pipeline.md) and [assessments](assessments.md).
- Assessment screens: the test library and sent links at `/assessments`, the test editor at `/assessments/[id]`, and the results of one send at `/assessments/invitations/[id]`. See [assessments.md](assessments.md).
- The candidate's test page, `/take/[token]`, and the staff preview, `/preview/[assessmentId]`, in a new `(candidate)` route group without the staff shell. See [routing.md](routing.md).
- The test runner both of them use: one question per screen with Typeform-style motion, answers by keyboard, a countdown on the server's clock, answers saved as the candidate goes, and audio with a replay limit. See [assessments.md](assessments.md#the-candidates-side) and [design-system.md](design-system.md#motion).
- TanStack Query, with its devtools in development, set up in `app/providers.tsx`, and the key factories in `lib/query-keys.ts`. See [data-fetching.md](data-fetching.md) and [query-keys.md](query-keys.md).
- `motion` for animation, sonner for toasts, and `cmdk` for shadcn's `Command`.
- shadcn's Alert dialog, Checkbox, Collapsible, Command, Dialog, Empty, Kbd, Pagination, Popover, Progress, Radio group, Scroll area, Select, Sonner, Switch and Tabs. See [design-system.md](design-system.md).
- API modules for assessments, invitations, candidates, media and the candidate's link, `apiUpload()` for file uploads, and `serverApiFetch()` for server components. See [api-client.md](api-client.md).
- Hooks: `use-countdown`, `use-debounced-value` and `use-online`. Formatting helpers in `lib/format.ts` for percentages, clocks, durations and dates.

### Changed

- The dashboard page calls `requireUser()` itself instead of leaning on the `(app)` layout's check. A page that loads staff data confirms the session before it reads anything, so the rule is the same on every page rather than a property of where it happens to sit. See [authentication.md](authentication.md#protecting-staff-pages).
- The Assessments card counts **links**, not candidates, and says so: the backend counts the links sent out, and a link that expired with tests unfinished counts as expired whatever the candidate had done. A test nobody has completed shows an em dash, not a zero, because no score and a score of zero are different facts. See [dashboard.md](dashboard.md).
- `NEXT_PUBLIC_COMPANY_NAME` sets the company name candidates see — the page titles, the wordmark's alt text and the start page — read through `lib/brand.ts` and defaulting to `TMX HR`. It was hardcoded, so a fork would have greeted candidates under someone else's name. Next.js inlines it at build time, so changing it needs a rebuild, and the wordmark image is a separate file to replace. Keep it the same as the backend's `COMPANY_NAME`. See [configuration.md](configuration.md) and [design-system.md](design-system.md#candidate-pages).
- Example email addresses in the docs are `example.com`, so nothing invites a reader to mail a real inbox.
- The account menu shows the signed-in user, and "Sign out" ends the session.
- The reset and invitation pages show their "doesn't work" card when the API turns a link down, not only when the token is missing.
- Docs: candidates apply through a Notion form, so the app has no application page. See [recruitment-pipeline.md](recruitment-pipeline.md).
- Components are placed by where they're used: a page's own components in a `_components/` folder next to it, components used by more than one page in `components/shared/`, and shadcn/ui in `components/ui/`. This replaces `components/auth/`, `brand/`, `layout/` and `dashboard/`. The form validation moved to `lib/validation.ts` and the dashboard types to `lib/dashboard-types.ts`. See [project-structure.md](project-structure.md).
- The UI font is Inter instead of Geist. Geist Mono stays for code.
- ESLint skips `.agents/`, the vendored agent skill scripts.
- `proxy.ts` lets candidate pages under `/take/` through without a session. See [authentication.md](authentication.md#candidate-links).
- A 401 from any browser-side call sends the user to sign in and back, except on candidate pages. See [authentication.md](authentication.md#a-401-in-the-browser).
- Assessments in the navigation is a link, no longer marked "Soon".
- The Sonner toaster is fixed to the light theme, so it doesn't need `next-themes`.
- Docs: the area docs describe the built assessments: [assessments](assessments.md), [routing](routing.md), [data fetching](data-fetching.md), [query keys](query-keys.md), [API client](api-client.md), [authentication](authentication.md), [design system](design-system.md) and [project structure](project-structure.md).

### Removed

- The Pipeline card from the dashboard. It showed candidates per stage and per open role, and there is no Job model and no stage data to draw it from, so it could only ever have shown invented numbers. Its code is in git history, and the decisions it settled are kept in [recruitment-pipeline.md](recruitment-pipeline.md) so a real one can start from them.
- The "Sample data" badge, along with `lib/sample-data.ts` and `lib/dashboard-types.ts`. Every screen now renders real API data, and the types come from the API modules in `lib/api/`. Nothing invented is left in the app, so nothing needs labelling as invented. See [dashboard.md](dashboard.md).
- `SAMPLE_USER` from `lib/sample-data.ts`: the account menu shows the real user.
- The `create-next-app` starter page, its SVGs and `favicon.ico`.

### Fixed

- The wordmark on candidate pages keeps its proportions. The tests overview, the link-problem message and the test intro put it in a flex column, which stretched it to the column's width. See [design-system.md](design-system.md#candidate-pages).

## [0.1.0] - 2026-09-15

### Added

- Next.js 16.3 scaffold from `create-next-app`, with React 19.2, Tailwind CSS 4 and the Geist fonts.
- Agent instructions in `AGENTS.md` and `CLAUDE.md`.
- Agent skills: `impeccable`, `design-taste-frontend`, `shadcn`, `tailwind-design-system`, `vercel-react-best-practices`, `vercel-composition-patterns`, `tanstack-query-best-practices` and `seo-aeo-best-practices`.
