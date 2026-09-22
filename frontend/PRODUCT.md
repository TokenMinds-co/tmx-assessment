# Product

<!-- impeccable:product-schema 1 -->

Product context for design work, read by the `impeccable` skill. The full story is in the [root README](../README.md); decisions about each area live in [docs/](docs/).

## Platform

web

## Users

- **Primary: recruiters and HR staff** at whichever company runs this app, at a desk during the working day. They build tests, send them to candidates and read the results. When the recruitment pipeline is built they will run that too: vetting applicants, moving them between stages and writing up screening calls.
- **Secondary: hiring managers,** who drop in to review candidates and scores.
- **Candidates** never sign in. They open a link from an email and take the tests assigned to them, on whatever device they have; the runner is responsive.

## Product Purpose

TMX Assessment is an open-source recruitment app. Its built-in assessments let a team screen candidates on written, timed, scored tests before spending interview time on them.

Success is a screening step that runs itself: the tests go out in one email, the server keeps the clock and scores the answers, and staff open a result they can compare across candidates instead of an impression they have to defend.

## Positioning

Screening tests that belong to the team running them. The questions, the scoring model and the candidates' answers live in this app's own database, tests are edited in the same place the results are read, and the whole thing is self-hosted.

## Operating Context

- Staff work in a browser, signed in, alongside whatever else the company uses to post jobs and talk to applicants. This app is where tests and results live.
- **Tests can go out at any point in a hiring process** — straight after an application, or before or after a first call. Staff pick which tests to send from the published library.
- **A candidate gets one link covering up to five tests** and comes back to it: it stays open until it expires, 14 days by default, and a part-finished set can be resumed.
- **Email is the only channel to candidates.** With no email provider key set, messages print to the server log instead of being sent, which is also how someone tries the app out.
- **Recruitment stages, status categories and the person who owns each stage change over time.** The pipeline that uses them is designed but not built.

## Capabilities and Constraints

- **Built:** staff sign-in and invitations; building, importing, previewing and publishing tests; sending them; the timed candidate runner; scoring; the results screen; a dashboard of real numbers.
- **Not built:** the recruitment pipeline (jobs, stages, applications). There is no job, stage or application data anywhere.
- **Five ready-made tests:** motivation, communication, attention to detail, critical thinking and English B1, 8 to 15 minutes each. A candidate's total should stay around 30–40 minutes, so staff choose which to send.
- **Two scoring methods:** right answers, and alignment against a role profile, which flags a gap of two or more points for staff. A test uses one or the other, never both.
- **Question types:** single choice, true/false, rating scale and ordered choice scale. Questions can carry audio, a passage or a scenario.
- **The server owns the clock and the score.** The browser shows a countdown corrected against the server's time; it never decides an outcome.
- **Candidates see a thank-you screen, never a score,** and never an answer key.
- **Staff sign in with email and password.** No public sign-up: accounts are invited by an admin.
- **Stages, statuses and stage owners are data,** never hardcoded.
- **Light theme only.**
- **Undecided:** pass marks and who reviews scores; whether a candidate can retake a test; extra time for candidates who need it.

## Brand Commitments

- The product name is **TMX Assessment**, and it is also the default company name candidates see.
- The interface uses the violet TMX theme: the tokens in [app/globals.css](app/globals.css), the sidebar gradient, the gradient primary button, Inter for UI and Geist Mono. Every token and every customized component is listed in [docs/design-system.md](docs/design-system.md).
- Brand assets are in [public/brand/](public/brand/) (wordmark and mark), plus [app/icon.png](app/icon.png) and [app/apple-icon.png](app/apple-icon.png).
- **The name and those images are not covered by the app's MIT licence.** A fork sets `COMPANY_NAME` and `NEXT_PUBLIC_COMPANY_NAME` and replaces the images. So candidate-facing surfaces read the company name from `COMPANY_NAME` in [lib/brand.ts](lib/brand.ts) rather than writing "TMX Assessment" into the markup; any new candidate screen does the same.

## Evidence on Hand

- **Every screen renders real API data.** Nothing in the app is invented, and there is no "Sample data" badge.
- **Real content to design with:** the five seed tests in [../backend/seed/assessments/](../backend/seed/assessments/), with their audio in [../backend/seed/media/](../backend/seed/media/) — real question stems, options, sections, bands and time limits. Load them with `pnpm db:seed` in the backend to see the app full rather than empty.
- **There is no job, stage or application data,** because that part isn't built. Don't design a surface that implies it exists.
- There are no real candidates, results or testimonials to show. Anything that needs a filled-in results screen comes from sending a test to yourself.

## Product Principles

1. The person running the hiring sees where every candidate stands at a glance.
2. Stages, statuses and owners come from data, so a hiring process can change without a code change.
3. Tests, results and later the pipeline live in one place, not in scattered links.
4. A candidate gets one link, no account, and a screen that says plainly what is being asked and how long it takes.
5. The server is the authority on time and score. The browser never decides an outcome.
