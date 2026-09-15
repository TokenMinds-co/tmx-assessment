# Query keys

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

How TanStack Query keys are named and structured, where the key factories live, and which keys each mutation invalidates. The query setup is in [data-fetching.md](data-fetching.md).

## Current state

None. TanStack Query isn't installed yet.

## Rules

These come from the `qk-` rules in the `tanstack-query-best-practices` skill, which rates them CRITICAL:

- **Keys are arrays.** See [`qk-array-structure`](../.agents/skills/tanstack-query-best-practices/rules/qk-array-structure.md).
- **Keys go from general to specific:** entity, then ID, then sub-resource, then filters. See [`qk-hierarchical-organization`](../.agents/skills/tanstack-query-best-practices/rules/qk-hierarchical-organization.md).
- **Include every variable** the query depends on, such as IDs, filters and pagination. See [`qk-include-dependencies`](../.agents/skills/tanstack-query-best-practices/rules/qk-include-dependencies.md).
- **Use only JSON-serializable parts,** so no functions or class instances. See [`qk-serializable`](../.agents/skills/tanstack-query-best-practices/rules/qk-serializable.md).
- **Build keys with factories.** Never write a key array inline in a component. See [`qk-factory-pattern`](../.agents/skills/tanstack-query-best-practices/rules/qk-factory-pattern.md).

## Proposed structure

Start with one file, `lib/query-keys.ts`, and split it per domain when it grows. Entity names are plural.

```ts
export const candidateKeys = {
  all: ["candidates"] as const,
  lists: () => [...candidateKeys.all, "list"] as const,
  list: (filters: CandidateFilters) => [...candidateKeys.lists(), filters] as const,
  details: () => [...candidateKeys.all, "detail"] as const,
  detail: (id: string) => [...candidateKeys.details(), id] as const,
  stageHistory: (id: string) => [...candidateKeys.detail(id), "stage-history"] as const,
  results: (id: string) => [...candidateKeys.detail(id), "results"] as const,
};
```

Because keys are hierarchical, invalidating `candidateKeys.detail(id)` also invalidates that candidate's `stageHistory` and `results`.

Draft factories:

| Factory | Root key | Keys |
| --- | --- | --- |
| `candidateKeys` | `["candidates"]` | `list(filters)`, `detail(id)`, `stageHistory(id)`, `results(id)` |
| `jobKeys` | `["jobs"]` | `list(filters)`, `detail(id)` |
| `pipelineKeys` | `["pipeline"]` | `stages()`, `statuses()` |
| `assessmentKeys` | `["assessments"]` | `list()`, `detail(id)`, `questions(id)` |
| `sessionKeys` | `["session"]` | `current()` |

Draft invalidation map:

| After this mutation | Invalidate |
| --- | --- |
| Move a candidate to another stage | `candidateKeys.detail(id)`, `candidateKeys.lists()` |
| Add a call report | `candidateKeys.detail(id)` |
| Send an assessment | `candidateKeys.detail(id)` |
| Edit stages or statuses | `pipelineKeys.all`, `candidateKeys.lists()` |
| Approve generated questions | `assessmentKeys.detail(id)` |

Update both tables when you add a factory or a mutation.

## Open decisions

- When to split `lib/query-keys.ts` into per-domain files.

## References

- [data-fetching.md](data-fetching.md)
- [recruitment-pipeline.md](recruitment-pipeline.md)
- [assessments.md](assessments.md)
