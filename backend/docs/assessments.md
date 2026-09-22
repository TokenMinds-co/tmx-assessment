# Assessments

**Status:** In progress · **Last updated:** 2026-09-21

## Scope

Test templates and their questions, question audio, candidates, sending tests to candidates, taking and scoring attempts, and storing results. How the LLM could write questions is in [question-generation.md](question-generation.md).

## Current state

- **Built and covered by tests.** Staff build tests, import and export them, preview them, send them to candidates by email and read the results. Candidates take them through their link. The frontend is wired to every endpoint (see the frontend's [assessments.md](../../frontend/docs/assessments.md)).
- **Code:** [src/assessments/](../src/assessments/) (templates, questions, sending, the candidate API, scoring), [src/candidates/](../src/candidates/), [src/media/](../src/media/) (uploads) and [src/storage/](../src/storage/) (where files are kept). The rules that don't touch the database, such as scoring, question order and the CSV format, are plain functions in [src/assessments/canonical/](../src/assessments/canonical/).
- **Five prefilled tests** in [seed/assessments/](../seed/assessments/), converted from the spreadsheets in [seed/workbooks/](../seed/workbooks/) — one `.xlsx` per test, under the same slug as its JSON — with their audio in [seed/media/](../seed/media/):

  | Test | Questions | Time | Scoring | Audio clips |
  | --- | --- | --- | --- | --- |
  | Attention to Detail (Textual) | 15 | 12 min | Right answers | 0 |
  | Communication | 15 | 8 min | Right answers | 2 |
  | Critical Thinking | 16 | 12 min | Right answers | 0 |
  | English B1 (Intermediate) | 16 | 10 min | Right answers | 4 |
  | Motivation | 20 | 15 min | Alignment with the role profile | 0 |

  Load them with `pnpm db:seed` (see [database.md](database.md#seed-data)). [seed-files.spec.ts](../src/assessments/canonical/seed-files.spec.ts) checks every JSON file against the question count, time and audio read off its workbook in [seed/workbooks/](../seed/workbooks/), so add a row there when a test joins the seed. That check is why the workbooks are kept: they are the source the tests were transcribed from, and the only way to tell a deliberate edit from a typo.
- **Limits** are in [assessments.constants.ts](../src/assessments/assessments.constants.ts) and [media.constants.ts](../src/media/media.constants.ts), along with `FINISHED_STATUSES`, the two attempt statuses that count as over.
- **`AssessmentsModule` exports `AssessmentsService` and `AttemptsService`,** so another area can reuse these numbers and the overdue check instead of copying the rules; the [dashboard](dashboard.md) is the first to do so.

## Requirements

- Five general skills tests: **motivation, communication, attention to detail, critical thinking and English**.
- Each test is **timed**, uses **multiple-choice or scale questions**, and has a **scoring model**. The plan was 15–20 minutes per test; the five workbooks set 8 to 15.
- A candidate's total should stay around **30–40 minutes**, so staff choose which tests to send.
- Tests can be sent **at any stage**: right after the application (once the screening criteria fit), or before or after the first call.
- All of a candidate's tests are in **one place** in this app, not in separate links.
- Agreed with the maintainers on 2026-09-15:
  - **One structure for every test.** The workbooks are loaded as prefilled templates, and staff add more tests by CSV import or by hand.
  - **Candidates don't re-enter their details.** Each gets a unique link by email, and one candidate can get more than one test.
  - **Staff can preview a test** before sending it.
  - **Candidates see a thank-you screen**, never a score.
  - **Motivation is scored with the formula from the Motivation workbook's calculator.**
  - **Media is kept on local disk**, behind a storage interface so it can move later.

## How it works

### Flow

1. An admin builds a test, or loads one from the seed, a JSON file or a question CSV, then publishes it.
2. A staff member sends one or more published tests to a candidate. The candidate gets one email with one link, `/take/<token>`. Each test is frozen as it is at that moment.
3. The candidate opens the link, starts each test when ready and answers one question at a time. The server keeps the clock.
4. On submit, or when time runs out, the server scores the answers from the frozen copy and stores the result.
5. Staff read the scores, section scores, flags and answers on the results page.

Later, a stage change could send tests automatically, using the pipeline's `application.stage_changed` event (see [recruitment-pipeline.md](recruitment-pipeline.md)).

### Roles

- **Admins** (`ADMIN`) create, edit, import, duplicate, publish, archive and delete tests, and upload or delete media. These routes use [`@AdminOnly()`](../src/auth/decorators/admin-only.decorator.ts), or `@Roles(UserRole.ADMIN)` on the media routes.
- **Any staff member** reads tests, previews them, exports them, downloads the CSV template, adds and finds candidates, sends tests, resends or revokes links, and reads results.
- **Candidates** have no account. Their link is their access (see [Candidate links](#candidate-links)).

### Endpoints

All paths start with `/api`. Every staff route needs a session (see [authentication.md](authentication.md)). Every change to a test answers with the whole test, so the editor can replace what it shows in one step.

**Tests** ([assessments.controller.ts](../src/assessments/assessments.controller.ts)):

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| `GET` | `/assessments?status=` | Staff | Lists tests by name, with question and section counts, how often each was sent and completed, the average score, and how many questions wait for audio. `{ items }` |
| `POST` | `/assessments` | Admins | Creates a draft with four default score bands. `409` if the slug is taken. |
| `POST` | `/assessments/import` | Admins | Creates a draft from a [canonical JSON document](#the-canonical-format). `400` with a list of problems, `409` if the slug is taken. |
| `GET` | `/assessments/csv-template?scoringMethod=` | Staff | Downloads a question CSV with the header and example rows. |
| `GET` | `/assessments/:id` | Staff | The whole test with its answer keys and `problems`, the list of what stops it from being published. |
| `PATCH` | `/assessments/:id` | Admins | Changes settings or status. Send only what changes. Publishing answers `400` with the problems when there are any. |
| `DELETE` | `/assessments/:id` | Admins | `204`. `409` if the test was ever sent; archive it instead. |
| `POST` | `/assessments/:id/duplicate` | Admins | A draft copy, named "(copy)". |
| `GET` | `/assessments/:id/export` | Staff | Downloads the test as canonical JSON, `<slug>.json`. |
| `GET` | `/assessments/:id/preview` | Staff | The test as a candidate would get it, freshly shuffled, with the answer key and the problems. Works on drafts. Nothing is saved. |
| `POST` | `/assessments/:id/preview/score` | Staff | `{ answers: [{ questionId, optionId }] }`. What those answers would score, with bands and flags. Nothing is saved. |

**Sections, questions and bands** ([questions.controller.ts](../src/assessments/questions.controller.ts)), all under `/assessments/:assessmentId`:

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| `POST` | `/sections` | Admins | Adds a section. `409` if the name is taken. |
| `PUT` | `/sections/order` | Admins | `{ ids }`, every section id once, in the new order. |
| `PATCH` | `/sections/:sectionId` | Admins | Changes the name, description or weight. |
| `DELETE` | `/sections/:sectionId` | Admins | Its questions stay, without a section. |
| `POST` | `/questions` | Admins | Adds a question at the end. |
| `PUT` | `/questions/order` | Admins | `{ ids }`, every question id once, in the new order. |
| `POST` | `/questions/import?mode=append\|replace&dryRun=true\|false` | Admins | Imports a [question CSV](#question-csv). Multipart, one `file` field, up to 1 MB. |
| `GET` | `/questions/export.csv` | Staff | Downloads the questions as CSV, `<slug>-questions.csv`. |
| `PUT` | `/questions/:questionId` | Admins | Replaces the whole question. Options sent with an `id` keep it; options left out are deleted. |
| `POST` | `/questions/:questionId/duplicate` | Admins | A copy straight after the original, without its reference. |
| `DELETE` | `/questions/:questionId` | Admins | Deletes the question. |
| `PUT` | `/bands` | Admins | `{ bands }` replaces every score band. Each needs its own minimum, from 0 to 1. |

**Media** ([media.controller.ts](../src/media/media.controller.ts)):

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| `POST` | `/media` | Admins | Uploads a file: multipart, one `file` field, up to 10 MiB. `201 { id, url, mimeType, originalName, sizeBytes, createdAt }` |
| `GET` | `/media/:id` | Anyone | Serves the file inline, with Range support so audio can seek and replay. Not rate-limited. |
| `DELETE` | `/media/:id` | Admins | `204`. Questions that used it are left without media. |

**Candidates** ([candidates.controller.ts](../src/candidates/candidates.controller.ts)):

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| `GET` | `/candidates?search=&limit=` | Staff | Finds candidates by part of their name or email, most recently changed first. `limit` is 1 to 50, default 20. `{ items }`, each with `invitationCount`. |
| `POST` | `/candidates` | Staff | `{ name, email, phone? }`. `409` if the email is taken. |

**Sending and results** ([assessment-invitations.controller.ts](../src/assessments/assessment-invitations.controller.ts)):

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| `POST` | `/assessment-invitations` | Staff | `{ candidateId }` or `{ candidate: { name, email } }`, plus `assessmentIds` (1 to 5, in the order the candidate sees them), `expiresInDays?` (1 to 60, default 14) and `message?`. `201 { invitation, link, emailSent }`. |
| `GET` | `/assessment-invitations?page=&pageSize=&search=&assessmentId=&candidateId=` | Staff | Sent links, newest first. `{ items, total, page, pageSize }`; `pageSize` is 1 to 100, default 20. `search` matches part of the candidate's name or email. |
| `GET` | `/assessment-invitations/:id` | Staff | One link with each test's result: score, band, section scores, flags, time taken and every answer next to the expected one. Section scores, flags and answers appear once a test is finished. |
| `POST` | `/assessment-invitations/:id/resend` | Staff | `{ expiresInDays? }`. Emails a new link and returns it; the old one stops working. `409` if the link was revoked or every test is finished. |
| `DELETE` | `/assessment-invitations/:id` | Staff | Revokes the link at once, even mid-test. `204`. |

The candidate endpoints are under [Candidate links](#candidate-links).

### Tests and their status

- **`DRAFT`** can't be sent. **`PUBLISHED`** can. **`ARCHIVED`** is hidden from the send dialog; tests already sent keep working.
- **Publishing checks the test** with `publishProblems()` in [canonical.mapper.ts](../src/assessments/canonical/canonical.mapper.ts): it needs at least one question, every question must pass the [question rules](#question-rules), and every audio file a question names must be uploaded. Otherwise `PATCH` answers `400` with the list. Sending checks the same list again.
- **Tests stay editable after publishing,** because every send freezes a copy (see [Frozen copies](#frozen-copies)).
- **A test that was ever sent can't be deleted** (`409`). Archive it instead.
- **The scoring method can't change** while the test holds questions of the other kind (`400`).
- **New tests** start as drafts with a 15-minute limit unless given one, questions in a fixed order, option shuffling on for right-answer tests, and four default bands: 85%, 65%, 45% and 0% for right-answer tests ("Strong", "Competent", "Developing", "Needs development"), and 85%, 70%, 55% and 0% for alignment tests ("Strong fit", "Good fit", "Partial fit", "Low fit").

### Question rules

- **Four question types:** `SINGLE_CHOICE` (2 to 6 options, exactly one correct), `TRUE_FALSE` (True and False, one of them correct), `RATING_SCALE` (2 to 7 numbered points, labelled at the ends) and `CHOICE_SCALE` (2 to 6 ordered, worded choices).
- **Two scoring methods:** `CORRECT_ANSWER` for single choice and true/false, and `ALIGNMENT` for the two scales. A test holds right-answer types or scale types, never both.
- **Scales** have whole-number values in increasing order (1, 2, 3… unless set), and every scale question needs the role profile's answer, which must be one of its values. On alignment tests a question can also say how the role profile asks it (`employerPrompt`), and each option how the role profile words it (`employerText`).
- **The rules are in [question-rules.ts](../src/assessments/canonical/question-rules.ts).** The API checks them on every save, import and publish, and answers `400` with sentences such as `Mark exactly one option as correct.` The editor runs the same checks as you type.
- **Limits per test:** 100 questions, 20 sections and 10 score bands.

### Question order

- **Each test sets `questionOrder`:** `FIXED` (as listed), `SHUFFLE_WITHIN_SECTION` (sections stay in order, questions are shuffled inside each, and questions without a section come last) or `SHUFFLE_ALL`. Alignment tests treat `SHUFFLE_ALL` as shuffling within sections, so each dimension stays together.
- **Only single-choice options shuffle,** when the test's `shuffleOptions` is on or the question overrides it (a question's `null` follows the test). True/false and scales keep their order. `keepLastOptionFixed` keeps the last option last, for "None of the above".
- **The order is drawn when the candidate starts a test** and stored on the attempt (`layout`), so a refresh shows the same order. See [layout.ts](../src/assessments/canonical/layout.ts). A staff preview draws a fresh order every time.
- **Going back** is a per-test setting, `allowBackNavigation`, on by default. **Audio replays** (`audioReplays`, 0 to 5, default 1) are how often a clip can be replayed after the first play; only the browser enforces them.

### The canonical format

One JSON document per test, `"format": "tmx-assessment/1"`. The seed files, `POST /api/assessments/import`, `GET /api/assessments/:id/export` and duplicating a test all use it. The types are in [canonical.types.ts](../src/assessments/canonical/canonical.types.ts) and the request DTOs in [canonical.dto.ts](../src/assessments/canonical/canonical.dto.ts).

```json
{
  "format": "tmx-assessment/1",
  "slug": "example",
  "name": "Example",
  "durationMinutes": 10,
  "scoringMethod": "CORRECT_ANSWER",
  "questionOrder": "SHUFFLE_WITHIN_SECTION",
  "shuffleOptions": true,
  "allowBackNavigation": true,
  "audioReplays": 1,
  "sections": [{ "key": "reading", "name": "Reading comprehension" }],
  "bands": [{ "minScore": 0.65, "label": "Competent" }, { "minScore": 0, "label": "Developing" }],
  "questions": [
    {
      "ref": "Q1",
      "section": "reading",
      "type": "SINGLE_CHOICE",
      "stem": "What is the main point of the message?",
      "options": [{ "text": "A delay" }, { "text": "A smaller first phase", "correct": true }]
    }
  ]
}
```

- **Optional test fields:** `tagline`, `description`, `level`, `relevantFor` and `instructions` (shown to candidates before they start). `durationMinutes` is 1 to 240.
- **Sections** have a `key` and a `name`, plus an optional `description` and `weight`. A question names its section by key or name.
- **Bands** have a `minScore` from 0 to 1 and a `label`, plus an optional `interpretation` and `recommendedAction`.
- **Questions** can also carry `difficulty`, `instruction`, `context` (a passage or scenario), `media` (`{ file, assetId }`), `rationale`, `transcript`, `shuffleOptions`, `keepLastOptionFixed`, `employerPrompt` and `employerValue`. Options can carry `employerText` and `value`.
- **Authors can leave out** option labels (A, B… or the scale value), scale values (1, 2, 3…) and a true/false question's options.
- **Importing checks** the structure with the DTOs, then the rules that span fields in [document-rules.ts](../src/assessments/canonical/document-rules.ts): unknown sections, two sections with the same key or name, two bands with the same minimum, and every question's rules. A document can be up to 100 KB, the API's JSON limit. Imported tests start as drafts.
- **Export writes each question's media** as the file name and the asset id. On the same server the id matches; anywhere else the file name does.

### Question CSV

One row per question, header row first, for staff who work in a spreadsheet. The format is in [csv-questions.ts](../src/assessments/canonical/csv-questions.ts), and [csv.ts](../src/common/csv.ts) reads and writes the CSV itself.

- **Columns:** `ref`, `section`, `type`, `difficulty`, `instruction`, `context`, `stem`, `media`, `option_a` to `option_f`, `correct`, `rationale`, `transcript`, `shuffle_options`, `keep_last_option_fixed`, `scale_size`, `scale_min_label`, `scale_max_label`, `employer_prompt`, `employer_min_label`, `employer_max_label` and `employer_value`. Only `stem` is required. Header names ignore case, and spaces or hyphens count as underscores. Unknown columns are ignored with a warning.
- **`type`** takes the enum names or the workbooks' wording, such as "Multiple choice", "True/False" or "Rating 1–5". Blank means single choice on a right-answer test and rating scale on an alignment test.
- **`correct`** is a letter from A to F, True or False, or the exact option text.
- **Rating scales** use `scale_size` (2 to 7, default 5) and the end labels, not the option columns. **Choice scales** use the option columns and ignore `correct`.
- **Yes/no columns** take yes, no, true, false, y, n, 1 or 0.
- **The file** can be UTF-8 or the Windows encoding older Excel versions write, with or without a byte-order mark, CRLF or LF line endings, and commas, semicolons or tabs between values (detected from the header row). Up to 1 MB.
- **Import** takes `mode` (`append` adds after the current questions; `replace` deletes them first) and `dryRun`. A dry run saves nothing and returns the row count, the sections it would create, errors and warnings by row and column, and a preview of each row. A real import with errors answers `400` with messages such as `Row 4, correct: "E" doesn't match an option.`; otherwise it returns the same report with `importedCount` and the updated test.
- **Sections** are matched by name. A name the test doesn't have creates a new section, with a warning.
- **`media`** names a file. If an uploaded file has that name, the question uses it, preferring files the test already uses. Otherwise the question keeps the name, the editor shows "Needs audio", and the test can't be published until the file is uploaded.
- **Export** writes the same columns, with a UTF-8 byte-order mark so Excel reads it. Middle labels on rating scales and the employer's wording on choice scales aren't in CSV; export JSON to keep everything. The template (`GET /api/assessments/csv-template`) has the header and example rows for each scoring method.

### Media

- **Uploads** go to `POST /api/media`, up to 10 MiB. The type is read from the file's first bytes ([media-type.ts](../src/media/media-type.ts)), never from its name or the browser's `Content-Type`: MP3, M4A, WAV or OGG audio, or PNG, JPEG or WebP images. The API accepts images, but the editor and the runner only handle audio so far.
- **Files are kept through the `FileStorage` interface** ([file-storage.ts](../src/storage/file-storage.ts)): `put`, `remove` and `localPath`. [`LocalDiskStorage`](../src/storage/local-disk.storage.ts) keeps them under `STORAGE_DIR` (default `./storage`, gitignored) as `media/<uuid>.<extension>`, writing to a temporary file first so a reader never sees half a file. The `media_assets` row holds the key, type, size and original name.
- **Files are served publicly by id** at `GET /api/media/:id`, inline, with `X-Content-Type-Options: nosniff` and `Cache-Control: private, max-age=86400, immutable`: a file never changes, since a replacement gets a new id. Express's `sendFile` answers Range requests.

### Frozen copies

- **Every attempt stores `snapshot`,** a JSON copy of the test made when it was sent: its settings, sections and weights, questions with their answer keys, rationale and transcripts, the role profile, and the bands. See [snapshot.ts](../src/assessments/canonical/snapshot.ts).
- **Scoring and results read only the snapshot,** so later edits to the template never change a test a candidate already has.
- **Answers point into the snapshot** by question and option id, so `attempt_answers` has no foreign keys to `questions`.

### Scoring

[scoring.ts](../src/assessments/canonical/scoring.ts) runs on the server when an attempt closes. Unanswered questions score nothing.

- **Right-answer tests** score correct ÷ number of questions. Each section also gets its own score, correct ÷ its questions. Questions without a section are grouped as "Other questions".
- **Alignment tests** (Motivation) compare each answer with the role profile's answer:
  - A rating scale item scores 1 − |role − candidate| ÷ (the scale's highest value − its lowest), and never below 0.
  - A choice scale item scores 1 for the same choice, 0.5 for the one next to it, and 0 otherwise.
  - A section scores the mean of its answered items.
  - The overall score is the mean of the sections, weighted by the sections that have a weight. Weights needn't add up to 1. If no section has a weight, it's the plain mean.
  - A gap of 2 or more between the candidate and the role is flagged for staff, with its direction: the candidate wants more (`CANDIDATE_WANTS_MORE`) or the role offers more (`ROLE_OFFERS_MORE`).
- **The band** is the one with the highest minimum at or below the score.
- **The Motivation workbook's own example** scores 0.8225, "Good fit", with flags on Q11 and Q12. [scoring.spec.ts](../src/assessments/canonical/scoring.spec.ts) checks it.
- **Stored on the attempt:** the score (0 to 1), the band's label, the correct count, the question count, the section scores, the flags and the time taken.

### Candidate links

**Sending** (`POST /api/assessment-invitations`):

- **One send is one link** to one or more tests (up to 5). It creates an `assessment_invitations` row and one attempt per test, and emails the link `<FRONTEND_URL>/take/<token>` (see [frontend-links.ts](../src/common/frontend-links.ts)).
- **The token** is 32 random bytes as base64url. Only its SHA-256 hash is stored, as with sessions ([tokens.ts](../src/common/tokens.ts)), so the response is the one chance to read the link. It's returned so staff can copy it.
- **The link works until it expires:** 14 days by default, 1 to 60. It can be opened as often as needed until then.
- **A new candidate** is sent as `{ name, email }`. If the email is already known, that candidate is used and their name updated.
- **`409`** if the candidate already has one of the tests in a link that's still open: not revoked, not expired, and the test not finished.
- **A failed email doesn't fail the send.** The link is saved, the response has `emailSent: false`, and the link's `sentAt` stays empty. Resend to try again, or share the link another way.
- **Resend** makes a new token, so the old link stops working. It keeps the expiry, or sets a new one: `expiresInDays`, or 14 days if the old expiry has passed. **Revoke** ends the link at once, even mid-test.
- **A link's status** is worked out from its tests: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `EXPIRED` or `REVOKED`.

**The candidate API** ([take.controller.ts](../src/assessments/take.controller.ts)) is public: `@Public()`, with [`InvitationTokenGuard`](../src/assessments/guards/invitation-token.guard.ts) finding the link by the token's hash. Rate limits are per IP and route:

| Method | Path | Limit | What it does |
| --- | --- | --- | --- |
| `GET` | `/api/take/:token` | 60 a minute | The tests in the link: the candidate's name, who sent it, their note, the expiry, the server's clock, and each test's name, time limit, question count, settings, status and whether it plays audio. Records when the link was last opened. |
| `POST` | `/api/take/:token/attempts/:attemptId/start` | 30 a minute | The first call starts the clock and draws the question order. Later calls return the same test with the saved answers. `409` if it's finished, `410` if the link expired before it started. |
| `PUT` | `/api/take/:token/attempts/:attemptId/answers/:questionId` | 300 a minute | `{ optionId }`, `204`. Answering again changes the answer. `400` if the option isn't one of the question's; `409` before the start, after the finish, or out of time. |
| `POST` | `/api/take/:token/attempts/:attemptId/submit` | 30 a minute | Scores and closes the test. `{ status }`: `SUBMITTED`, or `EXPIRED` if time had run out. Safe to repeat. `409` before the start. |

- **Unknown, malformed or revoked links** get `404` (`This link is invalid or has expired.`). **Expired links** get `410` (`This link has expired. Ask the person who sent it for a new one.`), unless a test is still running, so a candidate who started in time can finish.
- **The server keeps the deadline:** the start plus the time limit. Answers up to 30 seconds late still count. After that the attempt is closed as `EXPIRED` and scored with the answers saved so far, as soon as anything reads it. Two tabs starting at once share one deadline and order.
- **Candidates never see keys or staff notes.** [take-view.ts](../src/assessments/take-view.ts) builds their payloads field by field: no answer keys, option values or labels, rationale, transcripts, difficulty, references, role-profile fields or section names. [take-view.spec.ts](../src/assessments/take-view.spec.ts) checks every seed test. Responses carry `serverNow`, so the countdown can correct a wrong device clock.
- **Candidates never see a score.** Submitting returns only the status.

### Email

The candidate's email is `assessmentInvitationEmail()` in [mail.templates.ts](../src/mail/mail.templates.ts), sent by `MailService.sendAssessmentInvitation()`. It lists each test with its time and the total, and gives the link's expiry date. See [email.md](email.md).

### Data model

In [schema.prisma](../prisma/schema.prisma), created by the migration `20260915070113_init_assessments`:

| Model | Table | What it holds |
| --- | --- | --- |
| `Assessment` | `assessments` | A test template: slug, name, texts for staff and candidates, time limit, scoring method, status, question order, option shuffling, back navigation and audio replays |
| `AssessmentSection` | `assessment_sections` | A skill area, or a dimension on the motivation test, with an optional weight. Candidates never see it. |
| `Question` | `questions` | Type, instruction, passage, question text, media (or the name of a file still to upload), the role profile's prompt and answer, difficulty, rationale, transcript and shuffle settings |
| `QuestionOption` | `question_options` | Label, text, the employer's wording, scale value and whether it's correct |
| `ScoreBand` | `score_bands` | Minimum score (0 to 1), label, interpretation and recommended action |
| `MediaAsset` | `media_assets` | An uploaded file: storage key, type, size and original name |
| `Candidate` | `candidates` | Email (unique, trimmed and lowercased), name and phone |
| `AssessmentInvitation` | `assessment_invitations` | One link: candidate, token hash, expiry, sender, note, when the email went out, when it was last opened, and when it was revoked |
| `AssessmentAttempt` | `assessment_attempts` | One test in a link: the snapshot, status, start, deadline, finish, question order and the result |
| `AttemptAnswer` | `attempt_answers` | One answer per question in an attempt |

Attempt statuses are `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED` and `EXPIRED` (time ran out).

## Decisions

"Requested" means the maintainers asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Where candidates take tests | In this app. Notion Forms is used only for the candidate interest form (see [recruitment-pipeline.md](recruitment-pipeline.md)). | Notion Forms has no timer, scoring, audio questions, per-attempt question order or per-candidate links, and editing a form changes it for everyone already taking it. | Requested |
| One structure for every test | One canonical format and one editor for all tests. The workbooks are loaded as prefilled tests, and staff add more by CSV import or by hand. | | Requested |
| How candidates get their tests | A unique link by email. Candidates don't re-enter their details, and one link can hold more than one test. | | Requested |
| Previewing a test | Staff can preview any test, drafts included, as a candidate sees it, with the answer key. Nothing is saved. | | Requested |
| What candidates see at the end | A thank-you screen, never a score | | Requested |
| Motivation scoring (was open) | The formula from the Motivation workbook's calculator: a rating item scores 1 − \|role − candidate\| ÷ the scale's span, a choice item 1, 0.5 or 0; a section is the mean of its answered items; the total is the weighted mean of the sections; gaps of 2 or more are flagged | Motivation has no right answers, so it's matched against the role's profile. The workbook's own example scores the same 0.8225. | Requested |
| Where media is kept | Local disk under `STORAGE_DIR`, behind a `FileStorage` interface | | Requested |
| Question types and scoring methods | Four types (single choice, true/false, rating scale, choice scale) and two methods (correct answers, alignment). A test holds right-answer types or scales, never both. | They cover all five workbooks, and each test has one way to score it. | Build default |
| Where the role profile lives | On the template: one answer per scale question | There are no jobs yet. Per-job profiles come with Jobs (see [recruitment-pipeline.md](recruitment-pipeline.md)). | Build default |
| Versions of a test | A frozen JSON copy on each attempt, not a versions table | Scoring needs exactly the test the candidate got, and it's one column to read. Tests stay editable after publishing. | Build default |
| Candidate links (link expiry was open) | One reusable link per send. Only the token's hash is stored, as with sessions. 14 days by default, 1 to 60. Resending makes a new link and the old one stops working; revoking ends it. Expired links answer `410`. | Candidates come back for their other tests. The distinct status lets the page say the link expired instead of that it doesn't exist. | Build default |
| The deadline | The server keeps it, with 30 seconds' grace. Overdue attempts are closed and scored with the answers saved so far. | The grace covers a slow connection. A partial score is more use to staff than none. | Build default |
| Question order (was open) | A setting per test (as listed, shuffled within sections, or shuffled), drawn once per attempt and kept across refreshes. Alignment tests treat "shuffled" as shuffled within sections. | Shuffling makes answers harder to share without writing a larger pool. Each motivation dimension stays together. | Build default |
| Going back to earlier questions | A setting per test, on by default | The workbooks' rubrics say no revisits, but the requested Typeform-style flow has previous and next. Turn it off per test. | Build default |
| English B1 band minimums | 0.875 and 0.6875 | The sheet's 0.88 and 0.69 contradict its own "14–16 correct" and "11–13 correct" column: 14 ÷ 16 is 0.875 and 11 ÷ 16 is 0.6875. | Build default |
| Attention to Detail option order | The test shuffles options, except on the counting questions (Q1, Q3, Q5–Q8, Q10), which turn shuffling off. Q9 keeps "None – the records are identical" last. | The workbook's rubric asks for count options in ascending order, and a shuffled 0/1/2/3 reads as a mistake. | Build default |
| Who can do what | Admins edit tests, import and upload. Any staff member previews, sends tests and reads results. | Tests are shared templates; sending and reading results is everyday recruiting work. | Build default |
| Deleting a sent test | Refused (`409`); archive it instead | Results keep pointing at their test. | Build default |
| Audio replay limits | Enforced in the browser only | The server only serves the file and can't tell a replay from a seek or a reload. Hearing a clip again is a small advantage. | Build default |
| CSV parser | Hand-written ([csv.ts](../src/common/csv.ts), RFC 4180) instead of `csv-parse` | `csv-parse` is an exports-only package that Jest's resolver handles badly. The parser is small and tested. | Build default |
| When the email fails | The send still succeeds: the response has the link and `emailSent: false` | Staff can share the link another way instead of losing the send. | Build default |
| Serving media | Public, by id | The audio player and its Range requests work without a session. The ids are UUID v7, which can't be guessed. | Build default |
| The candidate record | Minimal: email, name and phone | Enough to send tests. The recruitment pipeline extends it later. | Build default |

## Open decisions

- **Pass marks.** What is the pass mark for each test, and does missing it move the candidate automatically or only flag them for staff?
- **Which tests go to which roles.**
- **Retakes.** Whether a candidate can take the same test again, and how the earlier attempt is kept. Today a test can't be sent again while it's open in another link.
- **Extra time** for candidates who need it. The server sets the deadline from the test's time limit, so it would need a per-send allowance.

## References

- [question-generation.md](question-generation.md)
- [recruitment-pipeline.md](recruitment-pipeline.md), [dashboard.md](dashboard.md)
- [authentication.md](authentication.md#candidate-links) (candidate access), [email.md](email.md), [database.md](database.md#seed-data), [configuration.md](configuration.md) (`STORAGE_DIR`), [testing.md](testing.md)
- Frontend: [assessments.md](../../frontend/docs/assessments.md)
