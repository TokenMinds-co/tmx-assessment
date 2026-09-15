# Routing

**Status:** Scaffold only · **Last updated:** 2026-09-15

## Scope

The route map, layouts and route groups, and which routes are for staff and which for candidates. Who can open which route is in [authentication.md](authentication.md).

## Current state

- One route: `/`, the `create-next-app` starter page ([app/page.tsx](../app/page.tsx)).
- The root layout ([app/layout.tsx](../app/layout.tsx)) loads the fonts and still has the default metadata ("Create Next App").

## Requirements

- Staff manage jobs, candidates, stages and results.
- Candidates open a link and take their assigned tests.

## Proposed approach

Use two route groups so each audience gets its own layout:

- `app/(staff)/` has the app shell and navigation.
- `app/(candidate)/` has a minimal layout without distractions, for taking tests.

Draft route map:

| Route | Who | Purpose |
| --- | --- | --- |
| `/login` | Staff | Sign in |
| `/candidates` | Staff | Pipeline board and candidate list |
| `/candidates/[id]` | Staff | Profile, stage history, call reports and results |
| `/jobs` | Staff | Job openings |
| `/assessments` | Staff | Test library and review of generated questions |
| `/settings/pipeline` | Staff | Edit stages, statuses and owners |
| `/take/[token]` | Candidate | Take the tests in an invitation |

## Open decisions

- The final route names.
- Whether candidate pages share this app's domain or get their own subdomain.

## References

- Next.js 16 project structure docs: `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`. Next.js 16 has breaking changes, so check these docs before using an API (see [AGENTS.md](../AGENTS.md)).
- [authentication.md](authentication.md)
- [recruitment-pipeline.md](recruitment-pipeline.md)
- [assessments.md](assessments.md)
