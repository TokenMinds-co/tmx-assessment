# Authentication

**Status:** In progress (staff sign-in and candidate links done) · **Last updated:** 2026-09-21

## Scope

The sign-in screens, how the browser holds the session, protecting staff pages and server-side data access, and how candidate links open tests. The API side (endpoints, sessions, roles and password rules) is in the backend's [authentication.md](../../backend/docs/authentication.md). How the frontend calls the API is in [api-client.md](api-client.md).

## Current state

- **Staff sign-in is wired to the backend,** end to end: signing in and out, forgot and reset password, and accepting an invitation. Every staff page needs a live session. Checked in a browser against a local backend on 2026-09-15.
- **Candidate links are built:** `/take/<token>` opens without a session. See [Candidate links](#candidate-links).
- **Not built yet:** screens for changing your password and for inviting staff. The backend has both endpoints.

| Screen | File | Backend endpoint | What it does |
| --- | --- | --- | --- |
| `/login` | [login-form.tsx](<../app/(auth)/login/_components/login-form.tsx>) | `POST /api/auth/login` | Signs in, then opens the page in `?next=` or the dashboard. A signed-in visitor skips the form. |
| `/forgot-password` | [forgot-password-form.tsx](<../app/(auth)/forgot-password/_components/forgot-password-form.tsx>) | `POST /api/auth/password/forgot` | Asks for a reset email, then shows "Check your inbox", whether or not the account exists. |
| `/reset-password?token=…` | [reset-password-form.tsx](<../app/(auth)/reset-password/_components/reset-password-form.tsx>) | `POST /api/auth/password/reset` | Sets the new password, then shows "Password updated" and a link to sign in. |
| `/accept-invite?token=…` | [accept-invite-form.tsx](<../app/(auth)/accept-invite/_components/accept-invite-form.tsx>) | `POST /api/auth/invitations/accept` | Sets the password and, if given, a new name, then opens the dashboard: the API signs the new user in. |
| Account menu | [user-menu.tsx](../components/shared/user-menu.tsx) | `POST /api/auth/logout` | Shows the signed-in user's name and email, and signs out. |

- **Code:** [lib/api/auth.ts](../lib/api/auth.ts) holds the endpoint calls and the `User` type. [lib/session.ts](../lib/session.ts) is the server-side session check, [proxy.ts](../proxy.ts) the redirect for signed-out visitors, and [lib/sign-in-redirect.ts](../lib/sign-in-redirect.ts) builds and checks the `?next=` link.
- **Shared pieces:** [auth-card.tsx](../components/shared/auth-card.tsx) (the card), [password-input.tsx](../components/shared/password-input.tsx) (the show/hide toggle), [new-password-fields.tsx](../components/shared/new-password-fields.tsx) (password plus confirmation), [form-error.tsx](../components/shared/form-error.tsx) (the API's message above the fields), [submit-button.tsx](../components/shared/submit-button.tsx) (the busy state), [invalid-link.tsx](../components/shared/invalid-link.tsx) and [validation.ts](../lib/validation.ts) (the email check and the password length).

## Requirements

- **Staff sign in with email and password.** Decided by the user on 2026-09-15. No Google sign-in.
- Staff can reset a forgotten password with a link sent by email.
- Candidates don't sign in. They open a link (see [assessments.md](assessments.md)).

## How it works

### Signing in and out

- **The browser calls `/api/auth/*` on the frontend's own origin,** and Next.js forwards the request to the backend (see [api-client.md](api-client.md)). So the API's `tmx_assessment_session` cookie is set on the frontend's origin, httpOnly and `SameSite=Lax`. Page scripts can't read it.
- **After signing in,** the form opens the page in `?next=` if it's on this site, and otherwise the dashboard. `pathAfterSignIn()` drops any value that resolves to another origin, such as `//evil.example`, so a crafted link can't send someone elsewhere after they sign in.
- **Signing out** calls `POST /api/auth/logout`, then loads `/login` as a full page. That drops everything the session left in the browser's memory, including the router cache that Back would restore. If the call fails, the menu stays open and says so.
- **Accepting an invitation** signs the new user in, and they land on the dashboard.
- **A password reset** ends every session, including this browser's, and the user signs in again with the new password.

### Protecting staff pages

Two layers, following the Next.js 16 authentication guide:

1. **[proxy.ts](../proxy.ts)** runs before every page. If there's no `tmx_assessment_session` cookie, it redirects to `/login?next=<the page>`, or plain `/login` for the dashboard. It lets through the four sign-in pages, anything under `/take/` (`PUBLIC_PREFIXES`), `/api/*` (where the backend answers 401 itself), Next.js's own files, and files with an extension. It only reads the cookie and never calls the API, because it runs on every request, prefetches included.
2. **[lib/session.ts](../lib/session.ts)** asks the API. `getCurrentUser()` sends the cookie's token to `GET /api/auth/me` as a bearer token, with a 10-second timeout. It returns the user, or null on a 401, and React's `cache()` keeps it to one call per request. `requireUser()` redirects to `/login` when there's no user. The [(app) layout](<../app/(app)/layout.tsx>) calls it, so an ended session never renders the shell. The layout passes only the name and email to the account menu.

- **A cookie doesn't mean a session.** It can outlive one: sessions end after 7 idle days, and a reset signs everyone out. With such a cookie, proxy.ts lets the request through, the layout's check fails, and the user lands on `/login`. The sign-in page asks the API too, so there's no redirect loop.
- **A signed-in visitor skips `/login`.** The page asks the API, then redirects to `?next=` or the dashboard. If the API can't be reached, it shows the form anyway.
- **Layouts don't re-render on client-side navigation.** A server component, server action or route handler that loads or changes staff data must call `requireUser()` itself, not rely on the layout. The dashboard calls it, then its client component fetches the numbers in the browser. The assessment pages do the same.
- **If the API is down,** staff pages show Next.js's default error page ("This page couldn’t load"), and signing in says "Something went wrong on our side. Try again in a moment."

### Forms

- **The forms first check what the backend would reject on sight:** an empty or malformed email, a password outside 12 to 128 characters, or a confirmation that doesn't match. The message appears under the field, and nothing is sent.
- **The API's answer appears in an alert above the fields,** such as `Invalid email or password.` or `This account has been deactivated.` The API's validation messages don't name a field, so they go there too. Messages the API doesn't word for people, such as its rate-limit message, are replaced (see [api-client.md](api-client.md#errors)).
- **A reset or invitation link that the API turns down** as unknown, used or expired (`This link is invalid or has expired.`) swaps the form for the same "doesn't work" card as a link with no token: [invalid-reset-link.tsx](<../app/(auth)/reset-password/_components/invalid-reset-link.tsx>) and [invalid-invite-link.tsx](<../app/(auth)/accept-invite/_components/invalid-invite-link.tsx>).
- **While a request runs,** the submit button is disabled and shows a spinner and a label such as "Signing in…". After signing in or accepting an invitation, it stays busy until the next page has loaded.
- **Forgot password never reveals who has an account.** The confirmation reads the same either way, matching the backend, which always answers `202`.
- **The sign-in page says "No account? Ask an admin to invite you."** There's no sign-up page, because accounts are invite-only.

### Candidate links

- **Candidates don't sign in.** `/take/<token>` is public: proxy.ts lets anything under `/take/` through, and the page calls the API with the token in the path, which the backend checks on every call (see the backend's [authentication.md](../../backend/docs/authentication.md#candidate-links)).
- **A link the API turns down** gets its own message: unknown or revoked (404), or expired (410).
- **Candidate pages send no referrer,** so the token in the address never reaches another site.
- **The staff preview isn't public.** `/preview/[assessmentId]` looks like a candidate page, but proxy.ts sends signed-out visitors to sign in, and the page calls `requireUser()` before it loads the test with `serverApiFetch()`.

### A 401 in the browser

Staff screens fetch in the browser with TanStack Query. A 401 from any query or mutation means the session ended, so [app/providers.tsx](../app/providers.tsx) loads `/login?next=<this page>` as a full page, and signing in returns there. Pages under `/take/` are skipped, since the link is the candidate's access.

### Trying it locally

1. Start the backend and the frontend, with `API_URL` in the frontend's `.env` set to the backend's address (see the [root README](../../README.md#quick-start)).
2. In `backend/`, invite yourself: `pnpm auth:invite-admin --email you@example.com --name "Your Name"`. It prints the link. While the backend's `RESEND_API_KEY` is empty, emails, including reset links, are printed in the backend's terminal instead of sent.
3. Open the link, choose a password, and you land on the dashboard, signed in.

## Decisions

"Requested" means the maintainers asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Staff sign-in method | Email and password, no Google | | Requested |
| Sign-up page | None | Accounts are invite-only | Build default (backend) |
| Which screens | Sign in, forgot password, reset password and accept invitation | The backend's emails link to the reset and invitation pages | Build default |
| Password length in the forms | 12 to 128 characters | Matches the backend's only password rule | Build default (backend) |
| Where the session lives | An httpOnly `tmx_assessment_session` cookie set by the API, on the frontend's origin through the `/api` rewrite | Page scripts can't read it, and proxy.ts can | Build default (backend) |
| Show/hide password toggle | On every password field | Fewer typos in long passwords | Build default |
| Field checks | In the browser, with the message under the field (`noValidate`, so no browser bubbles) | Shows the designed error states, and the backend still checks everything | Build default |
| Protecting staff pages | proxy.ts redirects when there's no cookie, and the (app) layout confirms the session with `GET /api/auth/me` | The Next.js 16 guide: proxy for quick, optimistic redirects, and the real check close to the data. A cookie can outlive its session. | Build default |
| How server code sends the session | The cookie's token as `Authorization: Bearer` | The backend accepts it, and it forwards only the session, not the browser's other cookies | Build default |
| Where sign-in lands | The page in `?next=` when it's on this site, otherwise the dashboard | Someone sent to sign in from a link ends up where the link pointed. Off-site values are ignored, so the parameter can't be used as an open redirect. | Build default |
| Signed-in visitors on `/login` | Sent on to `?next=` or the dashboard, once the API confirms the session | The backend's rule: never redirect on the cookie alone | Build default |
| Where the API's errors show | In an alert above the fields; the browser's own checks stay under each field | The API's validation messages don't say which field they're about | Build default |
| A rejected reset or invitation link | The same "doesn't work" card as a missing token, matched on the API's exact message | The backend has no error codes yet (an open decision in its [api-conventions.md](../../backend/docs/api-conventions.md)). If the wording changes, the message shows in the alert instead. | Build default |
| Busy state | The submit button is disabled, with a spinner, until the next page loads | Stops double submits and shows that something is happening | Build default |
| Signing out | A full page load to `/login` after the API call | Clears the router cache, so Back can't show staff pages from the ended session | Build default |
| Session check timeout | 10 seconds | A hung API shouldn't hang every page | Build default |
| Candidate pages | Public under `/take/`, with the token in the path checked by the API on every call | Candidates have no accounts. proxy.ts only has to match a prefix. | Build default |
| A 401 in the browser (was open) | A full page load to `/login?next=…`, except on candidate pages | The session has ended, and a full load clears what it left in memory. Signing in returns to the same page. | Build default |

## Open decisions

- Screens the backend supports that the UI doesn't have yet: changing your password, and inviting staff (for admins).
- An error page for when the API can't be reached, instead of Next.js's default one.

## References

- Next.js 16 docs: `node_modules/next/dist/docs/01-app/02-guides/authentication.md` and `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- [api-client.md](api-client.md), [routing.md](routing.md), [configuration.md](configuration.md), [design-system.md](design-system.md)
- Backend: [authentication.md](../../backend/docs/authentication.md), [api-conventions.md](../../backend/docs/api-conventions.md)
