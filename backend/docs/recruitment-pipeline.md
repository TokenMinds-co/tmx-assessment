# Recruitment pipeline

**Status:** Not started · **Last updated:** 2026-09-21

## Scope

Jobs, candidates, applications, stages, statuses and stage owners: the data and API that replace the external board a team tracks hiring on today, plus importing the candidate interest form from Notion. Assessments have their own doc, [assessments.md](assessments.md).

## Current state

Not started. Today this is tracked outside the app, on an external board, and stages are updated by hand.

## Requirements

- Staff can add, rename, reorder and remove **stages** and **status categories**. They are stored as data, not as enums in code.
- Each stage has an **owner** (a team member), and the owner can change.
- Candidates register interest through a **Notion form**, not a form in this app. Import each response with the **application details** the external board's form collects today, such as location and notice period.
- Store **call reports** from screening calls on the candidate.
- Record every **stage move**: who moved the candidate, when, and from which stage to which.

## Proposed approach

- **Feature modules** for jobs, candidates and the pipeline. See [`arch-feature-modules`](../.agents/skills/nestjs-best-practices/rules/arch-feature-modules.md).
- **Draft entities:** `Job`, `Candidate`, `Application` (a candidate applying to a job, with its current stage and status), `Stage`, `Status`, `StageChange` (the move history) and `CallReport`. Staff members, including stage owners, are the existing `User` model (see [authentication.md](authentication.md)).
- **Emit an event on stage change,** such as `application.stage_changed`. Other modules, for example assessments, can react to it without depending on the pipeline module. See [`arch-use-events`](../.agents/skills/nestjs-best-practices/rules/arch-use-events.md).

### Importing the Notion form

- **Each response is a page in a Notion database.** A Notion integration with access to that database lets the backend read the responses and turn each one into a `Candidate` and an `Application`.
- **Pull new responses every few minutes,** and give staff a "Sync now" action. Pulling works in local development and before hosting is chosen. Notion's `page.created` webhook needs a public HTTPS URL and doesn't guarantee that every event arrives, so it would still need a catch-up pull. Add it later if a few minutes is too slow.
- **Import each response once.** Store the Notion page ID on the application, so a response that's read twice isn't added twice. Match candidates by email, which `Candidate` already stores trimmed and lowercased (see [schema.prisma](../prisma/schema.prisma)).
- **Notion is only the way in.** After the import, staff update candidates in this app, and nothing is written back to Notion.

## Decisions

"Requested" means the maintainers asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| How candidates apply | Through a Notion form, which the app imports. The app has no application form of its own. Notion is used only for this form; assessments stay in this app (see [assessments.md](assessments.md#decisions)). | | Requested |

## Open decisions

- Does the app replace the external board and the scheduling tool, or sync with them? If it syncs, bookings could arrive by webhook. The board's own intake form is replaced by the Notion form either way.
- Which questions the Notion form asks, and how a response says which job it's for: a role question on one form, or one form per job.
- Are stages shared by all jobs, or set per job?
- Can one candidate apply to more than one job, and what happens when the same email sends the form twice?

## References

- [assessments.md](assessments.md)
- [database.md](database.md)
- Frontend: [recruitment-pipeline.md](../../frontend/docs/recruitment-pipeline.md)
- Notion: [Forms](https://www.notion.com/help/forms), [webhooks](https://developers.notion.com/reference/webhooks), [webhook events and delivery](https://developers.notion.com/reference/webhooks-events-delivery)
