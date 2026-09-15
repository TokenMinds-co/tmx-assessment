# Recruitment pipeline

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

Staff screens for jobs, candidates and stages: the pipeline board and list, the candidate profile, moving candidates between stages, call reports, and stage settings. The data model and API are in the backend's [recruitment-pipeline.md](../../backend/docs/recruitment-pipeline.md).

## Current state

Not started. The dashboard already previews candidates per stage and per open role with sample data; see [dashboard.md](dashboard.md). Its stages, owners and roles are passed in as data, as the requirements below ask.

## Requirements

- Staff can add, rename and reorder stages and status categories, and change who owns each stage.
- Candidate details include location, notice period and salary expectations.
- Call reports from screening calls are stored on the candidate.

## Proposed approach

- **Pipeline board** with a column per stage, plus a table view for filtering by job, stage and owner.
- **Candidate profile** with details, current stage and owner, stage history, call reports, assessment results, and a "Send assessment" action.
- **Pipeline settings** screen for stages, statuses and owners.
- **Stages come from API data.** Never hardcode stage or status names in components, because the list changes.

## Open decisions

- The default view: board or table.
- Whether stages can be changed by drag and drop.
- Whether this replaces the monday.com board from day one, or runs alongside it for a while.

## References

- [routing.md](routing.md)
- [dashboard.md](dashboard.md)
- [query-keys.md](query-keys.md)
- [assessments.md](assessments.md)
- Backend: [recruitment-pipeline.md](../../backend/docs/recruitment-pipeline.md)
