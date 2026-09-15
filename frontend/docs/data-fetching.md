# Data fetching

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

How server state is fetched, cached and updated: TanStack Query setup, server prefetching, mutations, invalidation, and loading and error states. HTTP details are in [api-client.md](api-client.md), and key naming is in [query-keys.md](query-keys.md).

## Current state

TanStack Query isn't installed yet. It's the planned library: the `tanstack-query-best-practices` skill is installed, and [AGENTS.md](../AGENTS.md) says to use only one client-side fetching library.

## Proposed approach

- **Install** `@tanstack/react-query`, plus its devtools in development.
- **One `QueryClient` per browser session,** created in a client provider (for example `app/providers.tsx`) and mounted in the root layout. On the server, create a new client for each request so users never share a cache. See [`ssr-client-per-request`](../.agents/skills/tanstack-query-best-practices/rules/ssr-client-per-request.md).
- **Set defaults on the `QueryClient`,** such as `staleTime` and `retry`, instead of on each query. See [`cache-defaults`](../.agents/skills/tanstack-query-best-practices/rules/cache-defaults.md) and [`cache-stale-time`](../.agents/skills/tanstack-query-best-practices/rules/cache-stale-time.md).
- **Define queries with `queryOptions`,** built from the key factories, so the same definition works in `useQuery` and `prefetchQuery`. See [query-keys.md](query-keys.md).
- **Prefetch on the server** where it speeds up first paint, and pass the data down with `HydrationBoundary`. See [`ssr-dehydration`](../.agents/skills/tanstack-query-best-practices/rules/ssr-dehydration.md) and [`ssr-hydration-boundary`](../.agents/skills/tanstack-query-best-practices/rules/ssr-hydration-boundary.md).
- **Invalidate after mutations,** targeting the smallest set of keys. See [`mut-invalidate-queries`](../.agents/skills/tanstack-query-best-practices/rules/mut-invalidate-queries.md) and [`cache-invalidation`](../.agents/skills/tanstack-query-best-practices/rules/cache-invalidation.md).
- **Catch page-level failures with error boundaries.** See [`err-error-boundaries`](../.agents/skills/tanstack-query-best-practices/rules/err-error-boundaries.md).

## Open decisions

- The default `staleTime` for staff screens.
- Which screens prefetch on the server and which fetch only in the browser.

## References

- [query-keys.md](query-keys.md)
- [api-client.md](api-client.md)
- [`tanstack-query-best-practices` skill](../.agents/skills/tanstack-query-best-practices/SKILL.md)
