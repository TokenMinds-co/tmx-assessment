# Dashboard

**Status:** In progress · **Last updated:** 2026-09-21

## Scope

The numbers on the staff home page: how sent links are going, how each test is doing, and who finished something lately. The rules behind those numbers belong to the areas they came from, so link statuses and scoring are in [assessments.md](assessments.md). Who may read the page is in [authentication.md](authentication.md), and the shape of the answer follows [api-conventions.md](api-conventions.md).

## Current state

- **One route, built and covered by tests:** `GET /api/dashboard`, in [dashboard.controller.ts](../src/dashboard/dashboard.controller.ts).
- **Code:** [src/dashboard/](../src/dashboard/). The service reads; it owns no rules of its own. `countLinks()` in [dashboard.service.ts](../src/dashboard/dashboard.service.ts) is a plain function, checked by [dashboard.service.spec.ts](../src/dashboard/dashboard.service.spec.ts), and the route end to end by [dashboard.e2e-spec.ts](../test/dashboard.e2e-spec.ts).
- **Nothing on the page is about the recruitment pipeline yet.** When jobs and stages land, their numbers come in here too (see [recruitment-pipeline.md](recruitment-pipeline.md)).

## Requirements

- Staff open the app on a home page that says what needs attention, without clicking into the Sent tab and the test library first.
- The page must agree with those two screens. A number that says something different from the list behind it is worse than no number.
- Any staff member sees it. There is nothing on it that only admins may read.
- One request, so the page has no half-loaded state.

## How it works

`GET /api/dashboard` answers one object. It needs a session, like every route that isn't `@Public()`, and no particular role.

```json
{
  "progress": { "notStarted": 4, "inProgress": 2, "completed": 11 },
  "expiredInvitations": 3,
  "tests": [
    { "id": "…", "name": "Communication", "durationMinutes": 8, "completed": 9, "averageScore": 0.82 }
  ],
  "recentResults": [
    {
      "invitationId": "…",
      "candidate": { "id": "…", "name": "Ada Lovelace" },
      "testsFinished": 1,
      "testsTotal": 2,
      "averageScore": 0.86,
      "finishedAt": "2026-09-21T09:14:02.881Z"
    }
  ]
}
```

- **Overdue attempts are closed first.** The route calls `AttemptsService.finalizeOverdue()` before it counts anything, exactly as the Sent list does, so a candidate whose time ran out isn't still counted as busy.
- **`progress` and `expiredInvitations` come from the links.** The service reads every link that hasn't been revoked, taking only `revokedAt`, `expiresAt` and its attempts' statuses, and folds them with `countLinks()`, which asks [`invitationStatus()`](../src/assessments/invitation.mapper.ts) for each one. That is the same function the Sent tab's status column uses, so the four numbers and that column can't disagree. A link past its expiry with a test still running counts as in progress, not expired, because the candidate can still finish it.
- **`tests` reuses the test library's figures.** It lists the tests that have been sent at least once (`attempts: { some: {} }`), by name, and asks `AssessmentsService.stats()` for the completed count and the mean score, the same call behind `GET /api/assessments`. `stats()` counts every attempt of a test, so an attempt on a link that was later revoked still counts here; the test was taken and its score is real.
- **`recentResults` is one row per link, not per test.** A `groupBy` over finished attempts (`SUBMITTED` or `EXPIRED`, from `FINISHED_STATUSES`) on links that haven't been revoked gives the latest finish, the mean score and how many are finished, newest first, five at most. A second query fetches those links' candidates and how many tests each holds. The two are joined in memory in the group-by's order, so a busy week is still two queries rather than one per candidate.
- **`averageScore` is null** when nothing scored yet: for a test nobody has finished, and for a link whose finished attempts all scored nothing.
- **The DTOs** are in [dashboard-response.dto.ts](../src/dashboard/dto/dashboard-response.dto.ts). A candidate is the shared `PersonRefDto`: an id and a name, nothing else.

## Decisions

"Requested" means the maintainers asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| How many routes the page needs | One, `GET /api/dashboard`, answering one object | The page has nothing to page through or filter, and one request means no half-loaded state. Screens that need more detail already have their own endpoints. | Build default |
| Where the code lives | Its own module, `src/dashboard/`, not a route on the assessments controller | The home page is a page, not an area of the domain: the recruitment pipeline's numbers belong on it too, and they won't come from assessments. | Build default |
| How links are counted | Read the links, then call `invitationStatus()` on each in memory | It's the one function that decides a link's status, so the dashboard can't drift from the Sent tab. Counting in SQL would be a second copy of the rule, and the rule depends on the clock. | Build default |
| Revoked links | Left out of `progress`, `expiredInvitations` and `recentResults` | A revoked link is a link staff took back; it isn't waiting for anyone. Its attempts still count in `tests`, because the test really was taken and scored. | Build default |
| Per-test numbers | Reuse `AssessmentsService.stats()`, over the tests that were ever sent | The test library already shows exactly these numbers, and a test nobody has been sent would only pad the table with zeroes. | Build default |
| What a recent result is | One link with at least one finished test, its score the unweighted mean of its finished attempts, the five latest by `finishedAt` | Staff think in candidates, not attempts: "Ada finished, go and look". An unweighted mean matches how a link reads, one row per candidate. Five fits the card without scrolling. | Build default |
| A candidate's role on the page | No `role` field | There is no Job model yet, so there is nothing true to put in it. It comes with the pipeline. | Build default |
| The candidate's email | Not in the answer | The page shows a name and links to the results page, which has the email. Less to leak from a screen that's open all day. | Build default |

## Open decisions

- **A time window.** Whether the numbers should cover everything or the last 30 days, and whether staff pick.
- **Whose numbers.** Whether the page shows the whole team's links or only the ones the signed-in member sent.
- **What the pipeline adds** once jobs and stages exist: open jobs, candidates per stage, and what the staff member is meant to do next.
- **Whether expired links get an action** on the page, such as resending in one click, or stay a number to click through.
- **Caching.** Every read counts every link. If it gets slow, either cache the answer briefly or keep running totals.

## References

- [assessments.md](assessments.md) (link statuses, scoring, `stats()`), [recruitment-pipeline.md](recruitment-pipeline.md)
- [api-conventions.md](api-conventions.md), [authentication.md](authentication.md#protecting-routes), [testing.md](testing.md)
- Rules: [`arch-feature-modules`](../.agents/skills/nestjs-best-practices/rules/arch-feature-modules.md), [`api-use-dto-serialization`](../.agents/skills/nestjs-best-practices/rules/api-use-dto-serialization.md)
