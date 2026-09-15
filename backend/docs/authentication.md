# Authentication

**Status:** Not started · **Last updated:** 2026-09-15

## Scope

How staff and candidates prove who they are, how the API protects routes, and what each user is allowed to do. The frontend side is in the frontend's [authentication.md](../../frontend/docs/authentication.md).

## Current state

None. Every route is public.

## Requirements

- **Staff** (the HR team and hiring managers) sign in to manage jobs, candidates, stages and results.
- **Candidates** only need to open and complete the assessments sent to them.
- The team member who owns each recruitment stage can change, so ownership is stored as data (see [recruitment-pipeline.md](recruitment-pipeline.md)), not as a fixed role.

## Proposed approach

- **Protect routes with guards,** and mark public routes explicitly. See [`security-use-guards`](../.agents/skills/nestjs-best-practices/rules/security-use-guards.md).
- **If the API issues JWTs,** follow [`security-auth-jwt`](../.agents/skills/nestjs-best-practices/rules/security-auth-jwt.md).
- **Candidates get a signed, expiring link** for each invitation instead of an account. The link only gives access to that candidate's assigned tests.
- **Rate-limit** the sign-in endpoint and the candidate link endpoints. See [`security-rate-limiting`](../.agents/skills/nestjs-best-practices/rules/security-rate-limiting.md).

## Open decisions

- Staff sign-in method: Google Workspace SSO, email and password, or magic link.
- Session model: JWT bearer tokens or an httpOnly session cookie. This depends on how the frontend calls the API (see the frontend's [api-client.md](../../frontend/docs/api-client.md)).
- Roles: can every staff member see every candidate, or is access limited per job?
- How long a candidate link stays valid, and whether it can be reopened after the candidate starts.

## References

- [configuration.md](configuration.md) (auth secrets)
- [assessments.md](assessments.md) (candidate invitations)
- Frontend: [authentication.md](../../frontend/docs/authentication.md)
