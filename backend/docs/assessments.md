# Assessments

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

Test definitions and their questions, sending tests to candidates, taking and scoring attempts, and storing results. How the LLM writes the questions is in [question-generation.md](question-generation.md).

## Current state

Not started. Waiting on Robbie's list of the five TestGorilla tests and their specs.

## Requirements

- Five general skills tests: **motivation, communication, attention to detail, critical thinking and English**.
- Each test takes **15–20 minutes**, uses **multiple-choice questions**, and has a **scoring model**.
- A candidate's total should stay around **30–40 minutes**. At 15–20 minutes per test, that's about two tests per candidate, so staff choose which tests to send.
- Tests can be sent **at any stage**: right after the application (once salary and location fit), or before or after the first call.
- All of a candidate's tests are in **one place** in this app, not in separate links.

## Proposed approach

Flow:

1. A staff member sends one or more tests to a candidate. Later, a stage change could send them automatically, using the pipeline's `application.stage_changed` event (see [recruitment-pipeline.md](recruitment-pipeline.md)).
2. The candidate gets one link to all of their assigned tests (see [authentication.md](authentication.md)).
3. The candidate takes each test within its time limit.
4. The backend scores the answers with the test's scoring model and stores a score per test.
5. Staff see the results on the candidate's profile and decide the next stage.

Rules:

- **The server enforces time limits.** Store when each test started, and reject answers after the limit plus a short grace period.
- **Correct answers and scoring weights never go to the browser.**
- **A test's version is fixed once it's sent.** If its questions change later, candidates who already have it keep the version they were sent.

Draft entities: `Assessment` (a test and its time limit), `Question`, `Option`, `ScoringModel`, `Invitation` (the tests sent to a candidate), `Attempt`, `Answer` and `Result`.

## Open decisions

- **Motivation scoring.** Motivation questions have no single right answer, so this test needs a different model, for example matching answers against the role's preferred profile.
- **Pass marks.** What is the pass mark for each test, and does missing it move the candidate automatically or only flag them for staff?
- **Which tests go to which roles.**
- **Question order.** A fixed set, or a random draw from a larger pool so answers are harder to share?
- **Retakes and link expiry.**

## References

- [question-generation.md](question-generation.md)
- [recruitment-pipeline.md](recruitment-pipeline.md)
- [authentication.md](authentication.md)
- Frontend: [assessments.md](../../frontend/docs/assessments.md)
