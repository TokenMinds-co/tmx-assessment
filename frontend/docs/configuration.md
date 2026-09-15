# Configuration

**Status:** Scaffold only · **Last updated:** 2026-09-15

## Scope

Environment variables, `next.config.ts`, ports and TypeScript path aliases.

## Current state

- [next.config.ts](../next.config.ts) is empty.
- No environment variables are used yet.
- The dev server runs on port 3000, the Next.js default. The backend also defaults to 3000; see the backend's [configuration.md](../../backend/docs/configuration.md).
- Path alias: `@/*` points to the frontend root ([tsconfig.json](../tsconfig.json)), so `@/lib/api/client` resolves to `lib/api/client.ts`.
- `.gitignore` ignores every `.env*` file. That also catches `.env.example`, so add `!.env.example` to `.gitignore` before committing one.

### Environment variables

| Variable | Reaches the browser | Purpose |
| --- | --- | --- |
| None yet | | |

## Proposed approach

- **Only variables prefixed with `NEXT_PUBLIC_` reach the browser.** Never put secrets in them.
- **The first variable will be the backend URL,** for example `NEXT_PUBLIC_API_URL` (see [api-client.md](api-client.md)). If API calls go through Next.js instead, it can be a server-only variable.
- **Add each new variable** to the table above and to `.env.example` in the same PR.

## Open decisions

- Where production environment variables are set. Hosting isn't chosen yet.

## References

- [api-client.md](api-client.md)
- Backend: [configuration.md](../../backend/docs/configuration.md)
