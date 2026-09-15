# API client

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

How the frontend calls the NestJS backend: the base URL, the fetch wrapper, credentials, error handling and shared types. Caching is in [data-fetching.md](data-fetching.md).

## Current state

None. The frontend makes no API calls and has no backend URL configured.

## Proposed approach

- **One typed fetch wrapper,** for example `lib/api/client.ts`, used by every query function and all server-side code. It sets the base URL, sends and parses JSON, includes credentials, and turns non-2xx responses into one typed `ApiError`.
- **One module per domain** on top of the wrapper (for example `lib/api/candidates.ts`), with plain functions such as `getCandidate(id)`. Components never call `fetch` directly.
- **The base URL comes from config.** See [configuration.md](configuration.md).

## Open decisions

- **Calling pattern.** Does the browser call the NestJS API directly (this needs CORS; see the backend's [api-conventions.md](../../backend/docs/api-conventions.md)), or go through Next.js route handlers? See the backend-for-frontend guide in `node_modules/next/dist/docs/01-app/02-guides/`.
- **Shared types.** Write them by hand, or generate them from an OpenAPI spec if the backend publishes one.
- **Error shape.** This follows whatever the backend's [api-conventions.md](../../backend/docs/api-conventions.md) settles on.

## References

- [data-fetching.md](data-fetching.md)
- [authentication.md](authentication.md)
- Backend: [api-conventions.md](../../backend/docs/api-conventions.md)
