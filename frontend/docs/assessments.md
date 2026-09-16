# Assessments

**Status:** In progress · **Last updated:** 2026-09-15

## Scope

The staff screens for the test library, the test editor, sending tests and reading results; the staff preview; and the screens candidates use to take tests. Scoring, time limits and the API are in the backend's [assessments.md](../../backend/docs/assessments.md).

## Current state

- **Built and wired to the backend.** Staff build and edit tests, import and export them, preview them, send them and read the results. Candidates take their tests from the emailed link.
- **Pages:**

  | Route | Page | What it is |
  | --- | --- | --- |
  | `/assessments` | [page.tsx](<../app/(app)/assessments/page.tsx>) | The Library and Sent tabs. `?tab=sent` opens the Sent tab. |
  | `/assessments/[id]` | [page.tsx](<../app/(app)/assessments/[id]/page.tsx>) | The editor: Questions, Role profile (alignment tests only), Scoring and Settings tabs |
  | `/assessments/invitations/[id]` | [page.tsx](<../app/(app)/assessments/invitations/[id]/page.tsx>) | The results of one send |
  | `/preview/[assessmentId]` | [page.tsx](<../app/(candidate)/preview/[assessmentId]/page.tsx>) | The staff preview, opened in a new tab. Nothing is saved. |
  | `/take/[token]` | [page.tsx](<../app/(candidate)/take/[token]/page.tsx>) | The candidate's link. No sign-in. |

- **Shared pieces** in [components/shared/](../components/shared/): the runner ([assessment-runner.tsx](../components/shared/assessment-runner.tsx) and the `runner-*` files), the send and resend dialogs, the candidate picker, the copyable link, the status badges, the score summary, the file drop zone, the finish mark and the TokenMinds wordmark for candidate pages.
- **API modules:** [assessments.ts](../lib/api/assessments.ts), [invitations.ts](../lib/api/invitations.ts), [candidates.ts](../lib/api/candidates.ts), [media.ts](../lib/api/media.ts) and [take.ts](../lib/api/take.ts) in `lib/api/` (see [api-client.md](api-client.md)). Data comes through TanStack Query (see [data-fetching.md](data-fetching.md) and [query-keys.md](query-keys.md)).
- **Assessments is a link in the navigation** now. The dashboard's assessment card still shows sample data; see [dashboard.md](dashboard.md).

## Requirements

- Five tests: motivation, communication, attention to detail, critical thinking and English. Four come prefilled from the team's workbooks; Attention to Detail has no workbook yet.
- Each test is timed and scored. A candidate's total should stay around 30–40 minutes.
- All of a candidate's tests are in one place, behind one link.
- Agreed on 2026-09-15:
  - Candidates don't re-enter their details. Each gets a unique link by email, and can get more than one test.
  - Staff can preview a test.
  - Candidates take tests in a responsive, animated runner with one question per screen, inspired by Typeform.
  - Candidates see a thank-you screen, never a score.
  - TanStack Query fetches data in the browser, and `motion` animates.

## How it works

### The library

- **The Library tab** ([library-table.tsx](<../app/(app)/assessments/_components/library-table.tsx>)) lists every test with its status, question count, time limit, how often it was sent and finished, and its average score. A test waiting for audio says so. Archived tests are behind "Show archived tests". A row opens the editor.
- **Each row's menu** opens, previews (in a new tab), sends, duplicates, exports JSON, archives or restores, and deletes. Deleting is disabled once a test has been sent.
- **Admins also get "New test"** ([new-assessment-dialog.tsx](<../app/(app)/assessments/_components/new-assessment-dialog.tsx>)): a name, the scoring method and a time limit, then the draft opens in the editor. **"Import"** ([import-json-dialog.tsx](<../app/(app)/assessments/_components/import-json-dialog.tsx>)) reads a file from "Export JSON", shows its name and question count, and lets you change the slug before it's imported as a draft.
- **"Send tests"** is in the page header for every staff member.
- **The Sent tab** ([sent-table.tsx](<../app/(app)/assessments/_components/sent-table.tsx>)) lists every link, newest first, 20 to a page, with a candidate search and a filter by test. Each row shows the candidate, each test with its score, the link's status, when it was sent, and "Email not sent" when the email failed. Its menu opens the results, resends the link or revokes it.
- **The tab is in the address,** so Back and shared links land on it.

### The editor

`/assessments/[id]` ([assessment-editor.tsx](<../app/(app)/assessments/[id]/_components/assessment-editor.tsx>)). Every staff member can read it; only admins can change anything.

