# Routing

**Status:** In progress · **Last updated:** 2026-09-21

## Scope

The route map, layouts and route groups, and which routes are for staff and which for candidates. Who can open which route is in [authentication.md](authentication.md), and where a page's components go is in [project-structure.md](project-structure.md).

## Current state

Three route groups, each with its own layout:

| Route | Group | Page | Notes |
| --- | --- | --- | --- |
| `/` | `(app)` | Dashboard | [app/(app)/page.tsx](<../app/(app)/page.tsx>). Signed-in staff only. Shows real data from `GET /api/dashboard`; see [dashboard.md](dashboard.md). |
| `/login` | `(auth)` | Sign in | See [authentication.md](authentication.md). |
| `/forgot-password` | `(auth)` | Ask for a reset link | |
| `/reset-password?token=…` | `(auth)` | Choose a new password | Linked from the reset email. Without a token it shows the "This reset link doesn't work" state. |
| `/accept-invite?token=…` | `(auth)` | Set up an invited account | Linked from the invitation email. Without a token it shows the "This invitation link doesn't work" state. |
| `/assessments` | `(app)` | Test library and sent tests | Library and Sent tabs; `?tab=sent` opens Sent. See [assessments.md](assessments.md). |
| `/assessments/[id]` | `(app)` | Test editor | Questions, Role profile (alignment tests), Scoring and Settings tabs |
| `/assessments/invitations/[id]` | `(app)` | Results of one send | |
| `/preview/[assessmentId]` | `(candidate)` | Staff preview of a test | Signed-in staff only, opened in a new tab. Nothing is saved. |
| `/take/[token]` | `(candidate)` | A candidate's tests | Public: the token in the path is the access. Linked from the candidate's email. |

- **`(app)`** ([layout](<../app/(app)/layout.tsx>)) is the staff app shell: sidebar, topbar and page. It reads the `sidebar_state` cookie, so its pages render on each request.
- **`(auth)`** ([layout](<../app/(auth)/layout.tsx>)) is the TMX Assessment logo above one centered card.
- **`(candidate)`** ([layout](<../app/(candidate)/layout.tsx>)) has no staff shell: each page draws its own header, since the test runner needs the whole screen. Its pages are titled "Your assessment · <the company name>" (`NEXT_PUBLIC_COMPANY_NAME`, see [configuration.md](configuration.md)) and send no referrer (`referrer: "no-referrer"`), so the token in a candidate's address never reaches another site. `/take/[token]` has its own error page.
- **Navigation** comes from [components/shared/nav-items.ts](../components/shared/nav-items.ts). Assessments is a link. Candidates, Jobs and Settings are listed as "Soon" and aren't links yet, so nothing in the app leads to a 404.
- **Staff pages need a session.** [proxy.ts](../proxy.ts) sends signed-out visitors to `/login?next=…`, and the `(app)` layout confirms the session with the API. The four `(auth)` pages are public, and so is everything under `/take/` (`PUBLIC_PREFIXES` in proxy.ts). `/preview/[assessmentId]` sits in the `(candidate)` group for its look but still needs a session: proxy.ts redirects without the cookie, and the page calls `requireUser()`. See [authentication.md](authentication.md).
- **`/api/*` belongs to the backend.** A rewrite in [next.config.ts](../next.config.ts) forwards it, so no page or route handler can live there. See [api-client.md](api-client.md).
- **Metadata:** page titles use the template `%s · TMX Assessment`, and every page is `noindex, nofollow` ([app/layout.tsx](../app/layout.tsx)).

## Requirements

- Staff manage jobs, candidates, stages and results.
- Candidates open a link and take their assigned tests.
- The backend's emails link to `/reset-password?token=…`, `/accept-invite?token=…` and `/take/<token>`, so those paths must stay put (the backend sets them in `src/common/frontend-links.ts`).

## Proposed approach

Draft route map for what's still to build:

| Route | Who | Purpose |
| --- | --- | --- |
| `/candidates` | Staff | Pipeline board and candidate list |
| `/candidates/[id]` | Staff | Profile, stage history, call reports and results |
| `/jobs` | Staff | Job openings |
| `/settings/pipeline` | Staff | Edit stages, statuses and owners |

When one of these ships, remove `soon` from its row in `nav-items.ts`.

## Decisions

"Requested" means the maintainers asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Route groups | `(auth)` for the sign-in pages, `(app)` for the staff shell, `(candidate)` for candidate pages and the staff preview | Each audience gets its own layout. `(app)` is the reference app's name, used instead of the `(staff)` first proposed here. | Build default |
| Home page | The dashboard, at `/` | It's the first thing staff need after signing in | Build default |
| Planned pages in the nav | Listed with a "Soon" badge, not linked | Shows the shape of the app without leading to 404s | Build default |
| Search engines | `noindex, nofollow` on every page | It's an internal tool | Build default |
| Page titles | "Page · TMX Assessment" | The reference app's pattern | Build default |
| Which pages need a session | Every page except `/login`, `/forgot-password`, `/reset-password`, `/accept-invite` and anything under `/take/` | Staff pages hold candidates' personal data, so a new page is protected unless someone adds it to the list | Build default |
| A candidate's address | `/take/<token>`, with the token as the last part of the path | Candidates keep and reopen the link, so it reads as a page address. The backend builds it with `frontendPathLink()`. | Build default |
| Referrer on candidate pages | `no-referrer` | The candidate's token is in the address. | Build default |
| Where the preview lives | `/preview/[assessmentId]` in the `(candidate)` group, opened in a new tab | It looks exactly like the candidate's page, without the staff shell. | Build default |
| The Assessments tab | In the address, as `?tab=sent` | Back and shared links land on the right tab. | Build default |
| `/api/*` | Reserved for the rewrite to the backend | The browser talks to one origin (see [api-client.md](api-client.md)) | Build default |

## Open decisions

- The final route names.
- Whether candidate pages share this app's domain or get their own subdomain.

## References

- Next.js 16 project structure docs: `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`. Next.js 16 has breaking changes, so check these docs before using an API (see [AGENTS.md](../AGENTS.md)).
- [authentication.md](authentication.md)
- [dashboard.md](dashboard.md)
- [project-structure.md](project-structure.md)
- [recruitment-pipeline.md](recruitment-pipeline.md)
- [assessments.md](assessments.md)
