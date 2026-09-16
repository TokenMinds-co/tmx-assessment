# Data fetching

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

How server state is fetched, cached and updated: TanStack Query setup, server prefetching, mutations, invalidation, and loading and error states. HTTP details are in [api-client.md](api-client.md), and key naming is in [query-keys.md](query-keys.md).

## Current state

- **TanStack Query 5** (`@tanstack/react-query` 5.102.8) is installed, with `@tanstack/react-query-devtools`, which only loads in development.
- **[app/providers.tsx](../app/providers.tsx)** creates the `QueryClient` and mounts `QueryClientProvider`, the toasts and the devtools. [app/layout.tsx](../app/layout.tsx) wraps every page in it.
- **The key factories** are in [lib/query-keys.ts](../lib/query-keys.ts). See [query-keys.md](query-keys.md).
- **The assessment screens and the candidate's test page** use it (see [assessments.md](assessments.md)). The dashboard still shows sample data.

## How it works

### The client

- **One `QueryClient` per browser tab,** created once with `useState` in the provider. On the server the provider runs for each request, so no two users ever share a cache. See [`ssr-client-per-request`](../.agents/skills/tanstack-query-best-practices/rules/ssr-client-per-request.md).
- **Defaults live on the client,** not on each query:
  - `staleTime` is 30 seconds, so moving between tabs and pages doesn't refetch straight away.
  - A failed query is retried up to twice, but never after a 4xx, which won't fix itself.
  - Mutations keep TanStack Query's default of no retries.
- **A 401 from any query or mutation** means the session ended, so the query cache and the mutation cache both load `/login?next=<this page>`, except on `/take/` pages. See [authentication.md](authentication.md#a-401-in-the-browser).

### Queries

- **Staff pages check the session on the server, then fetch in the browser.** The page calls `requireUser()` and renders a client component that calls `useQuery`. Nothing is prefetched into the cache yet, so there's no `HydrationBoundary`.
- **The staff preview** loads its test on the server with `serverApiFetch()` and passes it down as a prop, without a query.
- **Keys always come from the factories.** Queries are written where they're used, with `useQuery`; `queryOptions` isn't used yet.
- **Where the defaults don't fit:**
  - The candidate's start page has `staleTime: 0` and doesn't refetch when the window regains focus.
  - The Sent list and the candidate search keep the previous results on screen while the next ones load (`placeholderData: keepPreviousData`). The Sent list dims them meanwhile.
  - The results page polls every 15 seconds while the link is in progress (`refetchInterval`).
  - The candidate search only runs while its list is open, 250 ms after typing stops ([use-debounced-value.ts](../hooks/use-debounced-value.ts)). The Sent list's search waits 300 ms.
- **Loading and errors** are handled in each component: a skeleton while pending, and an alert or empty state with "Try again" on error. `/take/[token]` also has an `error.tsx`.

### Mutations

- **Every change to a test answers with the whole test,** so the answer goes straight into the cache with `setQueryData` on the test's detail key, and the lists are invalidated behind it. [use-assessment-mutation.ts](<../app/(app)/assessments/[id]/_components/use-assessment-mutation.ts>) does this for the editor, and shows a failure as a toast unless the form shows it in place.
- **Reordering questions is optimistic.** The new order goes into the cache before the request, and a failure puts the old one back. Quick moves overlap, so only the answer to the last move still running is written back, found with the mutation's key and `isMutating()`.
- **A role profile pick** shows at once from the mutation's variables and falls back if the save fails.
- **Candidates' answers** don't go through the cache. The take page saves them in its own queue, with retries (see [assessments.md](assessments.md#the-candidates-side)).
- **Which keys each mutation sets or invalidates** is in [query-keys.md](query-keys.md#invalidation).

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Library | TanStack Query 5, with its devtools in development | | Requested |
| Default `staleTime` (was open) | 30 seconds | Fresh enough for a small team, without a refetch on every tab switch. | Build default |
| Retries | Queries retry twice, never after a 4xx. Mutations don't retry. | A 4xx won't change on a retry; a dropped connection might. | Build default |
| A 401 in the browser | Sign in again with a full page load, then come back, except on candidate pages | The session has ended. Candidates have no session. | Build default |
| Server prefetching (was open) | None yet: server components check the session and client components fetch | The screens so far are editors and tables that change in the browser. Prefetch with `HydrationBoundary` when a first paint needs it. | Build default |
| After a change to a test | Put the API's answer in the cache, then invalidate the lists | The API answers with the whole test, so the editor never refetches it. | Build default |

## Open decisions

- Moving shared queries into `queryOptions`. The library list is written out twice today, in the Library and Sent tabs.
- Which screens should prefetch on the server once the dashboard shows real data.

## References

- [query-keys.md](query-keys.md)
- [api-client.md](api-client.md)
- [`tanstack-query-best-practices` skill](../.agents/skills/tanstack-query-best-practices/SKILL.md)
