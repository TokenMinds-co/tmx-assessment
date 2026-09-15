# Changelog: Frontend

Notable changes to the frontend, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**How to add an entry:** add a line under **Unreleased** in the same PR as the change, under Added, Changed, Fixed or Removed. Link the area doc when there is one. When you release, move the Unreleased lines under a new version and date.

## [Unreleased]

### Added

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
- A "Decisions" section in the area docs, recording each decision, why, and whether the team asked for it.
- Dashboard at `/` with the pipeline by stage and assessment progress, showing labelled sample data. See [dashboard.md](dashboard.md).
- `PRODUCT.md`, the product context for the `impeccable` design skill.
- `NEXT_PUBLIC_APP_VERSION`, set in `next.config.ts` from `package.json`. See [configuration.md](configuration.md).
- Project docs: [README](../README.md) and area docs for [routing](routing.md), [authentication](authentication.md), [configuration](configuration.md), [API client](api-client.md), [data fetching](data-fetching.md), [query keys](query-keys.md), [design system](design-system.md), [dashboard](dashboard.md), [recruitment pipeline](recruitment-pipeline.md) and [assessments](assessments.md).

### Changed

- The account menu shows the signed-in user, and "Sign out" ends the session.
- The reset and invitation pages show their "doesn't work" card when the API turns a link down, not only when the token is missing.
- Components are placed by where they're used: a page's own components in a `_components/` folder next to it, components used by more than one page in `components/shared/`, and shadcn/ui in `components/ui/`. This replaces `components/auth/`, `brand/`, `layout/` and `dashboard/`. The form validation moved to `lib/validation.ts` and the dashboard types to `lib/dashboard-types.ts`. See [project-structure.md](project-structure.md).
- The UI font is Inter instead of Geist. Geist Mono stays for code.
- ESLint skips `.agents/`, the vendored agent skill scripts.

### Removed

- `SAMPLE_USER` from `lib/sample-data.ts`: the account menu shows the real user.
- The `create-next-app` starter page, its SVGs and `favicon.ico`.

## [0.1.0] - 2026-09-15

### Added

- Next.js 16.3 scaffold from `create-next-app`, with React 19.2, Tailwind CSS 4 and the Geist fonts.
- Agent instructions in `AGENTS.md` and `CLAUDE.md`.
- Agent skills: `impeccable`, `design-taste-frontend`, `shadcn`, `tailwind-design-system`, `vercel-react-best-practices`, `vercel-composition-patterns`, `tanstack-query-best-practices` and `seo-aeo-best-practices`.
