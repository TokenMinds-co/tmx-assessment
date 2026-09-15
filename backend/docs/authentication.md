# Authentication

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

How staff sign in, how the API keeps them signed in and protects routes, and what each role can do. This includes staff invitations and password resets, which send email (see [email.md](email.md)). Candidate access links are planned here but not built yet. The frontend side is in the frontend's [authentication.md](../../frontend/docs/authentication.md).

## Current state

- **Staff sign in with email and password.** The backend is built and covered by e2e tests. The frontend isn't wired to it yet.
- **Code:** [src/auth/](../src/auth/). The controller is [auth.controller.ts](../src/auth/auth.controller.ts); sessions live in [sessions.service.ts](../src/auth/sessions.service.ts), sign-in and passwords in [auth.service.ts](../src/auth/auth.service.ts), invitations in [invitations.service.ts](../src/auth/invitations.service.ts), and the guards in [guards/](../src/auth/guards/).
- **Every route needs a session** unless it's marked `@Public()`. The public routes today are `GET /api`, sign-in, sign-out, forgot and reset password, and accepting an invitation.
- **No user management API yet.** There's no endpoint to list staff, change a role or deactivate someone. Until there is, do it in the database (`pnpm db:studio`).
- **Candidate links:** not started. See [Proposed approach](#proposed-approach-candidate-links).

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
- **Roles:** `ADMIN` (can invite staff) and `MEMBER`. Guard a route with `@Roles(UserRole.ADMIN)`.
- **Statuses:** `INVITED` (no password yet), `ACTIVE`, and `DEACTIVATED` (can't sign in; existing sessions stop working).
- **Invitation links last 7 days** and work once. Inviting someone who hasn't accepted yet sends a fresh link and cancels the old one.
- **The first admin comes from the command line:**

  ```bash
  pnpm auth:invite-admin --email anchor@tokenminds.co --name "Anchor"
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
- **CSRF:** the `SameSite=Lax` cookie, JSON-only bodies and an Origin check on writes. See [api-conventions.md](api-conventions.md).

### Wiring the frontend

What the frontend needs, for when we connect the two apps:

- **Pages the emails link to:** `/accept-invite?token=…` and `/reset-password?token=…`. The paths are set in [frontend-links.ts](../src/auth/frontend-links.ts). The frontend also needs `/login` and a forgot-password form.
- **Browser calls** need `credentials: 'include'`. Locally, the cookie from `localhost:4000` is also sent to `localhost:3000`, because cookies ignore the port.
- **In production,** serve the API on the frontend's origin (a Next.js rewrite from `/api/*` to the backend). The cookie is then first-party and `proxy.ts` can read it. If the API has to live on its own subdomain instead, set `COOKIE_DOMAIN` to the shared parent domain.
- **Server components and route handlers** forward the browser's cookie in a `Cookie` header, or send the token as a bearer token.
- **Having a cookie doesn't mean being signed in.** It can outlive an idle session. `proxy.ts` can use it to send signed-out users to `/login`, but shouldn't send anyone away from `/login` on the cookie alone; check `GET /api/auth/me`. On a 401, go to `/login`.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Staff sign-in method | Email and password | | Requested |
| Email provider | Resend | | Requested |
| Session model | Server-side sessions: a random token in an httpOnly cookie, its hash in Postgres. No JWTs. | Matches the frontend's plan for an httpOnly cookie. Signing out and deactivating take effect on the next request, which matters with candidate data. The frontend doesn't need a token-refresh flow. JWTs would still need a database lookup to be revocable. | Build default |
| Who can create accounts | Invite-only. Admins invite; the first admin comes from the CLI. | It's an internal app holding candidates' personal data, so open sign-up would let anyone in. | Build default |
| Roles | `ADMIN` and `MEMBER`. Every staff member can see everything for now. | Enough to protect invitations. Per-job access is still an open question. | Build default |
| Password hashing | Argon2id, OWASP baseline cost | OWASP's first choice. `@node-rs/argon2` ships prebuilt binaries, so pnpm 11 doesn't need to run a build script. | Build default |
| Password rule | 12 to 128 characters, no other rules | NIST SP 800-63B: length helps, composition rules don't. | Build default |
| Session lifetime | 7 days idle (configurable), 30 days at most | Staff don't sign in every day, but a lost laptop's session still ends. | Build default |
| Link lifetimes | Invitations 7 days, resets 60 minutes, each works once | Common defaults. A reset link is the riskier of the two. | Build default |
| After accepting an invitation | Signed in straight away | They've just set a password. | Build default |
| After a password reset | Every session ends; the user signs in again | A reset often follows a compromised account. | Build default |
| Passport | Not used; two small guards instead | One sign-in method and no JWTs, so Passport would only add dependencies. The [`security-auth-jwt`](../.agents/skills/nestjs-best-practices/rules/security-auth-jwt.md) rule doesn't apply without JWTs. | Build default |

## Proposed approach: candidate links

Not built yet. Unchanged from the original plan:

- **Candidates get a signed, expiring link** for each invitation instead of an account. The link only gives access to that candidate's assigned tests.
- **Rate-limit** the candidate link endpoints like the sign-in endpoint.

## Open decisions

- Roles: can every staff member see every candidate, or is access limited per job?
- How long a candidate link stays valid, and whether it can be reopened after the candidate starts.
- A user management API: list staff, change roles, deactivate. Today that's done in the database.
- Rate-limit storage once the API runs as more than one instance (for example Redis), since the in-memory limits are per instance.
- Whether to add Google Workspace sign-in or two-factor authentication later.
- Whether staff can see and end their own active sessions.

## References

- [email.md](email.md), [configuration.md](configuration.md), [database.md](database.md), [api-conventions.md](api-conventions.md)
- [assessments.md](assessments.md) (candidate invitations)
- Rules: [`security-use-guards`](../.agents/skills/nestjs-best-practices/rules/security-use-guards.md), [`security-rate-limiting`](../.agents/skills/nestjs-best-practices/rules/security-rate-limiting.md), [`security-validate-all-input`](../.agents/skills/nestjs-best-practices/rules/security-validate-all-input.md)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- Frontend: [authentication.md](../../frontend/docs/authentication.md), [api-client.md](../../frontend/docs/api-client.md)
