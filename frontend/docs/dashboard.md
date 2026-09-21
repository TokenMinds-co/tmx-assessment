# Dashboard

**Status:** In progress · **Last updated:** 2026-09-21

## Scope

The staff home page at `/`: what someone running the pipeline sees first. The pipeline and assessment screens themselves are covered in [recruitment-pipeline.md](recruitment-pipeline.md) and [assessments.md](assessments.md).

## Current state

- **The page** is [app/(app)/page.tsx](<../app/(app)/page.tsx>), inside the app shell. It calls `requireUser()`, renders the header on the server and hands the numbers to a client component.
- **[dashboard-view.tsx](<../app/(app)/_components/dashboard-view.tsx>)** loads everything in one query and owns the loading, error and empty states.
- **Two cards** in [app/(app)/_components/](<../app/(app)/_components/>), the page's own components: Assessments and Recent results.
- **Real data.** `GET /api/dashboard` through [lib/api/dashboard.ts](../lib/api/dashboard.ts), keyed with `dashboardKeys.summary()` ([query-keys.md](query-keys.md)). Nothing is invented any more.
- **No Pipeline card.** It showed candidates per stage and per open role from sample data. There is no Job model and no stage data yet, so it was removed; see [recruitment-pipeline.md](recruitment-pipeline.md), and the code in git history.

## Requirements

Agreed with the user on 2026-09-15:

- The main users are **HR and recruiters**, who run the pipeline day to day. Hiring managers drop in to review.
- At a glance, the dashboard shows the **pipeline by stage** and **assessment progress**, with recent scores. The pipeline half waits for the pipeline module.
- No functionality yet: layout and design only.

## How it works

- **One query for the whole page.** [dashboard-view.tsx](<../app/(app)/_components/dashboard-view.tsx>) calls `getDashboard()` with `staleTime: 0`, because candidates move these counts on their own and no staff action in this app changes them.
- **Three states before the cards:**
  - **Loading:** skeleton cards in the same grid as the real ones, marked `aria-busy`.
  - **Error:** a destructive `Alert` with the API's message and a "Try again" button, the same pattern as [library-table.tsx](<../app/(app)/assessments/_components/library-table.tsx>).
  - **Empty:** a fresh install has sent nothing, so the page shows an `Empty` with a border, "No tests sent yet" and a button to `/assessments`, instead of bars that all read zero.
- **Assessments card** ([assessment-card.tsx](<../app/(app)/_components/assessment-card.tsx>)): one stacked bar of the links sent to candidates, split into not started, in progress and completed. A legend carries every number, and each segment has a hover tooltip. With nothing sent yet the bar shows a muted track. Links that expired are counted separately below, with a warning icon: the backend counts links, not candidates, and a link that expired with tests unfinished counts as expired whatever the candidate had done. A table lists each test's time limit, completed attempts and average score as a 0–100 meter, hidden while there are no tests.
- **Recent results card** ([recent-results-card.tsx](<../app/(app)/_components/recent-results-card.tsx>)): the latest candidates to finish a test, with how many of their tests are done ("2 tests", or "1 of 3 tests" while some are left), the average score and the date. Each row links to that link's results page. There is no role: the app has no Job model yet.
- **Scores arrive as 0 to 1** and are scaled for display, as everywhere else in the app. A test nobody has completed shows an em dash, not a zero.
- Chart colors and mark rules are in [design-system.md](design-system.md#charts).

The account menu already shows the signed-in user.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Main users | HR and recruiters; hiring managers drop in | | Requested |
| What it shows | The pipeline by stage, and assessment progress with recent scores | | Requested |
| Real data (was: sample data) | The dashboard shows real data, from one endpoint, `GET /api/dashboard` | One call for one screen: the numbers are read together and never mutated from here | Requested |
| The Pipeline card | Removed until the pipeline module exists | There is no Job model and no stage data to draw it from. Its code is in git history. | Requested |
| Where it lives | `/`, the staff home page | | Build default |
| Freshness | `staleTime: 0`, and nothing invalidates the dashboard | Candidates change these numbers server-side at any moment, so no staff mutation in this app could invalidate them. A fresh read on every visit is the cheapest correct answer. | Build default |
| Nothing sent yet | A page-level `Empty` with a button to `/assessments`, instead of the cards | A brand-new install has no data. Zeroed bars read as a broken page; this reads as a next step. | Build default |
| Result rows | Each links to `/assessments/invitations/<id>`, the results page for that link | The row is a summary of one send, and the results page is where the detail already lives | Build default |
| Expired invitations | Counted beside the progress bar, with a warning icon, not as a segment | The bar shows progress. Expiring is a status. | Build default |
| Pass or fail | Not shown | Pass marks aren't decided | Build default |

## Open decisions

- The time window: everything open right now, or the last 30 days. And whether the page needs a date range filter.
- Whether hiring managers get their own view.
- How scores are colored once pass marks exist.
- Where the Assessments card links to once the candidate and job screens exist.
- Whether the page should prefetch on the server once it has more than one query ([data-fetching.md](data-fetching.md)).

## References

- [design-system.md](design-system.md)
- [recruitment-pipeline.md](recruitment-pipeline.md)
- [assessments.md](assessments.md)
- [data-fetching.md](data-fetching.md)
- [query-keys.md](query-keys.md)
- [PRODUCT.md](../PRODUCT.md)
