# Authentication

**Status:** In progress · **Last updated:** 2026-09-21

## Scope

How staff sign in, how the API keeps them signed in and protects routes, and what each role can do. This includes staff invitations and password resets, which send email (see [email.md](email.md)), and how candidates get in with a link instead of an account (see [Candidate links](#candidate-links)). The frontend side is in the frontend's [authentication.md](../../frontend/docs/authentication.md).

## Current state

- **Staff sign in with email and password.** The backend is built and covered by e2e tests, and the frontend is wired to it (see [How the frontend connects](#how-the-frontend-connects)).
- **Code:** [src/auth/](../src/auth/). The controller is [auth.controller.ts](../src/auth/auth.controller.ts); sessions live in [sessions.service.ts](../src/auth/sessions.service.ts), sign-in and passwords in [auth.service.ts](../src/auth/auth.service.ts), invitations in [invitations.service.ts](../src/auth/invitations.service.ts), and the guards in [guards/](../src/auth/guards/).
- **Every route needs a session** unless it's marked `@Public()`. The public routes today are `GET /api`, the [health checks](operations.md#health-checks), sign-in, sign-out, forgot and reset password, accepting an invitation, downloading media (`GET /api/media/:id`), and the candidate routes under `/api/take/:token`.
- **To try the endpoints in a browser,** use the [API docs](api-conventions.md#api-docs) at `/api/docs`.
- **No user management API yet.** There's no endpoint to list staff, change a role or deactivate someone. Until there is, do it in the database (`pnpm db:studio`).
- **Candidate links** are built, with the assessments. See [Candidate links](#candidate-links).

## Requirements

- **Staff** (the HR team and hiring managers) sign in to manage jobs, candidates, stages and results.
- Staff sign in with **email and password**.
- Account emails (invitations and password resets) are sent with **Resend**.
- **Candidates** only need to open and complete the assessments sent to them.
- The team member who owns each recruitment stage can change, so ownership is stored as data (see [recruitment-pipeline.md](recruitment-pipeline.md)), not as a fixed role.

## How it works

### Endpoints

All paths start with `/api` (see [api-conventions.md](api-conventions.md)). Rate limits are per IP address.

| Method | Path | Who | Body | Success |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Anyone (10 a minute) | `{ email, password }` | `200 { user }` and sets the session cookie |
| `POST` | `/api/auth/logout` | Anyone | None | `204` and clears the cookie, even if the session already ended |
| `GET` | `/api/auth/me` | Signed in | None | `200 { user }` |
| `POST` | `/api/auth/password/change` | Signed in (10 per 15 minutes) | `{ currentPassword, newPassword }` | `204`. Signs out the user's other sessions |
| `POST` | `/api/auth/password/forgot` | Anyone (5 per 15 minutes) | `{ email }` | `202` whether or not the account exists |
| `POST` | `/api/auth/password/reset` | Anyone (10 per 15 minutes) | `{ token, password }` | `204`. Signs out every session |
| `POST` | `/api/auth/invitations` | Admins | `{ email, name, role? }` | `201 { user, expiresAt }` |
| `POST` | `/api/auth/invitations/accept` | Anyone (10 per 15 minutes) | `{ token, password, name? }` | `200 { user }` and sets the session cookie |

`user` is `{ id, email, name, role, status, lastLoginAt, createdAt }`, built by [`UserResponseDto`](../src/auth/dto/user-response.dto.ts). It never includes the password hash. `role` defaults to `MEMBER` on invitations.

Errors use the shape in [api-conventions.md](api-conventions.md). The messages the frontend will see:

| Status | Message | When |
| --- | --- | --- |
| 400 | A list of field messages, such as `Password must be at least 12 characters.` | The body failed validation |
| 400 | `This link is invalid or has expired.` | An invitation or reset token is unknown, used or expired |
| 400 | `Current password is incorrect.` | Changing the password |
| 401 | `Invalid email or password.` | Sign-in. The same message whether the email or the password is wrong |
| 401 | `Sign in to continue.` / `Your session has ended. Sign in again.` | No session, or it ended |
| 403 | `This account has been deactivated.` | Sign-in with the right password on a deactivated account |
| 403 | `You do not have permission to do this.` | Wrong role |
| 409 | `A user with this email already exists.` | Inviting an email that already has an account |
| 429 | `ThrottlerException: Too Many Requests` | Rate limit hit |
| 503 | `The invitation was saved, but the email could not be sent. …` | Resend failed. Inviting the same email again retries |

### Sessions

- **Signing in creates a row in `sessions`** and puts a random 256-bit token in an httpOnly cookie called `tmx_hr_session`. The database stores only the token's SHA-256 hash.
- **Cookie settings:** `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, and `Domain` only if `COOKIE_DOMAIN` is set.
- **Idle timeout:** a session ends after `SESSION_TTL_DAYS` (default 7) without use. Using the app pushes the timeout forward, at most once an hour to limit database writes.
- **Hard limit:** every session ends 30 days after sign-in, however active. The cookie expires at that point too, so the server alone enforces the shorter idle timeout.
- **Every request checks the database** for the session and its user. When the session has ended, or the user isn't `ACTIVE`, the API answers 401 and clears the cookie. Signing out, changing or resetting a password, and deactivating a user all take effect on the next request.
- **Server-side callers,** such as Next.js server components, can send the token as `Authorization: Bearer <token>` instead of the cookie.

### Accounts and roles

- **Staff accounts are invite-only.** An admin invites someone by email; they open the link, set a password, and are signed in.
- **Roles:** `ADMIN` (can invite staff, edit tests, and import and upload files) and `MEMBER`. Guard a route with [`@AdminOnly()`](../src/auth/decorators/admin-only.decorator.ts), which adds `@Roles(UserRole.ADMIN)` and documents the 403 in the API docs, or with `@Roles(...)` directly.
- **Statuses:** `INVITED` (no password yet), `ACTIVE`, and `DEACTIVATED` (can't sign in; existing sessions stop working).
- **Invitation links last 7 days** and work once. Inviting someone who hasn't accepted yet sends a fresh link and cancels the old one.
- **The first admin comes from the command line:**

  ```bash
  pnpm auth:invite-admin --email admin@example.com --name "Admin Name"
  ```

  It builds the app, runs [src/cli/invite-admin.ts](../src/cli/invite-admin.ts), emails the invitation and prints the link, so it works before Resend is set up. In a deployed environment, run `node dist/cli/invite-admin --email … --name …`.

### Passwords

- **Hashing:** Argon2id with OWASP's baseline cost (19 MiB of memory, 2 iterations, 1 thread), using `@node-rs/argon2`. See [password.service.ts](../src/auth/password.service.ts).
- **The only rule is length:** 12 to 128 characters. Sign-in doesn't check the minimum, so raising it later won't lock anyone out.
- **No account enumeration.** An unknown email still runs a hash check, so sign-in takes the same time either way. Forgot-password always answers 202 and does its work after the response.
- **Reset links last 60 minutes** and work once. Asking again cancels the previous link.
- **Security notice:** after a change or reset, the user gets a "your password was changed" email.

### Protecting routes

Both guards are global, registered in [auth.module.ts](../src/auth/auth.module.ts):

- `SessionAuthGuard` requires a session unless the route or controller has `@Public()`.
- `RolesGuard` checks `@Roles(...)`.

```ts
@Roles(UserRole.ADMIN)
@Post()
create(@CurrentUser() user: AuthUser, @Body() dto: CreateJobDto) {
  // user is { id, email, name, role, sessionId }
}
```

### Abuse protection

- **Rate limits** use `@nestjs/throttler`, tracked per IP in memory: 100 requests a minute on every route, and the tighter limits in the endpoint table. Behind a load balancer, set `TRUST_PROXY` so the real client IP is used (see [configuration.md](configuration.md)).
- **CSRF:** the `SameSite=Lax` cookie, JSON bodies (multipart only on two admin upload routes) and an Origin check on writes. See [api-conventions.md](api-conventions.md).

### Candidate links

Candidates don't get accounts. The token in their link is their access. What the links do is in [assessments.md](assessments.md#candidate-links).

- **Each send gets one link,** `/take/<token>`, where the token has 256 bits of randomness. The database stores only its SHA-256 hash, as with sessions ([tokens.ts](../src/common/tokens.ts)).
- **The candidate routes are public** (`@Public()`) and guarded by [`InvitationTokenGuard`](../src/assessments/guards/invitation-token.guard.ts), which finds the link by the token's hash. A link only reaches its own tests.
- **Unknown, malformed or revoked links** answer 404. Expired links answer 410, unless a test is still running.
- **Links last 14 days by default** (1 to 60) and can be reopened until then, including to continue a test already started. Resending makes a new token, so the old link stops working; revoking ends it at once.
- **Rate limits** are per IP and route: 60 a minute to open the link, 30 to start or submit a test, and 300 to save answers.
- **Media is public by id** (`GET /api/media/:id`), so a candidate's browser can play question audio without a session.

### How the frontend connects

The frontend uses every endpoint above except changing a password and inviting staff, which have no screens yet. Its side is in the frontend's [authentication.md](../../frontend/docs/authentication.md) and [api-client.md](../../frontend/docs/api-client.md).

- **The pages the emails link to** are `/accept-invite?token=…`, `/reset-password?token=…` and, for candidates, `/take/<token>`, set in [frontend-links.ts](../src/common/frontend-links.ts). Keep the two apps in step.
- **The frontend serves the API on its own origin,** in development too: a Next.js rewrite forwards `/api/*` to the backend (the frontend's `API_URL`). Browser calls are same-origin, and the session cookie is first-party on the frontend's origin, where its `proxy.ts` can read it. Leave `COOKIE_DOMAIN` empty. The frontend doesn't need CORS; the allowlist still guards any other browser caller.
- **`FRONTEND_URL` must be the frontend's public origin.** The browser's `Origin` header passes through the rewrite, so with any other value the Origin check turns every sign-in down with `403 Cross-origin request blocked.`
- **Server components send the token as `Authorization: Bearer`,** read from the cookie, to `GET /api/auth/me`.
- **A cookie doesn't mean a session.** The frontend's `proxy.ts` only sends visitors without the cookie to `/login`. Staff pages confirm the session with `GET /api/auth/me`, and the sign-in page skips its form only when that call succeeds.
- **Rate limits behind the rewrite.** The API sees the Next.js server as the client: Next.js doesn't add `X-Forwarded-For` when it forwards a rewrite, though it passes on one it receives. Locally, every browser shares one bucket. In production, put a proxy or load balancer that sets `X-Forwarded-For` in front of the frontend, and set `TRUST_PROXY=1` here, so the Next.js server is the one trusted hop.

## Decisions

"Requested" means the maintainers asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Staff sign-in method | Email and password | | Requested |
| Email provider | Resend | | Requested |
| Session model | Server-side sessions: a random token in an httpOnly cookie, its hash in Postgres. No JWTs. | Matches the frontend's plan for an httpOnly cookie. Signing out and deactivating take effect on the next request, which matters with candidate data. The frontend doesn't need a token-refresh flow. JWTs would still need a database lookup to be revocable. | Build default |
| Who can create accounts | Invite-only. Admins invite; the first admin comes from the CLI. | It's an internal app holding candidates' personal data, so open sign-up would let anyone in. | Build default |
| Roles | `ADMIN` and `MEMBER`. Admins also edit tests. Every staff member can see everything, send tests and read results for now. | Enough to protect invitations and the shared tests. Per-job access is still an open question. | Build default |
| Password hashing | Argon2id, OWASP baseline cost | OWASP's first choice. `@node-rs/argon2` ships prebuilt binaries, so pnpm 11 doesn't need to run a build script. | Build default |
| Password rule | 12 to 128 characters, no other rules | NIST SP 800-63B: length helps, composition rules don't. | Build default |
| Session lifetime | 7 days idle (configurable), 30 days at most | Staff don't sign in every day, but a lost laptop's session still ends. | Build default |
| Link lifetimes | Invitations 7 days, resets 60 minutes, each works once | Common defaults. A reset link is the riskier of the two. | Build default |
| After accepting an invitation | Signed in straight away | They've just set a password. | Build default |
| After a password reset | Every session ends; the user signs in again | A reset often follows a compromised account. | Build default |
| Candidate access (link lifetime was open) | A link with a random token in its path, no account. Only the token's hash is stored. It lasts 14 days by default and can be reopened until then. Details in [assessments.md](assessments.md#decisions). | Candidates only reach the tests they were sent, and a hashed token can't be read back from the database. | Build default |
| Passport | Not used; two small guards instead | One sign-in method and no JWTs, so Passport would only add dependencies. The [`security-auth-jwt`](../.agents/skills/nestjs-best-practices/rules/security-auth-jwt.md) rule doesn't apply without JWTs. | Build default |

## Open decisions

- Roles: can every staff member see every candidate, or is access limited per job?
- A user management API: list staff, change roles, deactivate. Today that's done in the database.
- Rate-limit storage once the API runs as more than one instance (for example Redis), since the in-memory limits are per instance.
- Real client IPs for rate limits behind the frontend's rewrite, once hosting is chosen (see [How the frontend connects](#how-the-frontend-connects)).
- Whether to add Google Workspace sign-in or two-factor authentication later.
- Whether staff can see and end their own active sessions.

## References

- [email.md](email.md), [configuration.md](configuration.md), [database.md](database.md), [api-conventions.md](api-conventions.md)
- [assessments.md](assessments.md#candidate-links) (candidate links)
- Rules: [`security-use-guards`](../.agents/skills/nestjs-best-practices/rules/security-use-guards.md), [`security-rate-limiting`](../.agents/skills/nestjs-best-practices/rules/security-rate-limiting.md), [`security-validate-all-input`](../.agents/skills/nestjs-best-practices/rules/security-validate-all-input.md)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- Frontend: [authentication.md](../../frontend/docs/authentication.md), [api-client.md](../../frontend/docs/api-client.md)
