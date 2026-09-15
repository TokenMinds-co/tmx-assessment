# Question generation

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

Using an LLM to write the questions, options and answer keys for each test from its spec, and getting those questions reviewed before candidates see them. How tests are sent, taken and scored is in [assessments.md](assessments.md).

## Current state

Not started. No LLM provider is chosen, and the test specs from Robbie haven't arrived.

## Requirements

- Questions are generated with an LLM from the test details in the TestGorilla library.
- The output must fit the test format in [assessments.md](assessments.md): multiple choice, 15–20 minutes per test, with a scoring model.

## Proposed approach

- **Input:** one spec per test, covering what it measures, its sub-skills, the difficulty and the time budget.
- **Output:** structured JSON (question, options, correct answer or scoring weights, sub-skill), checked against a schema before it's saved.
- **Review before use:** generated questions are saved as drafts, and a staff member approves them before they can be sent to candidates.
- **Generated ahead of time:** staff trigger generation. It never runs while a candidate is taking a test, which keeps costs low and means every candidate sees reviewed questions.
- **Traceability:** store the model and prompt version with each generated question.
- **Keep the API key on the server,** in config (see [configuration.md](configuration.md)).
- **Background jobs** if generation is slow. See [`micro-use-queues`](../.agents/skills/nestjs-best-practices/rules/micro-use-queues.md).

## Open decisions

- The LLM provider and model.
- Who reviews generated questions.
- Pool size: how many questions to generate per test, so tests can vary between candidates.

## References

- [assessments.md](assessments.md)
- [configuration.md](configuration.md)
- [`test-mock-external-services`](../.agents/skills/nestjs-best-practices/rules/test-mock-external-services.md), for testing without calling the LLM