- **The header** ([editor-header.tsx](<../app/(app)/assessments/[id]/_components/editor-header.tsx>)) has the status, Preview, Send (only once the test is published and has no problems) and a menu to duplicate, export JSON or CSV, move back to draft, archive or restore, and delete. Below are the key numbers, then either the list of what stops the test from being published (the API's `problems`) or, for a draft that's ready, a Publish button.
- **The Questions tab** ([questions-tab.tsx](<../app/(app)/assessments/[id]/_components/questions-tab.tsx>)) shows the questions, filtered by section if the test has sections.
  - Each question opens in place ([question-form.tsx](<../app/(app)/assessments/[id]/_components/question-form.tsx>)) and saves with an explicit Save, or Cmd/Ctrl+Enter. The form runs the API's checks as you type ([question-draft.ts](<../app/(app)/assessments/[id]/_components/question-draft.ts>)), and shows the API's own answer if it still refuses. Closing the tab with unsaved edits asks first.
  - Up and down buttons move a question. The new order shows at once and goes back if the save fails. There's no drag and drop.
  - The Sections sheet ([sections-sheet.tsx](<../app/(app)/assessments/[id]/_components/sections-sheet.tsx>)) adds, renames, describes, reorders and deletes sections.
  - The CSV menu imports questions, exports them and downloads the template. The import dialog ([csv-import-dialog.tsx](<../app/(app)/assessments/[id]/_components/csv-import-dialog.tsx>)) checks the file as soon as it's chosen, with a dry run, and shows errors and warnings by row, and a preview of the rows, before anything is saved. It asks whether to keep or replace the current questions. Files over 1 MB are turned down in the browser.
  - Each question can have an audio clip ([media-field.tsx](<../app/(app)/assessments/[id]/_components/media-field.tsx>)): MP3, M4A, WAV or OGG, up to 10 MB, checked in the browser first. It uploads straight away and the question points to it once saved. A question whose import named a file that isn't uploaded yet shows "Needs audio".
- **The Role profile tab** ([role-profile-tab.tsx](<../app/(app)/assessments/[id]/_components/role-profile-tab.tsx>)), on alignment tests only, sets the answer that fits the role for each scale question, grouped by section. Each pick saves at once.
- **The Scoring tab** ([scoring-tab.tsx](<../app/(app)/assessments/[id]/_components/scoring-tab.tsx>)) edits the score bands as percentages, with a bar that shows each band's range from 0 to 100% and warns about scores no band covers. Alignment tests also set section weights here, with each section's share of the score.
- **The Settings tab** ([settings-tab.tsx](<../app/(app)/assessments/[id]/_components/settings-tab.tsx>)) edits the name, tagline, description, level, slug, suitable roles, instructions, time limit, question order, option shuffling, going back, audio replays and scoring method. Only what changed is sent.
- **The Scoring and Settings tabs save through a save bar** ([save-bar.tsx](<../app/(app)/assessments/[id]/_components/save-bar.tsx>)) that rises from the bottom while there are unsaved changes, with Discard and Save changes. Every tab stays mounted, so unsaved edits survive a switch.

### Sending and results

- **The send dialog** ([send-assessment-dialog.tsx](../components/shared/send-assessment-dialog.tsx)) opens from the library, the Sent tab and the editor. Pick a candidate already entered, by name or email, or add a new one ([candidate-picker.tsx](../components/shared/candidate-picker.tsx)); tick the published tests and see the total time, with a warning above 40 minutes; choose how long the link works (3, 7, 14 or 30 days, 14 by default); and add a note if you like. Tests waiting for audio can't be ticked.
- **After sending,** the dialog shows the link to copy ([copy-link.tsx](../components/shared/copy-link.tsx)), and says so when the email didn't go out.
- **Resend** ([resend-invitation-dialog.tsx](../components/shared/resend-invitation-dialog.tsx)) emails a new link and shows it to copy, keeping the expiry or setting a new one. **Revoke** asks first.
- **The results page** ([invitation-results.tsx](<../app/(app)/assessments/invitations/[id]/_components/invitation-results.tsx>)) shows who sent the link and when, when it was last opened, when it expires, and the note. Each test has a card ([attempt-card.tsx](<../app/(app)/assessments/invitations/[id]/_components/attempt-card.tsx>)) with its status and time taken, then the score and band, what the band means and the suggested next step, a bar per section, and for Motivation the gaps to talk about ([score-summary.tsx](../components/shared/score-summary.tsx)). The answers are behind "Show answers" ([answer-review.tsx](<../app/(app)/assessments/invitations/[id]/_components/answer-review.tsx>)). While a test is in progress, the page checks back every 15 seconds.

### The preview

- **`/preview/[assessmentId]`** ([preview-flow.tsx](<../app/(candidate)/preview/[assessmentId]/_components/preview-flow.tsx>)) opens in a new tab from the library or the editor. It needs a session, works on drafts, and loads the test on the server with `serverApiFetch()`.
- **It's the candidate's runner with a banner:** an "Answer key" switch that marks the right answer, or the role profile's pick on a scale; "Shuffle again", which fetches a fresh order; and a link back to the editor. A test that isn't ready to send says so on the intro screen.
- **At the end** it shows what the answers would score, as the results page would. Nothing is saved.

### The candidate's side

- **`/take/[token]`** ([take-flow.tsx](<../app/(candidate)/take/[token]/_components/take-flow.tsx>)) needs no sign-in. The start page ([take-overview.tsx](<../app/(candidate)/take/[token]/_components/take-overview.tsx>)) greets the candidate by first name, shows the sender's note, lists the tests with their time and question count, and says until when the link works.
- **Each test opens on an intro screen** ([runner-intro.tsx](../components/shared/runner-intro.tsx)): its time, question count, whether they can go back, whether it plays audio, and the test's instructions. The timer starts on Start. A test already started says how long is left.
- **The runner** ([assessment-runner.tsx](../components/shared/assessment-runner.tsx)) shows one question per screen: its instruction, passage, audio, the question and the options ([runner-question.tsx](../components/shared/runner-question.tsx), [runner-options.tsx](../components/shared/runner-options.tsx)). Letters choose an option, or numbers on a rating scale, and Enter moves on. The chosen option blinks twice and the next question rises into place (see [design-system.md](design-system.md#motion)). A thin bar under the header fills as questions are answered, and the footer has the question count and previous and next buttons. Previous only works when the test allows going back.
- **The countdown** ([runner-timer.tsx](../components/shared/runner-timer.tsx)) runs on the server's clock: the page measures the gap between the server's `serverNow` and the device's clock and corrects for it ([use-countdown.ts](../hooks/use-countdown.ts)). It turns amber in the last minute, and screen readers hear a warning at five minutes and at one. When time runs out, the runner hands in what there is, and the finish screen says the answers so far were submitted.
- **Answers are saved one at a time** as the candidate goes. A question's saves go in order, so a quick change of mind can't arrive first. A save is tried up to four times after a dropped connection, a rate limit or a server error. The footer shows "Saving…", "Saved", or that the browser is offline ([use-online.ts](../hooks/use-online.ts)); answers that couldn't be saved are sent again when the connection returns, and before submitting.
- **Audio** plays without a seek bar ([runner-audio.tsx](../components/shared/runner-audio.tsx)), once plus the test's replays. Pausing doesn't use one up. The browser keeps the count.
- **Submitting asks first,** and lists the unanswered questions when going back is allowed. Afterwards the candidate sees a thank-you screen ([take-done.tsx](<../app/(candidate)/take/[token]/_components/take-done.tsx>)) and their next test, never a score.
- **A link that doesn't work, an expired link and a failed load** each get their own calm message ([candidate-message.tsx](<../app/(candidate)/take/[token]/_components/candidate-message.tsx>)), matched on the API's 404 and 410. Candidate pages show the TokenMinds wordmark, not the TMX HR logo.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| The runner | One question per screen, responsive and animated, inspired by Typeform | | Requested |
| Candidates' details | Staff enter them once; the candidate only opens their link | | Requested |
| Previewing a test | A preview of any test, drafts included, in a new tab, with an answer-key switch. Nothing is saved. | | Requested |
| Whether candidates see their results (was open) | No. A thank-you screen and their next test, never a score. | | Requested |
| Client data fetching | TanStack Query | | Requested |
| Animation | `motion` | | Requested |
| Saving a question | An explicit Save, or Cmd/Ctrl+Enter, not autosave. The API's checks run inline first. | A question only passes the API's checks once it's complete, so autosave would keep failing halfway. Discard puts it back. | Build default |
| Reordering questions and sections | Up and down buttons, not drag and drop | Works with a keyboard and on phones, with no drag library. | Build default |
| Role profile picks | Each pick saves at once | One value per question, with nothing to check first. | Build default |
| Settings, bands and weights | Only what changed is sent, through a save bar that appears while there are unsaved changes | Several fields change together, and a save bar makes unsaved edits hard to miss. | Build default |
| Going back in the runner | Allowed unless the test turns it off | The requested Typeform flow has previous and next. The workbooks' "no revisits" is a per-test setting. | Build default |
| Audio replay limits | Counted in the browser only | See the backend's [assessments.md](../../backend/docs/assessments.md#decisions). | Build default |
| Saving answers | One at a time as the candidate goes, in order per question, up to four tries (1, 2 and 4 seconds apart) after a dropped connection, a rate limit or a server error | Nothing is lost if the page closes. Other refusals, such as time running out, won't change on a retry. | Build default |
| Link lengths in the send dialog | 3, 7, 14 or 30 days, 14 by default | The API allows 1 to 60; these cover the usual cases. | Build default |
| Total time warning | Above 40 minutes | A candidate's total should stay around 30–40 minutes. | Build default |
| Where the preview lives | `/preview/[assessmentId]`, in the `(candidate)` group, in a new tab | It looks exactly like the candidate's page, without the staff shell, and the editor stays open. | Build default |

## Open decisions

- **Accessibility: extra time** for candidates who need it.
- Where results live once the recruitment pipeline has a candidate profile: there, on the results page, or both.
- Whether questions need images. The API accepts them, but the editor and the runner only handle audio.

## References

- [routing.md](routing.md), [dashboard.md](dashboard.md), [recruitment-pipeline.md](recruitment-pipeline.md)
- [data-fetching.md](data-fetching.md), [query-keys.md](query-keys.md), [api-client.md](api-client.md)
- [design-system.md](design-system.md#motion) (the runner's motion, the save bar and the status badges)
- Backend: [assessments.md](../../backend/docs/assessments.md)
