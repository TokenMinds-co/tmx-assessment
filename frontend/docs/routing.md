# Routing

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

The route map, layouts and route groups, and which routes are for staff and which for candidates. Who can open which route is in [authentication.md](authentication.md).

## Current state

Two route groups, each with its own layout:

| Route | Group | Page | Notes |
| --- | --- | --- | --- |
| `/` | `(app)` | Dashboard | [app/(app)/page.tsx](<../app/(app)/page.tsx>). Shows sample data; see [dashboard.md](dashboard.md). |
| `/login` | `(auth)` | Sign in | See [authentication.md](authentication.md). |
| `/forgot-password` | `(auth)` | Ask for a reset link | |
| `/reset-password?token=…` | `(auth)` | Choose a new password | Linked from the reset email. Without a token it shows the "This reset link doesn't work" state. |
| `/accept-invite?token=…` | `(auth)` | Set up an invited account | Linked from the invitation email. Without a token it shows the "This invitation link doesn't work" state. |

- **`(app)`** ([layout](<../app/(app)/layout.tsx>)) is the staff app shell: sidebar, topbar and page. It reads the `sidebar_state` cookie, so its pages render on each request.
- **`(auth)`** ([layout](<../app/(auth)/layout.tsx>)) is the TMX HR logo above one centered card.
- **Navigation** comes from [components/layout/nav-items.ts](../components/layout/nav-items.ts). Candidates, Jobs, Assessments and Settings are listed as "Soon" and aren't links yet, so nothing in the app leads to a 404.
- **No route is protected yet.** Every page opens without signing in; see [authentication.md](authentication.md).
- **Metadata:** page titles use the template `%s · TMX HR`, and every page is `noindex, nofollow` ([app/layout.tsx](../app/layout.tsx)).

## Requirements

- Staff manage jobs, candidates, stages and results.
- Candidates open a link and take their assigned tests.
- The backend's emails link to `/reset-password?token=…` and `/accept-invite?token=…`, so those paths must stay put (the backend sets them in `src/auth/frontend-links.ts`).

## Proposed approach

- **Candidate pages** get a third route group, `app/(candidate)/`, with a minimal layout without distractions, for taking tests.
- Draft route map for what's still to build:

| Route | Who | Purpose |
| --- | --- | --- |
| `/candidates` | Staff | Pipeline board and candidate list |
| `/candidates/[id]` | Staff | Profile, stage history, call reports and results |
| `/jobs` | Staff | Job openings |
| `/assessments` | Staff | Test library and review of generated questions |
| `/settings/pipeline` | Staff | Edit stages, statuses and owners |
| `/take/[token]` | Candidate | Take the tests in an invitation |

When one of these ships, remove `soon` from its row in `nav-items.ts`.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Route groups | `(auth)` for the sign-in pages, `(app)` for the staff shell | Each audience gets its own layout. `(app)` is the reference app's name, used instead of the `(staff)` first proposed here. | Build default |
| Home page | The dashboard, at `/` | It's the first thing staff need after signing in | Build default |
| Planned pages in the nav | Listed with a "Soon" badge, not linked | Shows the shape of the app without leading to 404s | Build default |
| Search engines | `noindex, nofollow` on every page | It's an internal tool | Build default |
| Page titles | "Page · TMX HR" | The reference app's pattern | Build default |

## Open decisions

- The final route names.
- Whether candidate pages share this app's domain or get their own subdomain.

## References

- Next.js 16 project structure docs: `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`. Next.js 16 has breaking changes, so check these docs before using an API (see [AGENTS.md](../AGENTS.md)).
- [authentication.md](authentication.md)
- [dashboard.md](dashboard.md)
- [recruitment-pipeline.md](recruitment-pipeline.md)
- [assessments.md](assessments.md)
