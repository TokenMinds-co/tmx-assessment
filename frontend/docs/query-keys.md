# Query keys

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

How TanStack Query keys are named and structured, where the key factories live, and which keys each mutation invalidates. The query setup is in [data-fetching.md](data-fetching.md).

## Current state

- **Every factory is in [lib/query-keys.ts](../lib/query-keys.ts):** `assessmentKeys`, `invitationKeys`, `candidateKeys` and `takeKeys`.
- **The pipeline's keys** (jobs, stages, candidate profiles) come with that module.

## Rules

These come from the `qk-` rules in the `tanstack-query-best-practices` skill, which rates them CRITICAL:

- **Keys are arrays.** See [`qk-array-structure`](../.agents/skills/tanstack-query-best-practices/rules/qk-array-structure.md).
- **Keys go from general to specific:** entity, then ID, then sub-resource, then filters. See [`qk-hierarchical-organization`](../.agents/skills/tanstack-query-best-practices/rules/qk-hierarchical-organization.md).
- **Include every variable** the query depends on, such as IDs, filters and pagination. See [`qk-include-dependencies`](../.agents/skills/tanstack-query-best-practices/rules/qk-include-dependencies.md).
- **Use only JSON-serializable parts,** so no functions or class instances. See [`qk-serializable`](../.agents/skills/tanstack-query-best-practices/rules/qk-serializable.md).
- **Build keys with factories.** Never write a key array inline in a component. See [`qk-factory-pattern`](../.agents/skills/tanstack-query-best-practices/rules/qk-factory-pattern.md).

## How it works

```ts
export const assessmentKeys = {
  all: ["assessments"] as const,
  lists: () => [...assessmentKeys.all, "list"] as const,
  list: (filters: { status?: AssessmentStatus } = {}) => [...assessmentKeys.lists(), filters] as const,
  details: () => [...assessmentKeys.all, "detail"] as const,
  detail: (id: string) => [...assessmentKeys.details(), id] as const,
};
```

| Factory | Root key | Keys | Used by |
| --- | --- | --- | --- |
| `assessmentKeys` | `["assessments"]` | `lists()`, `list({ status? })`, `details()`, `detail(id)` | The library, the Sent tab's test filter, the send dialog (published tests only) and the editor |
| `invitationKeys` | `["invitations"]` | `lists()`, `list({ page, pageSize, search?, assessmentId?, candidateId? })`, `details()`, `detail(id)` | The Sent tab and the results page |
| `candidateKeys` | `["candidates"]` | `search(text)` | The candidate picker in the send dialog |
| `takeKeys` | `["take"]` | `overview(token)`, which is `["take", token, "overview"]` | The candidate's start page |

Because keys are hierarchical, invalidating `assessmentKeys.lists()` refreshes every library list whatever its filter, and invalidating `invitationKeys.all` refreshes every Sent page and every results page.

### Invalidation

Every change to a test answers with the whole test, so most mutations set the detail key from the answer and invalidate only the lists.

| After this | Set in the cache | Invalidate |
| --- | --- | --- |
| Any change in the editor: settings, status, sections, questions, bands, weights or a role profile pick | `assessmentKeys.detail(id)`, from the answer | `assessmentKeys.lists()` |
| Reorder questions | `assessmentKeys.detail(id)` at once, then the answer to the last move still running | Nothing |
| Import a question CSV | `assessmentKeys.detail(id)`, from the answer | `assessmentKeys.lists()` |
| Create, import or duplicate a test | `assessmentKeys.detail(newId)` | `assessmentKeys.lists()`; `assessmentKeys.all` when duplicating from the library |
| Archive or restore from the library | `assessmentKeys.detail(id)` | `assessmentKeys.all` |
| Delete a test | Removes `assessmentKeys.detail(id)` | `assessmentKeys.lists()` from the editor; `assessmentKeys.all` from the library |
| Send tests | | `invitationKeys.all`, `assessmentKeys.lists()` (the sent counts) and `candidateKeys.all` (a new candidate) |
| Resend or revoke a link | | `invitationKeys.all` |
| A candidate finishes a test | | `takeKeys.overview(token)` |

Planned for the recruitment pipeline:

| Factory | Root key | Keys |
| --- | --- | --- |
| `candidateKeys` | `["candidates"]` | Add `list(filters)`, `detail(id)`, `stageHistory(id)` and `results(id)` |
| `jobKeys` | `["jobs"]` | `list(filters)`, `detail(id)` |
| `pipelineKeys` | `["pipeline"]` | `stages()`, `statuses()` |

The session isn't a query: server code checks it (see [authentication.md](authentication.md)).

Update these tables when you add a factory or a mutation.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Where the factories live | One file, `lib/query-keys.ts` | Four small factories so far. | Build default |
| Filters in keys | The whole filter object, such as `{ status }` or the Sent list's paging and search | Every variable a query depends on is in its key, so each filter gets its own cache entry. | Build default |

## Open decisions

- When to split `lib/query-keys.ts` into per-domain files.

## References

- [data-fetching.md](data-fetching.md)
- [recruitment-pipeline.md](recruitment-pipeline.md)
- [assessments.md](assessments.md)
