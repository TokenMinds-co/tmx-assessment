# Recruitment pipeline

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

Jobs, candidates, applications, stages, statuses and stage owners: the data and API that replace today's monday.com board. Assessments have their own doc, [assessments.md](assessments.md).

## Current state

Not started. Today this lives in monday.com, and stages are updated by hand.

## Requirements

- Staff can add, rename, reorder and remove **stages** and **status categories**. They are stored as data, not as enums in code.
- Each stage has an **owner** (a team member), and the owner can change.
- For each candidate, store what the monday.com form collects today: **location, notice period and salary expectations**.
- Store **call reports** from screening calls on the candidate.
- Record every **stage move**: who moved the candidate, when, and from which stage to which.

## Proposed approach

- **Feature modules** for jobs, candidates and the pipeline. See [`arch-feature-modules`](../.agents/skills/nestjs-best-practices/rules/arch-feature-modules.md).
- **Draft entities:** `Job`, `Candidate`, `Application` (a candidate applying to a job, with its current stage and status), `Stage`, `Status`, `StageChange` (the move history), `CallReport` and `StaffMember`.
- **Emit an event on stage change,** such as `application.stage_changed`. Other modules, for example assessments, can react to it without depending on the pipeline module. See [`arch-use-events`](../.agents/skills/nestjs-best-practices/rules/arch-use-events.md).

## Open decisions

- Does the app replace monday.com and Calendly, or sync with them? If it syncs, Calendly bookings could arrive by webhook.
- Are LinkedIn applicants imported, or do they apply through a form in this app?
- Are stages shared by all jobs, or set per job?
- Can one candidate apply to more than one job?

## References

- [assessments.md](assessments.md)
- [database.md](database.md)
- Frontend: [recruitment-pipeline.md](../../frontend/docs/recruitment-pipeline.md)
