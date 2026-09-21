# Summary

What this changes, and why. The "why" is the part a reviewer can't reconstruct from the diff.

## Related issue

Closes #

## Type of change

- [ ] `feat` — new behaviour
- [ ] `fix` — a bug fix
- [ ] `refactor` — no change in behaviour
- [ ] `docs` — documentation only
- [ ] `chore` / `ci` — tooling, dependencies, pipelines
- [ ] Breaking change (an API, a database migration or an environment variable that existing
      deployments have to act on)

## Which package

- [ ] `backend`
- [ ] `frontend`
- [ ] Repository-level (docs, CI, config)

## How it was checked

Say what you ran and what you clicked through. Screenshots for anything visual, before and
after where it helps.

## Checklist

- [ ] `pnpm test` passes in `backend/`, if I changed it (the unit tests need no database; the
      frontend has no test suite yet)
- [ ] `pnpm test:e2e` passes, if I touched the backend's behaviour or its endpoints
- [ ] New behaviour has tests
- [ ] `pnpm lint` passes, and `pnpm format` has been run on the backend
- [ ] `pnpm build` passes in each package I changed
- [ ] **The relevant area doc is updated** (`backend/docs/` or `frontend/docs/`), including
      its status line and date
- [ ] **Any design choice I made while building is a row in that doc's Decisions table**, with
      the reason, marked `Build default`. If this answers something under "Open decisions",
      that line moved into the table.
- [ ] **That package's `docs/CHANGELOG.md` has an entry under `[Unreleased]`**, in the right
      group, linking the area doc
- [ ] The status table in that package's README is up to date, if the area moved forward
- [ ] Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`)
- [ ] No secrets, `.env` values or real candidate data anywhere in the diff, the description
      or the screenshots
- [ ] Prisma migrations are committed, and no already-merged migration was rewritten

## Notes for the reviewer

Anything you're unsure about, decisions you'd like a second opinion on, or follow-up work you
deliberately left out.
