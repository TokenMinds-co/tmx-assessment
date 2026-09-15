# API client

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

How the frontend calls the NestJS backend: the base URL, the `/api` rewrite, the fetch wrapper, credentials, error handling and shared types. Caching is in [data-fetching.md](data-fetching.md), and sessions are in [authentication.md](authentication.md).

## Current state

- [lib/api/client.ts](../lib/api/client.ts): `apiFetch()`, the one fetch wrapper, and `ApiError`.
- [lib/api/auth.ts](../lib/api/auth.ts): the auth endpoints and the `User` type. The first domain module.
- [lib/api/url.ts](../lib/api/url.ts): `apiUrl()`, the backend's origin from `API_URL` (see [configuration.md](configuration.md)).
- [lib/session.ts](../lib/session.ts): the server-side session check, and so far the only server-side call.
- The `/api/*` rewrite is in [next.config.ts](../next.config.ts).

## How it works

### Calling pattern

- **The browser calls the API on the frontend's own origin.** A rewrite in next.config.ts forwards `/api/*` to `API_URL`, so browser code calls `apiFetch("/api/auth/login", …)`. The call is same-origin, so there's no CORS preflight, and fetch's default `credentials: "same-origin"` sends the session cookie.
- **Server components call the backend directly,** at `${apiUrl()}/api/…`, because rewrites don't apply to server-side `fetch`. They send the session token as a bearer token (see [lib/session.ts](../lib/session.ts)).
- **The backend's Origin check still applies.** The browser's `Origin` header goes through the rewrite unchanged, so the backend's `FRONTEND_URL` must be the address people open the frontend on. Otherwise every sign-in gets `403 Cross-origin request blocked.`
- **Through the rewrite, the API sees the Next.js server as the client.** Next.js doesn't add `X-Forwarded-For` when it forwards a rewrite; it only passes on one it receives. Locally, that puts every browser in one rate-limit bucket, which is fine. For production, see [Open decisions](#open-decisions).

### `apiFetch`

- Sends `body` as JSON with `Content-Type: application/json`, the only body format the API accepts.
- Returns the parsed JSON, or `undefined` for an empty answer, such as the API's `202` and `204`.
- Throws `ApiError` for everything else. It carries `status` (0 when no response arrived) and `messages`, the sentences to show. `errorMessage(error)` turns anything thrown into one string for the UI.

### Errors

The backend's errors are `{ statusCode, message, error }`, where `message` is a string or a list of strings (see its [api-conventions.md](../../backend/docs/api-conventions.md)). `ApiError.messages` keeps the API's own words, except in these cases:

| Case | What the user sees |
| --- | --- |
| 429, a rate limit | Too many attempts. Wait a few minutes, then try again. |
| 500, or a 5xx without a JSON message, as when the rewrite can't reach the API | Something went wrong on our side. Try again in a moment. |
| Any other error without a message | Something went wrong. Try again. |
| No response at all: offline, or the server-side timeout | Couldn’t reach TMX HR. Check your connection and try again. |

### Types

Written by hand next to the calls, from the backend's response DTOs. `User` in lib/api/auth.ts matches the backend's `UserResponseDto`, with dates as ISO 8601 strings.

### Adding a domain module

1. Create `lib/api/<domain>.ts` with plain functions such as `getCandidate(id)`, built on `apiFetch`. Components never call `fetch` directly.
2. For server-side calls, build the URL with `apiUrl()`, send the token the way `getCurrentUser()` in lib/session.ts does, and call `requireUser()` first.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Calling pattern | The browser calls `/api/*` on the frontend's origin, and a Next.js rewrite forwards it to the backend. Server code calls the backend directly. | The backend's docs recommend it for production: the cookie is first-party, proxy.ts can read it, and neither CORS nor `COOKIE_DOMAIN` is needed. Development works the same way. | Build default |
| Route handlers as a proxy | Not used; a rewrite does the forwarding | It passes requests, responses and cookies through with no code to maintain | Build default |
| Shared types | Written by hand | There's one shape so far. Generating them from `/api/docs/json` is still an open decision. | Build default |
| Error messages | The API's own words, with plainer wording for rate limits, server errors and lost connections | The rate limiter's message and Nest's 500 message aren't written for people | Build default |
| Where the client lives | `lib/api/`, one file per domain | As proposed here before it was built | Build default |

## Open decisions

- **Real client IPs in production.** The backend's rate limits are per IP. Behind the rewrite, the API sees the Next.js server unless an `X-Forwarded-For` header arrives with the request. Either put a proxy or load balancer that sets that header in front of the frontend and set `TRUST_PROXY=1` on the backend, or replace the rewrite with a route handler that adds the header. Decide with hosting.
- **Generated types** from the backend's OpenAPI document (`/api/docs/json`), for example with `openapi-typescript`. See the backend's [api-conventions.md](../../backend/docs/api-conventions.md).
- **Browser-side 401s.** Once staff screens fetch data in the browser, a 401 means the session has ended. The plan is to send the user to `/login?next=…` (see [authentication.md](authentication.md)).

## References

- [authentication.md](authentication.md), [configuration.md](configuration.md), [data-fetching.md](data-fetching.md)
- Next.js 16 docs: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.md` and `node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`
- Backend: [api-conventions.md](../../backend/docs/api-conventions.md), [authentication.md](../../backend/docs/authentication.md#how-the-frontend-connects)
