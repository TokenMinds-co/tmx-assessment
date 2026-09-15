# Authentication

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

The sign-in screen, how the browser holds the session, protecting staff pages and server-side data access, and how candidate links open tests. The sign-in method itself is decided in the backend's [authentication.md](../../backend/docs/authentication.md).

## Current state

None. Every page is public.

## Proposed approach

This follows the Next.js 16 authentication guide:

- **Keep the session in an httpOnly cookie,** not `localStorage`, so page scripts can't read it.
- **Check auth close to the data.** A small data access layer (for example `verifySession()`) runs in server components, server actions and route handlers before they load or change data. See [`server-auth-actions`](../.agents/skills/vercel-react-best-practices/rules/server-auth-actions.md).
- **Use `proxy.ts` only for quick redirects,** such as sending signed-out users to `/login`. Next.js 16 renamed Middleware to Proxy. It runs on every route, including prefetches, so it should only read the cookie and never query the database.
- **Candidate pages** authenticate with the token in the link, which the backend verifies.

## Open decisions

- Where the session cookie is set: by the NestJS API, or by Next.js after sign-in. This goes with the backend's session model and the calling pattern in [api-client.md](api-client.md).
- The sign-in screen, which depends on the backend's sign-in method.

## References

- Next.js 16 docs: `node_modules/next/dist/docs/01-app/02-guides/authentication.md` and `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- [routing.md](routing.md)
- [api-client.md](api-client.md)
- Backend: [authentication.md](../../backend/docs/authentication.md)
