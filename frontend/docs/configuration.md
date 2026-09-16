# Configuration

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

Environment variables, `next.config.ts`, ports and TypeScript path aliases. shadcn/ui's settings in `components.json` are covered in [design-system.md](design-system.md).

## Current state

- [next.config.ts](../next.config.ts) sets `NEXT_PUBLIC_APP_VERSION` from `version` in [package.json](../package.json), and rewrites `/api/*` to the backend at `API_URL` (see [api-client.md](api-client.md)).
- [.env.example](../.env.example) is committed and lists every variable. Copy it to `.env`. Every other `.env*` file is gitignored; `.gitignore` makes an exception for `.env.example` only.
- The dev server runs on port 3000, the Next.js default. The backend runs on 4000 by default; see the backend's [configuration.md](../../backend/docs/configuration.md).
- Path alias: `@/*` points to the frontend root ([tsconfig.json](../tsconfig.json)), so `@/lib/format` resolves to `lib/format.ts`, and `@/public/brand/tmx-mark.png` imports a static image.

### Environment variables

| Variable | Required | Reaches the browser | Purpose |
| --- | --- | --- | --- |
| `API_URL` | In production | No | The backend's origin with no trailing slash, such as `http://localhost:4000`. The `/api/*` rewrite forwards there, and server components call it directly. Development falls back to `http://localhost:4000`. Read by [lib/api/url.ts](../lib/api/url.ts). |
| `NEXT_PUBLIC_APP_VERSION` | No | Yes | The version shown in the sidebar footer. Set in `next.config.ts` from `package.json`, so don't add it to `.env`. |

## How it works

- **Only variables prefixed with `NEXT_PUBLIC_` reach the browser.** Never put secrets in them. `API_URL` stays on the server, because the browser always calls `/api/*` on the frontend's own origin.
- **`API_URL` is read at two different times.** At build time, Next.js writes the `/api/*` rewrite into the build. At run time, server-side calls read it. So set it both when you build and when you run. Without it, a production build fails with "API_URL is not set", and so does every server-side call on a production server, instead of quietly calling `localhost`.
- **After changing `API_URL`, restart `pnpm dev`,** so the `/api` rewrite picks up the new address.
- **Add each new variable** to the table above and to `.env.example` in the same PR.

### Troubleshooting

| Symptom | Cause |
| --- | --- |
| Signing in says "Something went wrong on our side", and staff pages show an error | The backend isn't running, or `API_URL` points at the wrong port. The backend's `PORT` and the frontend's `API_URL` must match. |
| Signing in says "Cross-origin request blocked." | The backend's `FRONTEND_URL` isn't the address you opened the frontend on. `http://127.0.0.1:3000` and `http://localhost:3000` count as different origins. |

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| App version in the UI | `NEXT_PUBLIC_APP_VERSION`, set from `package.json` in `next.config.ts` | One source, so the sidebar never shows a stale version | Build default |
| The backend's address | `API_URL`, a server-only variable | The browser never needs it: it calls `/api/*` on the frontend's origin | Build default |
| When `API_URL` isn't set | `http://localhost:4000` in development; an error in production | Matches the backend's default port. A production build that silently pointed at `localhost` would only fail once deployed. | Build default |
| Which env file | Copy `.env.example` to `.env` | The same step as in the backend. `.env.local` works too. | Build default |

## Open decisions

- Where production environment variables are set. Hosting isn't chosen yet.

## References

- [api-client.md](api-client.md)
- [design-system.md](design-system.md)
- Next.js 16 docs: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` and `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.md`
- Backend: [configuration.md](../../backend/docs/configuration.md)
