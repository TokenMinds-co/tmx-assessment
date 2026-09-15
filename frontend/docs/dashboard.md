# Dashboard

**Status:** In progress (sample data) · **Last updated:** 2026-09-15

## Scope

The staff home page at `/`: what someone running the pipeline sees first. The pipeline and assessment screens themselves are covered in [recruitment-pipeline.md](recruitment-pipeline.md) and [assessments.md](assessments.md).

## Current state

- **The page** is [app/(app)/page.tsx](<../app/(app)/page.tsx>), inside the app shell.
- **Three cards** in [app/(app)/_components/](<../app/(app)/_components/>), the page's own components: Pipeline, Assessments and Recent results.
- **Sample data only.** The numbers come from [lib/sample-data.ts](../lib/sample-data.ts), and the page header shows a "Sample data" badge. Nothing calls the API.

## Requirements

Agreed with the user on 2026-09-15:

- The main users are **HR and recruiters**, who run the pipeline day to day. Hiring managers drop in to review.
- At a glance, the dashboard shows the **pipeline by stage** and **assessment progress**, with recent scores.
- No functionality yet: layout and design only.

## How it works

- **Pipeline card** ([pipeline-card.tsx](<../app/(app)/_components/pipeline-card.tsx>)): one cell per stage, in pipeline order, showing the candidate count, its share of the pipeline, a bar and the stage owner. All bars share one scale (the largest stage), so their lengths compare across cells. Below the cells, a table breaks the same counts down by open role, which also serves as the text version of the bars. When there are more stages than fit, the row of cells scrolls sideways.
- **Assessments card** ([assessment-card.tsx](<../app/(app)/_components/assessment-card.tsx>)): one stacked bar of the candidates who were sent tests, split into not started, in progress and completed. A legend carries every number, and each segment has a hover tooltip. Invitations that expired are counted separately, with a warning icon. A table lists each test's time limit, completed attempts and average score as a 0–100 meter.
- **Recent results card** ([recent-results-card.tsx](<../app/(app)/_components/recent-results-card.tsx>)): the latest candidates to finish their tests, with their role, number of tests, average score and date.
- **Stages, owners and roles are data.** The cards render whatever arrays they get, in the shapes defined in [lib/dashboard-types.ts](../lib/dashboard-types.ts). No component hardcodes a stage or status name.
- Chart colors and mark rules are in [design-system.md](design-system.md#charts).

### Replacing the sample data

1. Add the API queries (see [data-fetching.md](data-fetching.md) and [query-keys.md](query-keys.md)) and map the responses to the types in `lib/dashboard-types.ts`.
2. Pass the real data into the cards from [app/(app)/page.tsx](<../app/(app)/page.tsx>), and remove the "Sample data" badge.
3. Replace `SAMPLE_USER` in the account menu with the signed-in user (see [authentication.md](authentication.md)).
4. Delete [lib/sample-data.ts](../lib/sample-data.ts).
5. Add loading, empty (no open roles, no tests sent) and error states.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Main users | HR and recruiters; hiring managers drop in | | Requested |
| What it shows | The pipeline by stage, and assessment progress with recent scores | | Requested |
| Real data | None yet: invented sample data | No functionality for now | Requested |
| Labelling | A "Sample data" badge in the page header | Nobody should mistake the numbers for real ones | Build default |
| Where it lives | `/`, the staff home page | | Build default |
| Stage bar color | One violet for every stage, not a light-to-dark ramp | Stages are configurable, so their number isn't fixed, and a ramp stops being readable past about six steps. Position already shows the order. | Build default |
| Counts per role | A table under the stage cells | Recruiters work role by role, and the table doubles as the text version of the bars | Build default |
| Expired invitations | Counted beside the progress bar, with a warning icon, not as a segment | The bar shows progress. Expiring is a status. | Build default |
| Pass or fail | Not shown | Pass marks aren't decided | Build default |

## Open decisions

- The time window: everything open right now, or the last 30 days. And whether the page needs a date range filter.
- Which candidates count as active, for example whether rejected candidates drop out of the counts.
- Whether hiring managers get their own view.
- How scores are colored once pass marks exist.
- Where each card links to once the candidate, job and assessment screens exist.

## References

- [design-system.md](design-system.md)
- [recruitment-pipeline.md](recruitment-pipeline.md)
- [assessments.md](assessments.md)
- [data-fetching.md](data-fetching.md)
- [PRODUCT.md](../PRODUCT.md)
