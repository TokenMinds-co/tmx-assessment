# Authentication

**Status:** In progress (screens only) · **Last updated:** 2026-09-15

## Scope

The sign-in screens, how the browser holds the session, protecting staff pages and server-side data access, and how candidate links open tests. The API side (endpoints, sessions, roles and password rules) is in the backend's [authentication.md](../../backend/docs/authentication.md).

## Current state

- **The backend's staff auth is built:** email and password, invite-only accounts and server-side sessions. See the backend doc. **The frontend isn't wired to it yet.**
- **The screens exist, as UI only:**

| Route | File | Backend endpoint | What it does today |
| --- | --- | --- | --- |
| `/login` | [login-form.tsx](<../app/(auth)/login/_components/login-form.tsx>) | `POST /api/auth/login` | Checks both fields are filled in and the email looks valid, then goes to the dashboard. Nothing is checked against an account. |
| `/forgot-password` | [forgot-password-form.tsx](<../app/(auth)/forgot-password/_components/forgot-password-form.tsx>) | `POST /api/auth/password/forgot` | Checks the email, then shows "Check your inbox". No email is sent. |
| `/reset-password?token=…` | [reset-password-form.tsx](<../app/(auth)/reset-password/_components/reset-password-form.tsx>) | `POST /api/auth/password/reset` | Checks the new password (12 to 128 characters) and its confirmation, then shows "Password updated". |
| `/accept-invite?token=…` | [accept-invite-form.tsx](<../app/(auth)/accept-invite/_components/accept-invite-form.tsx>) | `POST /api/auth/invitations/accept` | Same password checks, plus an optional name, then goes to the dashboard, because the backend signs the new user straight in. |

- **Without a token,** `/reset-password` and `/accept-invite` show [invalid-link.tsx](../components/shared/invalid-link.tsx). Any token shows the form, so `?token=preview` works for a look.
- **Shared pieces:** [auth-card.tsx](../components/shared/auth-card.tsx) (the card), [password-input.tsx](../components/shared/password-input.tsx) (the show/hide toggle), [new-password-fields.tsx](../components/shared/new-password-fields.tsx) (password plus confirmation) and [validation.ts](../lib/validation.ts) (the email check and the password length).
- **No session and no protected routes.** Every page opens without signing in. The account menu shows a sample user, and "Sign out" just links to `/login`.

## Requirements

- **Staff sign in with email and password.** Decided by the user on 2026-09-15. No Google sign-in.
- Staff can reset a forgotten password with a link sent by email.
- Candidates don't sign in. They open a link (see [assessments.md](assessments.md)).

## How it works

- **The forms check only what the backend would reject on sight:** an empty or malformed email, a password outside 12 to 128 characters, or a confirmation that doesn't match. The message appears under the field. The backend stays the authority and returns its own messages; see the error table in its doc.
- **Forgot password never reveals who has an account.** The confirmation reads the same either way, matching the backend, which always answers `202`.
- **The token rides in a hidden field** on the reset and invitation forms, ready to send with the new password.
- **The sign-in page says "No account? Ask an admin to invite you."** There's no sign-up page, because accounts are invite-only.

### Wiring the screens to the backend

The backend's [Wiring the frontend](../../backend/docs/authentication.md#wiring-the-frontend) section covers cookies, `credentials: 'include'` and the production proxy. On this side:

1. **`handleSubmit` in each form:** call the endpoint in the table above. Show field messages under their fields, and anything else (`Invalid email or password.`, `This account has been deactivated.`, rate limits) in an `Alert variant="destructive"` above the fields.
2. **Reset and invitation links:** when the backend answers `This link is invalid or has expired.`, show `InvalidLink` instead of the form.
3. **Protect the `(app)` routes:** add `proxy.ts` to send visitors without a `tmx_hr_session` cookie to `/login`, and confirm the session with `GET /api/auth/me` in the data layer, since a cookie can outlive its session.
4. **Account menu:** replace `SAMPLE_USER` in [user-menu.tsx](../components/shared/user-menu.tsx) with the user from `GET /api/auth/me`, and make "Sign out" call `POST /api/auth/logout`.

## Proposed approach

For the parts not built yet, following the Next.js 16 authentication guide:

- **Check auth close to the data.** A small data access layer (for example `verifySession()`) runs in server components, server actions and route handlers before they load or change data. See [`server-auth-actions`](../.agents/skills/vercel-react-best-practices/rules/server-auth-actions.md).
- **Use `proxy.ts` only for quick redirects.** Next.js 16 renamed Middleware to Proxy. It runs on every route, including prefetches, so it should only read the cookie and never call the API or the database.
- **Candidate pages** authenticate with the token in the link, which the backend verifies.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Staff sign-in method | Email and password, no Google | | Requested |
| Sign-up page | None | Accounts are invite-only | Build default (backend) |
| Which screens | Sign in, forgot password, reset password and accept invitation | The backend's emails link to the reset and invitation pages | Build default |
| Password length in the forms | 12 to 128 characters | Matches the backend's only password rule | Build default (backend) |
| Where the session lives | An httpOnly `tmx_hr_session` cookie set by the API | Page scripts can't read it | Build default (backend) |
| Show/hide password toggle | On every password field | Fewer typos in long passwords | Build default |
| Field checks | In the browser, with the message under the field (`noValidate`, so no browser bubbles) | Shows the designed error states, and the backend still checks everything | Build default |
| Until the API is wired | A valid sign-in or invitation goes to the dashboard, and "Sign out" links to `/login` | The screens can be clicked through end to end in the meantime | Build default |

## Open decisions

- Where sign-in lands: always the dashboard, or back on the page that sent the user to `/login`.
- Screens the backend supports that the UI doesn't have yet: changing your password, and inviting staff (for admins).

## References

- Next.js 16 docs: `node_modules/next/dist/docs/01-app/02-guides/authentication.md` and `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- [routing.md](routing.md)
- [api-client.md](api-client.md)
- [design-system.md](design-system.md)
- Backend: [authentication.md](../../backend/docs/authentication.md), [api-conventions.md](../../backend/docs/api-conventions.md)
