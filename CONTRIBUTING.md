# Contributing to TMX Assessment

Thanks for taking the time. TMX Assessment is a recruitment app with built-in timed candidate
assessments, described in the [README](README.md). This file covers how to get it running,
how to check your work, and what a change has to include before it can be merged.

Everyone taking part agrees to the [Code of Conduct](CODE_OF_CONDUCT.md). Found a security
problem? Don't open an issue: follow [SECURITY.md](SECURITY.md).

## Before you start

- **Small fixes** (a typo, a broken link, an obvious bug) can go straight to a pull request.
- **Anything larger** starts as an issue, so we can agree on the approach before you spend
  an evening on it. The app has strong conventions, and a design choice made in the wrong
  place is expensive to undo.
- **Check the area doc first.** Most questions about why something works the way it does are
  already answered in `backend/docs/` or `frontend/docs/`, in the "Decisions" table. Those
  tables also list the things that are still open, which are the easiest places to help.

## Setting up

The repository holds two separate pnpm projects, `backend/` and `frontend/`. It is **not** a
workspace: each has its own `package.json` and its own lockfile, so install and run each one
from its own folder.

You need:

- **Node.js 24.** That's what [`.nvmrc`](.nvmrc) pins and what CI runs. The `engines` field in
  both packages also accepts 20.19+ and 22.12+, which is the range Prisma 7 supports, but
  develop on 24 if you have a choice.
- **pnpm 11.8.0**, pinned in `packageManager` in both `package.json` files. `corepack enable`
  picks up the pinned version on its own.

You don't need Docker or a Postgres server of your own. `pnpm db:start` runs a local Prisma
Postgres instance that comes with the `prisma` package, keeps its data between restarts, and
prints the URL to put in `.env`.

### Backend

```bash
cd backend
pnpm install        # also runs prisma generate
cp .env.example .env
pnpm db:start       # starts local Prisma Postgres; put the URL it prints in .env as DATABASE_URL
pnpm db:migrate     # creates the tables
pnpm db:seed        # optional: loads the prefilled tests and their audio
pnpm start:dev
```

The API is at http://localhost:4000/api and its interactive docs at
http://localhost:4000/api/docs. Every setting is described in
[backend/docs/configuration.md](backend/docs/configuration.md).

**Leave `RESEND_API_KEY` empty.** While it's empty, no email is sent: every message is
printed in the backend's terminal, including the invitation and candidate links you need to
click. Don't point a development environment at a real Resend key.

### Frontend

```bash
cd frontend
pnpm install
cp .env.example .env   # API_URL must point at the backend
pnpm dev
```

The app is at http://localhost:3000. It rewrites `/api/*` to the backend, so the browser
only ever talks to port 3000 and the session cookie stays first-party.

### Your first account

Accounts are invite-only, so the first admin comes from the command line, with the backend's
dependencies installed:

```bash
cd backend
pnpm auth:invite-admin --email you@example.com --name "Your Name"
```

