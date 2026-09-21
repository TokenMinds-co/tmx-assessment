# Recruitment pipeline

**Status:** Not started · **Last updated:** 2026-09-21

## Scope

Staff screens for jobs, candidates and stages: the pipeline board and list, the candidate profile, moving candidates between stages, call reports, and stage settings. The data model and API are in the backend's [recruitment-pipeline.md](../../backend/docs/recruitment-pipeline.md).

## Current state

Not started. The dashboard used to preview candidates per stage and per open role from invented data. That Pipeline card was removed when the dashboard moved to the real API, because there is no Job model and no stage data behind it; see [dashboard.md](dashboard.md). Its code is in git history (`app/(app)/_components/pipeline-card.tsx`), and the decisions it settled are kept below, so a real pipeline card can start from them.

## Requirements

- Staff can add, rename and reorder stages and status categories, and change who owns each stage.
- Candidate details include location, notice period and salary expectations.
- Candidates don't apply in this app. They fill in a Notion form, and the backend imports each response.
- Call reports from screening calls are stored on the candidate.

## Proposed approach

- **Pipeline board** with a column per stage, plus a table view for filtering by job, stage and owner.
- **Candidate profile** with details, current stage and owner, stage history, call reports, assessment results, and a "Send assessment" action.
- **Notion responses:** the candidate profile links to the Notion response the candidate came from, and a "Sync now" button pulls in new responses without waiting for the backend's next import.
- **Pipeline settings** screen for stages, statuses and owners.
- **Stages come from API data.** Never hardcode stage or status names in components, because the list changes.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| A page where candidates apply | None. Candidates apply through a Notion form, and the backend imports the responses. Assessments are still taken in this app. | | Requested |
| Stage bar color | One violet for every stage, not a light-to-dark ramp | Stages are configurable, so their number isn't fixed, and a ramp stops being readable past about six steps. Position already shows the order. | Build default (from the dashboard's Pipeline card) |
| Counts per role | A table under the stage cells | Recruiters work role by role, and the table doubles as the text version of the bars | Build default (from the dashboard's Pipeline card) |

## Open decisions

- The default view: board or table.
- Whether stages can be changed by drag and drop.
- Whether this replaces the monday.com board from day one, or runs alongside it for a while.
- Which candidates count as active, for example whether rejected candidates drop out of the counts.
- Whether the dashboard gets a pipeline card back once this module exists, and what it shows.

## References

- [routing.md](routing.md)
- [dashboard.md](dashboard.md)
- [query-keys.md](query-keys.md)
- [assessments.md](assessments.md)
- Backend: [recruitment-pipeline.md](../../backend/docs/recruitment-pipeline.md)
