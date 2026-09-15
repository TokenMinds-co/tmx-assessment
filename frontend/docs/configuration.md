# Configuration

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

Environment variables, `next.config.ts`, ports and TypeScript path aliases. shadcn/ui's settings in `components.json` are covered in [design-system.md](design-system.md).

## Current state

- [next.config.ts](../next.config.ts) sets one value, `NEXT_PUBLIC_APP_VERSION`, from `version` in [package.json](../package.json).
- The dev server runs on port 3000, the Next.js default. The backend runs on 4000; see the backend's [configuration.md](../../backend/docs/configuration.md).
- Path alias: `@/*` points to the frontend root ([tsconfig.json](../tsconfig.json)), so `@/lib/format` resolves to `lib/format.ts`, and `@/public/brand/tmx-mark.png` imports a static image.
- `.gitignore` ignores every `.env*` file. That also catches `.env.example`, so add `!.env.example` to `.gitignore` before committing one.

### Environment variables

| Variable | Reaches the browser | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_VERSION` | Yes | The version shown in the sidebar footer. Set in `next.config.ts` from `package.json`, so don't add it to `.env`. |

## Proposed approach

- **Only variables prefixed with `NEXT_PUBLIC_` reach the browser.** Never put secrets in them.
- **The next variable will be the backend URL,** for example `NEXT_PUBLIC_API_URL` (see [api-client.md](api-client.md)). If API calls go through Next.js instead, it can be a server-only variable.
- **Add each new variable** to the table above and to `.env.example` in the same PR.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| App version in the UI | `NEXT_PUBLIC_APP_VERSION`, set from `package.json` in `next.config.ts` | One source, so the sidebar never shows a stale version | Build default |

## Open decisions

- Where production environment variables are set. Hosting isn't chosen yet.

## References

- [api-client.md](api-client.md)
- [design-system.md](design-system.md)
- Backend: [configuration.md](../../backend/docs/configuration.md)