It prints the invitation link. Open it with the frontend running, choose a password, and
you're signed in. More in
[backend/README.md](backend/README.md#create-the-first-admin).

### Agent skills

Both packages keep agent skills in `.agents/skills/` — vendored rule files for NestJS,
Prisma, React, Next.js, TanStack Query, shadcn/ui and design work. **They are not tracked in
git.** Only the lockfile is: `backend/skills-lock.json` and `frontend/skills-lock.json` pin
each skill's source repository, the path to its `SKILL.md` and a hash of its contents.

To restore them, run this in each package:

```bash
pnpm dlx skills experimental_install
```

You don't need them to build or test anything; they only matter if you work with a coding
agent. If you do, read [frontend/AGENTS.md](frontend/AGENTS.md) first — it says which skill
to load for which kind of task, and how this project settles the places where two skills
disagree. Never edit files under `.agents/skills/` by hand: the installer overwrites them and
the lockfile's hashes stop matching. If a skill's advice is wrong for this project, write the
override in `AGENTS.md` instead.

## Checking your work

### Tests

The backend has the test suite; the frontend has none yet.

| Command | What it runs | Needs a database |
| --- | --- | --- |
| `pnpm test` | Unit tests: `*.spec.ts` next to the code in `src/` | No |
| `pnpm test:watch` | The same, in watch mode | No |
| `pnpm test:cov` | The same, with a coverage report in `coverage/` | No |
| `pnpm test:e2e` | End-to-end tests: `*.e2e-spec.ts` in `test/`, over the real app with Supertest | Yes |

**`pnpm test:e2e` is safe to run against your development database.** It uses the database in
`DATABASE_URL` rather than a throwaway one, so there is nothing extra to set up, and it never
empties a table. Every run picks a random prefix, `e2e-xxxxxxxx-`, and puts it on the emails,
slugs and candidate addresses of everything it creates; at the end it deletes exactly those
rows and the files those users uploaded. Suites run one at a time (`--runInBand`), and Jest
sets `NODE_ENV=test`, which turns rate limits off because the tests sign in repeatedly.

Email and file storage are replaced in the e2e tests: an in-memory mail transport the tests
read links back out of, and a temporary folder per run instead of `STORAGE_DIR`. Tests never
call an outside service — if your change adds one, add a test double with it. The details are
in [backend/docs/testing.md](backend/docs/testing.md).

New code needs tests. Unit-test the logic; add an e2e test when you add or change an endpoint.

### Lint and format

```bash
# backend
pnpm lint      # ESLint, fixing what it can
pnpm format    # Prettier over src/ and test/

# frontend
pnpm lint      # ESLint (eslint-config-next)
```

- **The backend is formatted by Prettier:** single quotes, trailing commas
  (`backend/.prettierrc`). Run `pnpm format` before you commit.
- **The frontend has no Prettier.** Its code uses double quotes and 2-space indentation.
  Match the file you're editing; `.editorconfig` covers the basics.
- **CI runs ESLint without `--fix`,** so a lint error your local run quietly repaired will
  still fail the build if you didn't commit the repair.

### Build

`pnpm build` in either package. On the frontend this is also the type check, since
`next build` type-checks the whole app; it needs `API_URL` set, so run it with your `.env` in
place.

### CI

Every pull request runs the checks in
[.github/workflows/ci.yml](.github/workflows/ci.yml): the backend's build, lint and unit
tests, its e2e tests against a throwaway Postgres service container, a Docker image build,
and the frontend's lint and production build. All of them have to pass. Nothing in that
workflow touches a secret, so it runs the same way on a fork.

## Commits

The history follows [Conventional Commits](https://www.conventionalcommits.org/): a type, an
optional scope, then a short description in the imperative.

```text
feat: send one link per candidate for a group of tests
fix(auth): clear the session cookie when the session has already ended
docs: record the scoring decision in assessments.md
chore: bump prisma to 7.10
ci: run unit tests on backend pull requests
```

The types in use are `feat`, `fix`, `chore`, `docs` and `ci`; `refactor`, `test` and `perf`
are fine too. Write the description so it makes sense in a changelog a year from now.

## Documentation is part of the change

This is the convention outside contributors most often miss, so it's worth reading closely.
Every area of the app has one doc, and **a change to that area updates its doc in the same
pull request as the code**. The full rules are in the
[README](README.md#documentation); what follows is what you need in practice.

**One file per area,** kebab-case, under `backend/docs/` or `frontend/docs/` —
`authentication.md`, `database.md`, `query-keys.md`. A file covers one area. If it starts
covering two, split it.

**Each doc opens with a status line** (`Not started`, `Scaffold only`, `In progress` or
`Done`) and the date it was last updated, then keeps this section order:

| Section | What goes in it |
| --- | --- |
| Scope | What the area covers, and what belongs in another doc |
| Current state | What exists in the code today, with links into it |
| Requirements | What has been agreed |
| Proposed approach | Suggestions nobody has agreed to yet. Once the area is built, rename it to "How it works" and describe the real code. |
| Decisions | Questions that have been answered |
| Open decisions | Questions that still need an answer |
| References | Related docs and agent skill rules |

**The Decisions table is the important one.** It has four columns:

```markdown
| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Password hashing | Argon2id, OWASP baseline cost | OWASP's first choice. `@node-rs/argon2` ships prebuilt binaries, so pnpm 11 doesn't need to run a build script. | Build default |
```

`Source` is one of two values, and the difference matters:

- **`Requested`** — the maintainers asked for it. Don't change it in a pull request; open an
  issue instead.
- **`Build default`** — it was chosen while building, for the reason in the "Why" column, and
  it's open to change. If you have a better answer, say so in the issue or the pull request
  and update the row.

**If you make a design choice while writing code, it goes in that table** with the reason,
as `Build default`. An undocumented choice is the thing reviewers will send back. If your
change answers a question that was sitting under "Open decisions", move that line up into the
Decisions table rather than leaving it in both places.

**Then the changelog.** Each package keeps its own, in
[backend/docs/CHANGELOG.md](backend/docs/CHANGELOG.md) and
[frontend/docs/CHANGELOG.md](frontend/docs/CHANGELOG.md), in
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Add a line under
`## [Unreleased]`, in `Added`, `Changed`, `Fixed` or `Removed`, and link the area doc. The
root [CHANGELOG.md](CHANGELOG.md) is only a pointer to those two.

Finally, if the change moves an area forward, update its status in that package's README
table and in the status line at the top of the doc.

## Pull requests

Fill in the template. Beyond that:

- **One change per pull request.** A refactor and a feature in one branch is two reviews
  wearing a trenchcoat.
- **Link the issue** it closes or relates to.
- **Say what you did and why.** The "why" is what reviewers can't reconstruct from a diff.
- **Screenshots for anything visual,** before and after where it helps.
- **CI has to be green.** Fix failures on your branch rather than asking a reviewer to
  re-run it.
- **Never commit secrets or candidate data.** `.env` is ignored — keep it that way. Fixtures,
  test data, screenshots and issue reports must use invented names and addresses, never a
  real candidate's. The app stores people's personal data, and so does your development
  database once you've clicked through it.
- **Don't hand-edit generated or vendored files:** `backend/src/generated/` (Prisma Client),
  `pnpm-lock.yaml` and anything under `.agents/skills/`.
- **Migrations are committed.** Generate them with `pnpm db:migrate`, commit the folder
  `prisma/migrations/` gains, and never rewrite one that has already been merged.

Review is by a maintainer. Expect questions about the doc as often as about the code.

## Licence

By contributing you agree that your work is licensed under the
[MIT Licence](LICENSE) that covers this repository.
