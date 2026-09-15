# TMX HR

TokenMinds' internal HR app. It brings recruitment into one platform, starting with a built-in system for testing candidates before they reach a trial day.

## Why this exists

- **Tools are split up.** Jobs are posted on LinkedIn, candidate details come in through a monday.com form, and screening calls are booked through Calendly. Candidate stages are updated by hand, and Calendly bookings don't sync to monday.com.
- **Trial days mostly fail.** About 80% of candidates who reach a trial day turn out to be a poor fit. Each trial day costs the small team onboarding, Gather meetings and supervision, and today nothing screens candidates well before that point.
- **TestGorilla was too expensive,** so the team is building its own assessments.

## How recruitment works today

1. Post the job on LinkedIn and collect applicants.
2. Candidates fill in a monday.com form (location, notice period, salary expectations), and the team does light vetting on it.
3. Candidates who pass get a Calendly link for a screening call. The call report is written up and the stage is updated by hand in monday.com.
4. Depending on the role, the candidate gets an assessment, a trial day, or both.

## First milestone: the assessment system

- **Five general skills tests:** motivation, communication, attention to detail, critical thinking and English.
- **Format:** each test takes 15–20 minutes, with multiple-choice questions and a scoring model. The total per candidate should stay around 30–40 minutes.
- **Question writing:** an LLM generates the questions from test specs based on the TestGorilla library.
- **Flexible timing:** tests can go out right after the application (once salary and location fit), or before or after the first call.
- **One place:** all tests live in this app, not in scattered links.

## Design rules

- Recruitment stages and status categories change over time, so they must be configurable, not hardcoded.
- The team member responsible for each stage can change too.

## Status

- **Waiting on Robbie** for the 5 test specs.
- **Next step:** a prototype of the assessment system that fits the wider HR app design.
- **Priority:** work starts after the MMAL production work is done.
- **Main contact:** Anchor.

## Open questions

- Will this app replace monday.com and Calendly, or sync with them?
- What is the pass mark for each test, and who reviews the scores?

## Repository layout

| Folder | What it is | Docs |
| --- | --- | --- |
| [`backend/`](backend/) | REST API: NestJS 11, TypeScript | [README](backend/README.md) · [docs](backend/docs/) · [changelog](backend/docs/CHANGELOG.md) |
| [`frontend/`](frontend/) | Web app: Next.js 16, React 19, Tailwind CSS 4 | [README](frontend/README.md) · [docs](frontend/docs/) · [changelog](frontend/docs/CHANGELOG.md) |

Both apps are fresh scaffolds. They are separate pnpm projects with their own lockfiles, so install and run each one from its own folder.

## Quick start

You need Node.js 20.9 or newer and pnpm.

```bash
# Terminal 1: backend
cd backend
pnpm install
PORT=4000 pnpm start:dev

# Terminal 2: frontend
cd frontend
pnpm install
pnpm dev          # http://localhost:3000
```

Both apps default to port 3000, so start the backend with a different `PORT`.

## Documentation

Each app keeps its docs in its own `docs/` folder:

- **One file per area,** such as `authentication.md`, `database.md` or `query-keys.md`, named in kebab-case. A file covers one area only. If it starts covering two, split it.
- **`CHANGELOG.md`** lists notable changes to that app.

Each area doc starts with a status (**Not started**, **Scaffold only**, **In progress** or **Done**) and the date it was last updated, then uses these sections:

| Section | What goes in it |
| --- | --- |
| Scope | What the area covers, and what belongs in other docs |
| Current state | What exists in the code today, with links |
| Requirements | What has been agreed |
| Proposed approach | Suggestions that haven't been agreed yet. Once the area is built, rename it to "How it works" and describe the real code. |
| Open decisions | Questions that still need an answer |
| References | Related docs and agent skill rules |

When you change an area, update its doc, its status in the app README, and the changelog in the same PR.
