# Assessments

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

The screens candidates use to take tests, and the staff screens for the test library, sending tests and viewing results. Scoring and time limits are in the backend's [assessments.md](../../backend/docs/assessments.md).

## Current state

Not started. Waiting on the five test specs from Robbie.

## Requirements

- Five tests: motivation, communication, attention to detail, critical thinking and English.
- Each test takes 15–20 minutes and uses multiple-choice questions. A candidate's total should stay around 30–40 minutes.
- All of a candidate's tests are in one place, not in separate links.

## Proposed approach

**Candidate side**

- One link opens a page that lists all assigned tests and how long each one takes.
- One question per screen, with a visible countdown. Each answer is saved as the candidate goes, so a refresh or a dropped connection doesn't lose progress. The server enforces the time limit.
- Works on a phone, since candidates may open the link on mobile.
- Clear start and finish screens.

**Staff side**

- **Test library:** view each test and its questions, and review LLM-generated drafts before they go live (see the backend's [question-generation.md](../../backend/docs/question-generation.md)).
- **Send tests** from the candidate profile: pick the tests and see the total time before sending.
- **Results** on the candidate profile: the score for each test and the time taken.

## Open decisions

- Whether candidates see their own results.
- Accessibility: extra time for candidates who need it.

## References

- [routing.md](routing.md)
- [recruitment-pipeline.md](recruitment-pipeline.md)
- [data-fetching.md](data-fetching.md)
- Backend: [assessments.md](../../backend/docs/assessments.md)
